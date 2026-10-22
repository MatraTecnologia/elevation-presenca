# Elevation Presença

Credenciamento com entrada, saída, reentrada e acompanhamento ao vivo. Next.js, Prisma e PostgreSQL; os dados ficam no schema `presenca`.

## Desenvolvimento

Configure `.env` a partir de `.env.example` e execute:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

O seed cria o primeiro acesso com `ADMIN_EMAIL` e `ADMIN_PASSWORD`, preserva a senha de um acesso existente e não adiciona participantes fictícias.

## Docker e EasyPanel

O Dockerfile segue o padrão do dashboard da Gestora: Node 24 Alpine, instalação e build em etapas, Next.js standalone e execução com usuário sem privilégios de root. Este repositório usa npm e seu `package-lock.json`.

No EasyPanel, configure:

| Campo | Valor |
| --- | --- |
| Método de build | Dockerfile |
| Contexto / Build Path | Raiz do repositório (`/`) |
| Dockerfile | `Dockerfile` |
| Target | `runner` (ou deixe vazio) |
| Porta interna | `3000` |

Configure estas variáveis **no ambiente de execução** do serviço:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/elevation?schema=presenca
BETTER_AUTH_SECRET=segredo-aleatorio-com-pelo-menos-32-caracteres
BETTER_AUTH_URL=https://dominio-do-credenciamento
```

`BETTER_AUTH_URL` deve ser a URL pública exata pela qual a equipe acessará o sistema, usando HTTPS em produção. Preserve o `BETTER_AUTH_SECRET` entre deploys. Use a conexão real do banco já configurado, incluindo seus parâmetros de conexão.

O build usa valores fictícios apenas para gerar o Prisma Client e compilar. Nenhuma credencial de produção é necessária durante o build. `.env`, listas privadas, capturas, testes e instalações locais ficam fora do contexto Docker.

Para executar a aplicação:

```sh
docker build -t elevation-presenca .
docker run --rm -p 3000:3000 --env-file .env.production elevation-presenca
```

O banco externo e os dados existentes são mantidos. A aplicação não cria outro PostgreSQL dentro do container.

## Migrations em produção

O servidor standalone não inclui ferramentas de desenvolvimento. Para aplicar novas migrations, use o target `migrator` como um job separado antes de atualizar a aplicação:

```sh
docker build --target migrator -t elevation-presenca-migrator .
docker run --rm --env-file .env.production elevation-presenca-migrator
```

No EasyPanel, o job de migration usa o mesmo repositório e Dockerfile, com target `migrator` e `DATABASE_URL` no ambiente; não precisa de domínio ou porta. Execute-o apenas quando houver migrations pendentes. Ele roda `prisma migrate deploy`, sem `db push`, reset ou seed automático.

As migrations e o primeiro acesso deste ambiente já foram preparados. Para um banco novo, execute também o seed a partir do projeto, com as credenciais administrativas no ambiente.

## Verificação

```sh
npm run typecheck
npm test
npm run build
```
