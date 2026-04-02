# Mastra Starter

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![NestJS 11](https://img.shields.io/badge/NestJS-11-ea2845.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)](https://www.typescriptlang.org/)
[![Mastra](https://img.shields.io/badge/Mastra-1.5-8b5cf6.svg)](https://mastra.ai/)
[![CopilotKit](https://img.shields.io/badge/CopilotKit-1.51-22c55e.svg)](https://www.copilotkit.ai/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/novostudiotech/mastra-starter/pulls)

**The modern AI agent starter -- Mastra + NestJS + CopilotKit. Multi-agent workflows with delegated tools, production-ready from day one.**

---

## Key Features

- **Delegated Tools Pattern** -- define tool schemas on the backend, execute them on the frontend via CopilotKit. Agents can interact with browser APIs, localStorage, and UI state.
- **Multi-Agent Workflows** -- chain multiple Mastra agents with typed step-based workflows using Zod schemas for input/output validation.
- **Better Auth Integration** -- session-based authentication with sign-up, sign-in, and protected routes out of the box.
- **CopilotKit Chat UI** -- ready-to-use React chat interface connected to backend agents via the AG-UI protocol.
- **TypeORM + PostgreSQL** -- database setup with migrations, shared between app data and Mastra agent memory.
- **Docker Compose** -- one command to spin up PostgreSQL and Redis for local development.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Web (React 19 + Vite 6)                   │
│                                                             │
│   CopilotKit Provider                                       │
│     ├── useCopilotAction(...)   ← delegated tool handlers   │
│     └── CopilotChat UI         ← user interaction           │
│               │                                             │
└───────────────┼─────────────────────────────────────────────┘
                │  AG-UI protocol
                ▼
┌─────────────────────────────────────────────────────────────┐
│                   API (NestJS 11 + Mastra)                  │
│                                                             │
│   /api/copilotkit  →  CopilotRuntime                        │
│                         └── Mastra Agents                   │
│                               ├── delegated tools → frontend│
│                               └── server tools   → backend  │
│                                                             │
│   /auth/*          →  Better Auth (sessions)                │
│   /api/chat/*      →  Thread management (TypeORM)           │
│                                                             │
│   PostgreSQL 16  ←  TypeORM + @mastra/pg (shared DB)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Why This Starter?

Building an AI agent app from scratch means wiring together an agent framework, a backend, a chat UI, authentication, a database, and a protocol to connect them all. That is weeks of plumbing before you write your first agent.

This starter gives you that wiring done right:

- **Mastra agents talk to CopilotKit** via the AG-UI protocol -- no custom WebSocket code.
- **Delegated tools** let agents call browser APIs without exposing secrets or coupling frontend logic to the backend.
- **Production infrastructure** (structured logging, health checks, Prometheus metrics, Sentry, Swagger) is already configured.
- **Monorepo with pnpm workspaces** keeps API and Web in one repo with shared tooling.

You clone it, add your agents and tools, and ship.

---

## Quick Start

```bash
git clone git@github.com:novostudiotech/mastra-starter.git my-app
cd my-app
docker compose up -d                    # PostgreSQL + Redis
cp apps/api/.env.example apps/api/.env  # configure your keys
pnpm install
pnpm dev:all                            # API on :3000, Web on :5173
```

The application will be available at:

- **Web UI**: `http://localhost:5173`
- **API**: `http://localhost:3000`
- **Swagger docs**: `http://localhost:3000/docs`
- **Mastra Studio**: `pnpm studio` at `http://localhost:4111`

---

## Project Structure

```
mastra-starter/
├── apps/
│   ├── api/                        # NestJS backend (@mastra-starter/api)
│   │   └── src/
│   │       ├── app/                # Config, database, health, metrics
│   │       ├── auth/               # Better Auth integration
│   │       ├── chat/               # Chat thread management
│   │       ├── mastra/             # Mastra configuration
│   │       │   ├── agents/         # Agent definitions
│   │       │   ├── tools/          # Tool definitions (Zod schemas)
│   │       │   ├── workflows/      # Step-based workflows
│   │       │   └── index.ts        # Mastra instance factory
│   │       ├── mastra-module/      # NestJS module: Mastra + CopilotKit runtime
│   │       ├── notifications/      # Email (Resend + React Email)
│   │       └── main.ts
│   └── web/                        # React frontend (@mastra-starter/web)
│       └── src/
│           ├── App.tsx             # CopilotKit provider + delegated tools
│           └── main.tsx
├── packages/                       # Shared packages (future)
├── docker-compose.yml              # PostgreSQL 16 + Redis 7
├── pnpm-workspace.yaml
└── package.json
```

---

## How to Extend

The starter is designed to grow with your application. See [`CLAUDE.md`](CLAUDE.md) for detailed instructions on:

- **Adding agents** -- create `agents/{name}.agent.ts`, register in `mastra/index.ts`. Automatically available via CopilotKit.
- **Adding tools** -- define Zod schemas on the backend, optionally handle on the frontend with `useCopilotAction`.
- **Adding workflows** -- chain typed steps with `createWorkflow` and `createStep`.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| AI Framework | Mastra | 1.5 |
| AI Model | Anthropic Claude (via `@ai-sdk/anthropic`) | 3.0 |
| Agent-UI Bridge | AG-UI (`@ag-ui/core` + `@ag-ui/mastra`) | 0.0.45 / 1.0 |
| Chat UI | CopilotKit | 1.51 |
| Backend | NestJS | 11 |
| Frontend | React + Vite | 19 / 6 |
| Database | PostgreSQL + TypeORM | 16 / 0.3 |
| Auth | Better Auth | 1.4 |
| Validation | Zod | 4.3 |
| Email | Resend + React Email | -- |
| Linting | Biome | 2.3 |
| Testing | Playwright (E2E) + Jest (unit) | -- |
| Language | TypeScript (strict) | 5.9 |
| Package Manager | pnpm (workspaces) | 10+ |

---

## License

[MIT licensed](LICENSE).

---

Built by [Novo Studio](https://novostudio.tech) -- AI-first development studio.
