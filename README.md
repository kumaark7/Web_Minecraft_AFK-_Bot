# Larry Control

Larry Control is a web control panel foundation for managing Minecraft AFK bots on cracked/offline-mode Minecraft servers.

This repository currently contains the Milestone 1 foundation and Milestone 2 database foundation work:

- React, Vite, and TypeScript frontend
- Node.js, Express, and TypeScript backend
- PostgreSQL database configuration
- Prisma schema and database package
- Shared TypeScript types package

## Project Structure

```text
apps/
  backend/      Express API
  web/          React frontend
packages/
  database/     Prisma client and schema
  shared/       Shared TypeScript types
```

## Requirements

- Node.js
- pnpm via Corepack
- Docker with Docker Compose

## Setup

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d
pnpm --dir packages/database db:generate
pnpm --dir packages/database db:migrate
pnpm dev
```

The development services use:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:3001/api/health`
- PostgreSQL: `localhost:5432`

## Scripts

```bash
pnpm build
pnpm lint
pnpm dev
```

## Scope

Larry Control is intended for cracked/offline-mode Minecraft servers only. It does not use Microsoft, Mojang, or official Minecraft account authentication.
