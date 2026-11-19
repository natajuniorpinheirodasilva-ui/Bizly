package database

import (
	"fmt"
	"os"
	"path/filepath"

	embeddedpostgres "github.com/fergusstrange/embedded-postgres"

	"bizly-api/internal/config"
)

// StartEmbedded liga um Postgres de verdade, rodando como processo do seu usuário
// (sem instalar nada no Windows e sem admin). Só para desenvolvimento.
//
// Na primeira vez ele baixa os binários do Postgres (~30 MB) para .data/cache.
// Os dados ficam em .data/pg e sobrevivem entre execuções.
//
// Devolve uma função "stop": quem chama precisa executá-la ao encerrar
// (desliga o Postgres e fecha o arquivo de log).
func StartEmbedded(cfg config.Config) (stop func() error, err error) {
	base, err := filepath.Abs(cfg.EmbeddedPGDir)
	if err != nil {
		return nil, fmt.Errorf("caminho do banco embutido: %w", err)
	}
	if err := os.MkdirAll(base, 0o700); err != nil { // 0o700 = só o seu usuário acessa
		return nil, fmt.Errorf("criando %s: %w", base, err)
	}

	logFile, err := os.OpenFile(filepath.Join(base, "postgres.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	if err != nil {
		return nil, fmt.Errorf("abrindo log do postgres: %w", err)
	}

	cacheDir := cfg.EmbeddedPGCache
	if cacheDir == "" {
		cacheDir = filepath.Join(base, "cache")
	}

	pg := embeddedpostgres.NewDatabase(
		embeddedpostgres.DefaultConfig().
			Version(embeddedpostgres.V17).
			Port(cfg.EmbeddedPGPort).
			Database(cfg.DBName).
			Username(cfg.OwnerUser). // o dono do banco (superusuário só deste Postgres local)
			Password(cfg.OwnerPassword).
			// IMPORTANTE: pasta dedicada. A biblioteca recria a pasta de dados se ela estiver inválida.
			DataPath(filepath.Join(base, "pg")).
			RuntimePath(filepath.Join(base, "runtime")).
			CachePath(cacheDir).
			// só aceita conexões deste PC, nunca da rede
			StartParameters(map[string]string{"listen_addresses": "localhost"}).
			Logger(logFile),
	)

	if err := pg.Start(); err != nil {
		logFile.Close()
		return nil, fmt.Errorf("iniciando postgres embutido (porta %d em uso? veja %s): %w",
			cfg.EmbeddedPGPort, filepath.Join(base, "postgres.log"), err)
	}

	// Uma função que "lembra" de pg e logFile (closure).
	stop = func() error {
		stopErr := pg.Stop()
		logFile.Close()
		return stopErr
	}
	return stop, nil
}
