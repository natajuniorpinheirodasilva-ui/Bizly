# bizly-api

Backend do Bizly em Go, com PostgreSQL 17.

## Rodar (desenvolvimento)

```bash
cp .env.example .env      # na primeira vez; gere as senhas com: openssl rand -hex 24
go run ./cmd/api
```

- Na primeira execução, o Postgres (~30 MB) é baixado para `.data/cache`.
- O Postgres liga junto com a API e desliga com **Ctrl+C**. Sem admin, sem serviço do Windows.
- Os dados ficam em `.data/pg` (ignorada pelo git). Para zerar o banco: pare a API e apague `.data/pg`.
- Teste: `curl http://127.0.0.1:8080/health`

### Se a API foi fechada à força (terminal fechado, travou)

O Postgres pode ter ficado ligado e a próxima execução reclama da porta 5433. Desligue com:

```bash
./.data/runtime/bin/pg_ctl.exe stop -D .data/pg -m fast
```

## Testes

```bash
go test ./...
```

`internal/database/database_test.go` sobe um Postgres temporário e prova que uma empresa
não consegue ler nem gravar dados de outra (Row Level Security).

## Estrutura

```
cmd/api/              ponto de entrada (main.go)
internal/config/      leitura do .env / variáveis de ambiente
internal/database/    Postgres embutido, migrations, pool, transação por empresa (WithTenant)
internal/httpapi/     rotas HTTP
db/migrations/        arquivos .sql (embutidos no executável)
```

## Segurança do banco

- Dois usuários: o **dono** só roda migrations; a API usa o **bizly_app**, sem superpoderes.
- Toda rota com dados de empresa usa `database.WithTenant(...)`: o Postgres só mostra as linhas daquela empresa.
- O Postgres embutido só aceita conexões de `localhost`.
