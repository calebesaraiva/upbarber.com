# UpBarber Backend

API REST SaaS para barbearias com Node.js 20, TypeScript, Express, Prisma, PostgreSQL, Redis, JWT, Zod, BullMQ, Swagger e Docker.

## Rodar em desenvolvimento

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npx prisma migrate dev --schema=src/prisma/schema.prisma
npx prisma db seed --schema=src/prisma/schema.prisma
npm run dev
```

API: `http://localhost:3333/api/v1`

Docs: `http://localhost:3333/api/docs`

Health: `http://localhost:3333/health`

Login demo:

```json
{
  "email": "admin@upbarber.com",
  "password": "123456"
}
```

## Docker completo

```bash
cp .env.example .env
docker compose up --build
```

## Comandos úteis

```bash
npm run dev
npm run build
npm test
npm run test:coverage
npm run migrate:dev
npm run migrate:deploy
npm run seed
```

## Segurança multi-tenant

Todas as rotas autenticadas usam `barbershopId` extraído do JWT. Os CRUDs principais aplicam filtro por tenant em consultas e criações.

## Integração frontend

Configure o frontend para consumir:

```text
http://localhost:3333/api/v1
```

O CORS já aceita `localhost:5173`, `localhost:5174` e o IP local configurado em `.env.example`.
