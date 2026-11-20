# MyClinic API

API do **MyClinic**, sistema de gestão para Microempreendedores Individuais (MEIs) da área da saúde. Centraliza o cadastro de pacientes, a agenda de atendimentos, o controle de estoque e o fluxo de caixa do profissional.

Projeto acadêmico construído com NestJS seguindo os padrões da [documentação oficial](https://docs.nestjs.com).

## Stack

- [NestJS 12](https://docs.nestjs.com) (TypeScript, ESM)
- [PostgreSQL 18](https://www.postgresql.org) via Docker Compose
- [Prisma 7](https://www.prisma.io) com `@prisma/adapter-pg`
- [`@nestjs/authentication`](https://docs.nestjs.com/security/authentication): sessão por cookie e redefinição de senha
- [`@nestjs/mail`](https://docs.nestjs.com/application/mail), [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting), [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction)
- `class-validator` para validação, Vitest para testes, oxlint e Prettier

## Pré-requisitos

- Node.js 22+
- Docker com Docker Compose

## Como rodar

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env

# 3. Banco de dados
docker compose up -d

# 4. Migrations e Prisma Client
npx prisma migrate deploy
npx prisma generate

# 5. API em modo desenvolvimento
npm run start:dev
```

A API sobe em `http://localhost:3000` e a documentação interativa (Swagger) em **`http://localhost:3000/docs`** (JSON em `/docs-json`).

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciais do container do PostgreSQL (`compose.yaml`) |
| `DATABASE_URL` | URL de conexão usada pelo Prisma |
| `APP_URL` | URL pública do app web; os links de e-mail apontam para páginas dele (ex.: `/reset-password`) |
| `MAIL_FROM` | Remetente dos e-mails |
| `SMTP_URL` | Opcional. Sem ela, os e-mails são apenas impressos no log da aplicação |
| `PORT` | Opcional. Porta HTTP (padrão `3000`) |

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run start:dev` | Inicia em modo watch |
| `npm run build` / `npm run start:prod` | Compila e executa a versão de produção |
| `npm test` | Testes unitários |
| `npm run test:e2e` | Testes end-to-end (exigem o PostgreSQL do Docker) |
| `npm run lint` / `npm run format` | Lint (oxlint) e formatação (Prettier) |
| `npx prisma migrate dev --name <nome>` | Cria e aplica uma migration após alterar `prisma/schema.prisma` |
| `npx prisma studio` | Interface para inspecionar o banco |

## Módulos e rotas

Todas as rotas exigem autenticação, exceto as marcadas como públicas. Os dados são sempre da clínica do usuário autenticado: registros de outra clínica respondem `404`.

| Módulo | Rotas |
| --- | --- |
| Autenticação | `POST /auth/sign-up`, `POST /auth/sign-in`, `POST /auth/sign-out`, `POST /auth/password/forgot`, `POST /auth/password/reset` (públicas) |
| Usuário | `GET /me` |
| Clínica | `POST /clinic`, `GET /clinic`, `PATCH /clinic` |
| Pacientes | `POST /patients`, `GET /patients?search=`, `GET/PATCH/DELETE /patients/:id` |
| Serviços | `POST /services`, `GET /services?active=`, `GET/PATCH/DELETE /services/:id` |
| Agenda | `POST /appointments`, `GET /appointments?from=&to=&status=&patientId=`, `GET/PATCH /appointments/:id`, `POST /appointments/:id/{confirm,cancel,no-show,complete}` |
| Estoque | `POST /supplies`, `GET /supplies?active=&lowStock=`, `GET/PATCH/DELETE /supplies/:id`, `GET/POST /supplies/:id/movements` |
| Fluxo de caixa | `POST /transactions`, `GET /transactions?from=&to=&type=&status=&category=`, `GET /transactions/summary?from=&to=`, `GET/PATCH /transactions/:id`, `POST /transactions/:id/{pay,cancel}` |

Os detalhes de cada corpo e parâmetro estão no Swagger em `/docs`.

## Fluxo de uso

1. `POST /auth/sign-up` cria o usuário e já devolve o cookie de sessão `__Host-sid`.
2. `POST /clinic` cadastra a clínica. Até lá, as rotas de negócio respondem `403` com `errorCode: "CLINIC_REQUIRED"`.
3. Cadastre pacientes e serviços, e então agende atendimentos.
4. Ao concluir um atendimento (`POST /appointments/:id/complete`), a receita é lançada no caixa automaticamente.

## Convenções da API

- **Autenticação:** cookie de sessão `__Host-sid` (`HttpOnly`, `Secure`, `SameSite=Lax`). Navegadores aceitam cookies `Secure` em `http://localhost`.
- **Listagens:** paginadas com `?page=` (padrão 1) e `?pageSize=` (padrão 20, máximo 100). A resposta é `{ data: [...], meta: { page, pageSize, total, totalPages } }`.
- **Valores monetários:** inteiros em centavos (`priceCents`, `amountCents`, `unitCostCents`). R$ 150,00 = `15000`.
- **Data e hora:** ISO 8601 com fuso horário (`2026-12-01T10:00:00-03:00`). **Datas sem hora:** `AAAA-MM-DD`.
- **Resumo financeiro (`/transactions/summary`):** receitas e despesas realizadas contam pela data de pagamento; valores pendentes, pela data de vencimento. Os dias são considerados no fuso `America/Sao_Paulo`.
- **Quantidades de estoque:** decimais com até 3 casas, retornadas no JSON como texto (ex.: `"7.5"`).
- **Documentos e contato:** CPF, CNPJ, CEP e telefone apenas com dígitos; UF com duas letras maiúsculas.
- **Erros de regra de negócio:** `409` com `errorCode`, como `SCHEDULE_CONFLICT`, `INVALID_STATUS` e `INSUFFICIENT_STOCK`.
- **Rate limiting:** login limitado a 5 tentativas por conta a cada 15 minutos.

## Testes

Os testes e2e sobem a aplicação real contra um banco separado, `myclinic_test`, criado e migrado automaticamente no mesmo container:

```bash
docker compose up -d
npm run test:e2e
```

Eles cobrem os fluxos de cada módulo, o isolamento entre clínicas, a concorrência (agendamentos simultâneos no mesmo horário e saídas simultâneas de estoque) e a suíte de contrato do `@nestjs/authentication` para o store de sessões.

## Estrutura

```
prisma/              schema e migrations
src/
  auth/              cadastro, login, sessões, redefinição de senha
  users/             usuário autenticado (/me)
  clinics/           clínica do usuário e ClinicContext
  patients/          pacientes
  services/          serviços oferecidos
  appointments/      agenda
  supplies/          estoque e movimentações
  transactions/      fluxo de caixa
  prisma/            PrismaService e PrismaModule
  mail/templates/    templates de e-mail
  common/            utilitários compartilhados
test/                testes e2e
```

## Convenções de desenvolvimento

- Uma branch por implementação (`feat/`, `fix/`, `chore/`, `docs/`), integrada à `main` ao final.
- Commits em [Conventional Commits](https://www.conventionalcommits.org/pt-br), em português.
