// Package migrations embute os arquivos .sql dentro do executável.
//
// Com isso o binário final carrega as migrations junto: não precisa copiar a
// pasta db/ para o servidor, e a versão do código sempre bate com a do banco.
package migrations

import "embed"

// A linha abaixo é uma "diretiva" do compilador Go (não é comentário comum):
// ela coloca todos os *.sql desta pasta dentro da variável FS na hora de compilar.
//
//go:embed *.sql
var FS embed.FS
