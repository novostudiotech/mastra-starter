# Figma Design Agent — Архитектура облачной платформы

## Суть проекта

Облачный SaaS с агентским чатом (Cursor-like agent mode) прямо внутри Figma-плагина. Пользователь открывает плагин, видит чат, пишет "создай карточку продукта" — и AI-агент планирует, выполняет, проверяет результат, фиксит ошибки, добивается выполнения задачи. Два агента: **Designer** делает, **Reviewer** проверяет и возвращает на доработку.

---

## Стек технологий

| Компонент | Технология | Зачем |
|---|---|---|
| **Platform Foundation** | **nestjs-starter** (`git@github.com:novostudiotech/nestjs-starter.git`) | Auth, DB, email, S3, admin, monitoring |
| **Agent Framework** | **Mastra** + `@mastra/nestjs` | Агенты, workflows, memory, tool calling — с первого дня |
| **Plugin UI** | React + **CopilotKit** (`@copilotkit/react-ui`) | Чат из коробки, `useCopilotAction`, `useCopilotReadable` |
| **Plugin ↔ Agent** | **AG-UI Protocol** (HTTPS) | Стандартный стриминг между CopilotKit и Mastra |
| **Plugin → Figma** | postMessage bridge (`apps/plugin/code.js`) | `sendToFigma()` — concurrent-safe, с таймаутами |
| **Auth** | **Better Auth** (из nestjs-starter) + **Figma OAuth** | Нативный Figma provider из коробки |
| **Database** | **Neon** PostgreSQL + **TypeORM** (из nestjs-starter) + **@mastra/pg** (Mastra Memory) | Users, subscriptions, usage (TypeORM) + threads, messages (Mastra) |
| **LLM** | Claude Sonnet через Mastra | Multi-step tool calling, planning |
| **Billing** | **Stripe** (новый модуль) | Подписки, usage-based billing |
| **Figma Tools Source** | `cursor-talk-to-figma-mcp/src/server.ts` + `cursor-talk-to-figma-mcp/src/code.js` | 40 MCP tool definitions → конвертируем в Mastra tools + CopilotKit actions |
| **External integrations (Phase 3)** | **Tadata** managed MCP hub | Slack, GitHub, Linear, Notion |
| **Notifications** | **Resend** + React Email (из nestjs-starter) | Billing emails, onboarding |
| **Media** | **S3** presigned uploads (из nestjs-starter) | Export images |
| **Monitoring** | **Prometheus** + **Sentry** + **Pino** (из nestjs-starter) | Метрики, errors, logging |
| **Monorepo** | **pnpm workspaces** | 4 пакета: api, plugin, web, shared |
| **Deploy** | Docker (из nestjs-starter) + Railway / Fly.io | CI/CD ready |

---

## Monorepo структура

```
figma-design-agent/                    # корень монорепы
├── pnpm-workspace.yaml
├── package.json                       # root: scripts, devDependencies
├── turbo.json                         # (опционально) Turborepo для параллельных builds
├── docker-compose.yml                 # PostgreSQL
├── .env.example
│
├── apps/
│   ├── api/                           # NestJS backend (из nestjs-starter)
│   │   ├── src/
│   │   │   ├── app/                   # ✅ ЕСТЬ: config, CORS, DB, health, metrics, swagger
│   │   │   ├── auth/                  # ✅ ЕСТЬ: Better Auth + JWT + Bearer + OTP
│   │   │   │   └── auth.config.ts     #    + socialProviders: { figma: {...} }
│   │   │   ├── notifications/         # ✅ ЕСТЬ: Resend + React Email
│   │   │   ├── media/                 # ✅ ЕСТЬ: S3 presigned upload
│   │   │   ├── admin/                 # ✅ ЕСТЬ: Auto CRUD
│   │   │   │
│   │   │   ├── mastra/                # 🆕 Mastra agent logic
│   │   │   │   ├── index.ts           # Mastra instance, memory config, registerCopilotKit
│   │   │   │   ├── agents/
│   │   │   │   │   ├── designer.agent.ts
│   │   │   │   │   └── reviewer.agent.ts
│   │   │   │   ├── workflows/
│   │   │   │   │   └── design.workflow.ts
│   │   │   │   └── tools/
│   │   │   │       ├── figma-tools.ts       # 40 Figma tools (Mastra format)
│   │   │   │       └── review-tools.ts      # read-only tools for reviewer
│   │   │   │
│   │   │   ├── chat/                  # 🆕 REST API для dashboard (thin wrapper over Mastra Memory)
│   │   │   │   ├── chat.module.ts
│   │   │   │   └── chat.controller.ts
│   │   │   │
│   │   │   ├── billing/               # 🆕 Stripe
│   │   │   │   ├── billing.module.ts
│   │   │   │   ├── billing.controller.ts
│   │   │   │   ├── billing.service.ts
│   │   │   │   └── entities/subscription.entity.ts
│   │   │   │
│   │   │   ├── usage/                 # 🆕 Token tracking
│   │   │   │   ├── usage.module.ts
│   │   │   │   ├── usage.service.ts
│   │   │   │   └── entities/usage-log.entity.ts
│   │   │   │
│   │   │   ├── main.ts                # bootstrap + CORS
│   │   │   └── app.module.ts          # + MastraModule, ChatModule, BillingModule, UsageModule
│   │   │
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── plugin/                        # Figma Plugin (React + CopilotKit)
│   │   ├── manifest.json              # networkAccess → api.figma-agent.com
│   │   ├── code.js                    # Figma sandbox (+ callId + selection serialization)
│   │   ├── src/
│   │   │   ├── App.tsx                # CopilotKit + auth + tools + chat
│   │   │   ├── components/
│   │   │   │   └── AuthScreen.tsx     # Login (Figma OAuth)
│   │   │   ├── hooks/
│   │   │   │   └── useFigmaSelection.ts
│   │   │   ├── bridge/
│   │   │   │   └── sendToFigma.ts     # concurrent-safe postMessage bridge
│   │   │   └── tools/
│   │   │       └── definitions.ts     # 40 tool definitions (CopilotKit format)
│   │   ├── esbuild.config.ts          # React → ui.html
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                           # Dashboard SPA (Phase 2)
│       ├── src/
│       │   ├── pages/                 # Chat history, billing, settings
│       │   └── ...
│       ├── tsconfig.json
│       └── package.json
│
└── packages/
    └── shared/                        # Общие типы и контракты
        ├── src/
        │   ├── types/
        │   │   ├── tools.ts           # ToolDefinition interface (shared между api и plugin)
        │   │   ├── figma.ts           # SerializedNode, SelectionContext
        │   │   └── api.ts             # API request/response types
        │   └── index.ts
        ├── tsconfig.json
        └── package.json
```

### pnpm-workspace.yaml

```yaml
# figma-design-agent/pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Root package.json

```json
{
  "name": "figma-design-agent",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @figma-agent/api start:dev",
    "dev:plugin": "pnpm --filter @figma-agent/plugin dev",
    "dev:web": "pnpm --filter @figma-agent/web dev",
    "dev:all": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "build:plugin": "pnpm --filter @figma-agent/plugin build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

### Зависимости между пакетами

```json
// apps/api/package.json
{
  "name": "@figma-agent/api",
  "dependencies": {
    "@figma-agent/shared": "workspace:*",
    "@mastra/core": "...",
    "@mastra/nestjs": "...",
    "@mastra/memory": "..."
  }
}

// apps/plugin/package.json
{
  "name": "@figma-agent/plugin",
  "dependencies": {
    "@figma-agent/shared": "workspace:*",
    "@copilotkit/react-core": "...",
    "@copilotkit/react-ui": "..."
  }
}

// apps/web/package.json
{
  "name": "@figma-agent/web",
  "dependencies": {
    "@figma-agent/shared": "workspace:*"
  }
}

// packages/shared/package.json
{
  "name": "@figma-agent/shared",
  "main": "./src/index.ts"
}
```

### Маппинг исходных репозиториев → пакеты монорепы

Проект собирается из 4 оригинальных репозиториев. Ниже — что и откуда берётся.

#### `nestjs-starter/` → `apps/api/`

Целиком копируется как основа backend. Это SaaS-фундамент с готовыми модулями:

| Что берём | Путь в nestjs-starter | Путь в монорепе | Примечание |
|---|---|---|---|
| App bootstrap, config, CORS, DB, health, metrics, swagger | `src/app/` | `apps/api/src/app/` | Без изменений |
| Better Auth + JWT + Bearer + OTP | `src/auth/` | `apps/api/src/auth/` | + добавить `socialProviders: { figma }` |
| Resend + React Email | `src/notifications/` | `apps/api/src/notifications/` | Без изменений |
| S3 presigned upload | `src/media/` | `apps/api/src/media/` | Без изменений |
| Auto CRUD admin | `src/admin/` | `apps/api/src/admin/` | Без изменений |
| Products (пример CRUD) | `src/products/` | — | Удалить, заменить на `chat/`, `billing/`, `usage/` |
| main.ts, app.module.ts, data-source.ts | `src/` | `apps/api/src/` | Без изменений |
| docker-compose.yml (PostgreSQL) | корень | корень монорепы | Вынести в корень |
| .env.example | корень | `apps/api/.env.example` | Оставить в api |

**Новые модули** (пишем с нуля поверх nestjs-starter):

| Модуль | Путь | Описание |
|---|---|---|
| `mastra/` | `apps/api/src/mastra/` | Mastra instance, agents, workflows, tools |
| `chat/` | `apps/api/src/chat/` | REST API для dashboard (история, проекты) |
| `billing/` | `apps/api/src/billing/` | Stripe подписки |
| `usage/` | `apps/api/src/usage/` | Token tracking / rate limiting |

```bash
# Команда
git clone git@github.com:novostudiotech/nestjs-starter.git apps/api
rm -rf apps/api/.git
# удалить src/products/, добавить src/mastra/, src/chat/, src/billing/, src/usage/
```

---

#### `cursor-talk-to-figma-mcp/` → `apps/api/` + `apps/plugin/`

Основной источник 40 Figma-инструментов. Код разделяется между backend и plugin:

| Что берём | Путь в cursor-talk-to-figma-mcp | Куда | Примечание |
|---|---|---|---|
| 40 tool definitions (MCP формат) | `src/talk_to_figma_mcp/server.ts` | `apps/api/src/mastra/tools/figma-tools.ts` | Конвертировать MCP tools → `createTool()` Mastra формат |
| Figma sandbox code (исполнение команд) | `src/cursor_mcp_plugin/code.js` | `apps/plugin/code.js` | Адаптировать: убрать WebSocket, добавить `postMessage` bridge |
| Figma manifest | `src/cursor_mcp_plugin/manifest.json` | `apps/plugin/manifest.json` | Изменить name, id, ui |
| Plugin UI (базовый) | `src/cursor_mcp_plugin/ui.html` | — | Не берём, заменяем на React + CopilotKit |
| setcharacters.js | `src/cursor_mcp_plugin/setcharacters.js` | `apps/plugin/setcharacters.js` | Если нужен — взять как есть |

**Ключевая трансформация `server.ts` → `figma-tools.ts`:**

```typescript
// ИЗ: cursor-talk-to-figma-mcp/src/talk_to_figma_mcp/server.ts (MCP формат)
server.tool("create_rectangle", { x: number, y: number, ... }, async (params) => { ... })

// В: apps/api/src/mastra/tools/figma-tools.ts (Mastra формат)
export const createRectangle = createTool({
  id: "create_rectangle",
  description: "Create a rectangle on the Figma canvas.",
  inputSchema: z.object({ x: z.number(), y: z.number(), ... }),
  execute: async ({ context }) => { return { status: "delegated_to_frontend" }; },
});
```

**Ключевая трансформация `code.js`:**

```javascript
// ИЗ: WebSocket-based (cursor-talk-to-figma-mcp)
const ws = new WebSocket(`ws://localhost:${PORT}/figma`);
ws.onmessage = (event) => { /* handle command */ };

// В: postMessage-based (apps/plugin/code.js)
figma.ui.onmessage = (msg) => {
  if (msg.type === 'figma-command') { /* same command handlers */ }
};
```

---

#### `TalkToFigmaDesktop/` → `apps/plugin/` (частично, как референс)

Desktop Electron приложение. Не копируется целиком, но используется как референс для React-компонентов и хуков:

| Что берём | Путь в TalkToFigmaDesktop | Куда | Примечание |
|---|---|---|---|
| Типы (SelectionContext, SerializedNode) | `src/shared/types/` | `packages/shared/src/types/figma.ts` | Конвертировать и расширить |
| Константы | `src/shared/constants.ts` | `packages/shared/src/constants.ts` | Без изменений |
| UI-компоненты (shadcn/ui) | `src/components/ui/` | `apps/plugin/src/components/ui/` | Как референс стилей, не копировать целиком |
| MCP client config UI | `src/components/mcp/` | — | Не берём (у нас cloud, не desktop MCP) |
| Selection hooks | `src/hooks/` | `apps/plugin/src/hooks/` | Переписать под CopilotKit `useCopilotReadable` |
| App.tsx (Electron) | `src/App.tsx` | — | Не берём, пишем свой на CopilotKit |
| Electron main process | `src/main.ts`, `src/preload.ts` | — | Не берём (у нас Figma iframe, не Electron) |
| Socket.ts (WebSocket MCP transport) | `src/socket.ts` | — | Не берём (у нас AG-UI SSE, не WebSocket) |

```
Итого: TalkToFigmaDesktop — в основном референс.
Реально переносятся только типы → packages/shared и hooks → apps/plugin (с рефакторингом).
```

---

#### `platform/` → `apps/web/` + `apps/api/` (Phase 2, как референс)

Существующая платформа с графами агентов. Используется как референс архитектуры и для заимствования инфраструктурных паттернов:

| Что берём | Путь в platform | Куда | Примечание |
|---|---|---|---|
| Docker Compose (monitoring) | `docker-compose.monitoring.yml` | корень монорепы | Адаптировать для нашего стека |
| Monitoring configs | `monitoring/` | `monitoring/` | Grafana + Prometheus конфиги |
| Ops / deployment | `ops/` | `ops/` | CI/CD, Kubernetes конфиги |
| Vault (secrets) | `vault/` | `vault/` | Vault конфиги |
| vitest.config.ts | корень | корень монорепы | Базовый конфиг для тестов |
| tsconfig.base.json | корень | корень монорепы | Общий TS конфиг |
| **platform-ui** (React SPA) | `packages/platform-ui/` | `apps/web/` (Phase 2) | Референс: layout, pages, features, hooks |
| **platform-server** (agents) | `packages/platform-server/src/agents/` | — | Референс: persistence, threads, metrics |
| **platform-server** (gateway) | `packages/platform-server/src/gateway/` | — | Референс: WebSocket gateway |
| **shared** types | `packages/shared/` | `packages/shared/` | Референс: как организовать shared types |
| **llm** package | `packages/llm/` | — | Не берём (у нас Mastra + AI SDK) |
| **json-schema-to-zod** | `packages/json-schema-to-zod/` | — | Возможно пригодится для tool schema конвертации |
| **docker-runner** | `packages/docker-runner/` | — | Не берём |

```
Итого: platform — в основном референс + инфраструктура (monitoring, ops, vault, configs).
Код агентов НЕ переносится — у нас Mastra вместо кастомного graph engine.
platform-ui → референс для apps/web/ в Phase 2.
```

---

#### Сводная таблица: что переносится

| Исходный репо | `apps/api/` | `apps/plugin/` | `apps/web/` | `packages/shared/` | Корень |
|---|---|---|---|---|---|
| **nestjs-starter** | ✅ Целиком (основа) | — | — | — | docker-compose.yml |
| **cursor-talk-to-figma-mcp** | tools (конвертация) | code.js, manifest.json | — | — | — |
| **TalkToFigmaDesktop** | — | hooks (референс) | — | types, constants | — |
| **platform** | agents (референс) | — | Phase 2 (референс) | types (референс) | monitoring, ops, vault, configs |

---

## Быстрый старт

Предполагается что все 4 исходных репо уже клонированы рядом (см. маппинг выше).

```bash
# 1. Создаём монорепу в НОВОЙ папке
mkdir figma-design-agent && cd figma-design-agent
pnpm init

# 2. Настраиваем workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF
mkdir -p apps packages/shared/src/types

# 3. Копируем nestjs-starter → apps/api (основа backend)
cp -r ../nestjs-starter apps/api
rm -rf apps/api/.git apps/api/src/products  # удаляем .git и example CRUD
mkdir -p apps/api/src/{mastra/{agents,workflows,tools},chat,billing,usage}

# 4. Копируем Figma sandbox + manifest из cursor-talk-to-figma-mcp → apps/plugin
mkdir -p apps/plugin/src/{components,hooks,bridge,tools}
cp ../cursor-talk-to-figma-mcp/src/cursor_mcp_plugin/code.js apps/plugin/code.js
cp ../cursor-talk-to-figma-mcp/src/cursor_mcp_plugin/manifest.json apps/plugin/manifest.json
# TODO: адаптировать code.js (WebSocket → postMessage bridge)
# TODO: конвертировать server.ts tools → apps/api/src/mastra/tools/figma-tools.ts

# 5. Копируем типы из TalkToFigmaDesktop → packages/shared
cp -r ../TalkToFigmaDesktop/src/shared/types/* packages/shared/src/types/
cp ../TalkToFigmaDesktop/src/shared/constants.ts packages/shared/src/constants.ts
# TODO: рефакторить hooks из TalkToFigmaDesktop → apps/plugin/src/hooks/

# 6. Копируем инфраструктуру из platform → корень
cp ../platform/docker-compose.yml .
cp ../platform/docker-compose.monitoring.yml .
cp -r ../platform/monitoring .
cp -r ../platform/ops .
cp -r ../platform/vault .
cp ../platform/tsconfig.base.json .
cp ../platform/vitest.config.ts .
# TODO: apps/web/ (Phase 2) — использовать platform/packages/platform-ui как референс

# 7. Добавляем Mastra + CopilotKit в api
pnpm --filter @figma-agent/api add @mastra/core @mastra/nestjs @mastra/memory @mastra/pg
pnpm --filter @figma-agent/api add @ag-ui/mastra @ag-ui/core @copilotkit/runtime
pnpm --filter @figma-agent/api add @ai-sdk/anthropic

# 8. Настраиваем plugin workspace
cd apps/plugin && pnpm init && cd ../..
pnpm --filter @figma-agent/plugin add react react-dom @copilotkit/react-core @copilotkit/react-ui
pnpm --filter @figma-agent/plugin add -D esbuild typescript @types/react

# 9. Настраиваем shared workspace
cd packages/shared && pnpm init && cd ../..

# 10. Устанавливаем зависимости и настраиваем .env
pnpm install
cp apps/api/.env.example apps/api/.env
# Добавляем: FIGMA_CLIENT_ID, FIGMA_CLIENT_SECRET, ANTHROPIC_API_KEY, STRIPE_*

# 11. Запускаем
docker-compose up -d  # PostgreSQL
pnpm dev              # NestJS API
pnpm dev:plugin       # Figma plugin (watch mode)
```

---

## Целевая архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIGMA PLUGIN (iframe)                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ React App (бандл в ui.html через esbuild)                   │ │
│  │                                                              │ │
│  │  <CopilotKit                                                 │ │
│  │    runtimeUrl="https://api.figma-agent.com/api"              │ │
│  │    headers={{ Authorization: `Bearer ${jwt}` }}              │ │
│  │  >                                                           │ │
│  │    <SelectionProvider />  ← useCopilotReadable(selection)    │ │
│  │    <FigmaTools />         ← useCopilotAction × 40 tools      │ │
│  │    <CopilotChat />        ← UI чата из коробки               │ │
│  │  </CopilotKit>                                               │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
│                         │ postMessage                             │
│  ┌──────────────────────▼──────────────────────────────────────┐ │
│  │ code.js (Figma sandbox) — БЕЗ ИЗМЕНЕНИЙ                     │ │
│  │ handleCommand(command, params) → Figma API → result          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS (AG-UI Protocol)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           CLOUD PLATFORM (nestjs-starter foundation)              │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ MastraModule (@mastra/nestjs) — NestJS-native integration  │   │
│  │                                                            │   │
│  │  MastraModule.registerAsync({                              │   │
│  │    mastra: new Mastra({                                    │   │
│  │      agents: { designer, reviewer },                       │   │
│  │      workflows: { designTask },                            │   │
│  │      memory: new Memory({ storage }),                      │   │
│  │    }),                                                     │   │
│  │    rateLimitOptions: { generateLimit: 20 },                │   │
│  │    streamOptions: { heartbeatMs: 20_000 },                 │   │
│  │  })                                                        │   │
│  │                                                            │   │
│  │  + registerCopilotKit() → AG-UI route для CopilotKit       │   │
│  │  + Built-in: rate limiting, streaming, graceful shutdown    │   │
│  │  + Guards: auth, throttle, route matching                   │   │
│  │  + MastraService DI: inject agents/workflows anywhere       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──── Уже есть в nestjs-starter ────────────────────────────┐   │
│  │  AuthModule     — Better Auth + JWT + Bearer + OTP          │   │
│  │                   + Figma OAuth (3 строки конфига)           │   │
│  │  TypeORM        — PostgreSQL + auto-migrations              │   │
│  │  Notifications  — Resend + React Email                      │   │
│  │  Media          — S3 presigned upload                       │   │
│  │  Admin          — Auto CRUD                                 │   │
│  │  Monitoring     — Prometheus + Sentry + Pino + Health       │   │
│  │  Swagger        — API docs                                  │   │
│  │  Docker         — Ready to deploy                           │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──── Нужно добавить ───────────────────────────────────────┐   │
│  │  ChatModule     — Entities + API: chats, messages           │   │
│  │  BillingModule  — Stripe: subscriptions, webhooks           │   │
│  │  UsageModule    — Token counting, rate limiting по плану    │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  PostgreSQL: users, accounts, sessions (Better Auth)              │
│            + chats, messages, subscriptions, usage_logs (NEW)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mastra — агентский движок с первого дня

### Почему Mastra, а не direct-to-LLM

CopilotKit direct-to-LLM позволяет LLM вызывать tools по одному. Но для Cursor-like agent mode нужно:
- **Планирование** — разбить "создай карточку продукта" на 6 шагов до начала работы
- **Maker-Checker loop** — один агент делает, другой проверяет, возвращает на доработку
- **Настойчивость** — агент не останавливается после первой ошибки, а пробует альтернативы
- **Memory** — помнит предпочтения пользователя между сессиями

Mastra — TypeScript native, ложится на NestJS без трения через `@mastra/nestjs`.

### @mastra/nestjs — NestJS адаптер (PR #12751)

Официальный NestJS модуль от команды Mastra. Даёт:

```typescript
// apps/api/src/app.module.ts
import { Module } from "@nestjs/common";
import { MastraModule } from "@mastra/nestjs";
import { mastra } from "./mastra";

@Module({
  imports: [
    // Существующие модули из nestjs-starter
    AuthModule,
    DatabaseModule,
    NotificationsModule,
    MediaModule,

    // Mastra подключается как обычный NestJS module
    MastraModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        mastra: new Mastra({
          agents: {
            designer: designerAgent,
            reviewer: reviewerAgent,
          },
          workflows: {
            designTask: designWorkflow,
          },
          memory: new Memory({
            storage: new PostgresStore({ url: config.get("DATABASE_URL") }),
            options: { lastMessages: 40 },
          }),
        }),
        prefix: "/api",
        rateLimitOptions: {
          enabled: true,
          defaultLimit: 200,
          generateLimit: 20,    // строже для LLM вызовов
          windowMs: 60_000,
        },
        streamOptions: {
          heartbeatMs: 20_000,  // keepalive для SSE
        },
      }),
      inject: [ConfigService],
    }),

    // Наши новые модули
    ChatModule,
    BillingModule,
    UsageModule,
  ],
})
export class AppModule {}
```

**Что @mastra/nestjs даёт из коробки:**
- `MastraModule.register()` / `registerAsync()` — DI-based setup
- Built-in controllers: `/api/agents/:id/generate`, `/api/agents/:id/stream`
- Rate limiting (in-memory, per-route)
- SSE streaming с heartbeat
- Graceful shutdown с отслеживанием in-flight requests
- Auth guard + `@Public()`, `@SkipThrottle()` decorators
- MCP transport (HTTP + SSE)
- OpenTelemetry tracing
- `MastraService` для inject в свои сервисы:

```typescript
// apps/api/src/chat/chat.service.ts
@Injectable()
export class ChatService {
  constructor(private readonly mastraService: MastraService) {}

  async runDesignTask(message: string, context: any) {
    const workflow = this.mastraService.getWorkflow("designTask");
    return workflow.start({ inputData: { message, context } });
  }
}
```

### CopilotKit ↔ Mastra через AG-UI Protocol

CopilotKit на фронте подключается к Mastra через AG-UI — стандартный event-based streaming protocol:

```typescript
// apps/api/src/mastra/index.ts — регистрация CopilotKit route
import { registerCopilotKit } from "@ag-ui/mastra";

export const mastra = new Mastra({
  agents: { designer: designerAgent, reviewer: reviewerAgent },
  workflows: { designTask: designWorkflow },
  server: {
    // CopilotKit route регистрируется через AG-UI adapter
    apiRoutes: [registerCopilotKit({ path: "/copilotkit" })],
  },
});
```

На фронте CopilotKit указывает на Mastra endpoint:

```tsx
<CopilotKit
  runtimeUrl="https://api.figma-agent.com/api"
  headers={{ Authorization: `Bearer ${jwt}` }}
>
  <CopilotChat />
</CopilotKit>
```

AG-UI обеспечивает: streaming text, tool call events, state sync, progress updates — всё через стандартный протокол.

### AG-UI Tool Routing — как tool call с бэка попадает на фронт

Ключевой архитектурный момент: Figma API доступен **только** из `code.js` (sandbox). Агент на бэке **не может** напрямую вызвать `figma.createRectangle()`. Решение — **frontend-executed tools** через AG-UI:

```
1. Агент (Mastra, бэкенд) решает вызвать tool "create_rectangle"
2. Mastra НЕ выполняет execute() на бэке — tool помечен как frontend-delegated
3. AG-UI стримит event: { type: "TOOL_CALL", name: "create_rectangle", args: {...} }
4. CopilotKit на фронте получает event → ищет useCopilotAction с name="create_rectangle"
5. useCopilotAction handler: sendToFigma("create_rectangle", args) → postMessage → code.js
6. code.js: figma.createRectangle(args) → результат
7. Результат → postMessage → handler return → CopilotKit
8. CopilotKit стримит обратно: { type: "TOOL_RESULT", result: {...} }
9. Mastra agent получает результат → продолжает выполнение
```

**Два набора tool definitions — зеркальные:**

| Где | Формат | Назначение |
|---|---|---|
| `apps/api/src/mastra/tools/figma-tools.ts` | `createTool()` Mastra | Агент **знает** какие tools доступны (schema + description). `execute` — заглушка. |
| `apps/plugin/src/tools/definitions.ts` | `useCopilotAction()` CopilotKit | Фронт **исполняет** tool через `sendToFigma()`. |

**Оба набора ДОЛЖНЫ быть синхронизированы** по `name`, `parameters` / `inputSchema`. Источник истины — `cursor-talk-to-figma-mcp/src/server.ts`.

```typescript
// apps/api/src/mastra/tools/figma-tools.ts — серверная сторона
export const createRectangle = createTool({
  id: "create_rectangle",
  description: "Create a rectangle on the Figma canvas.",
  inputSchema: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
  execute: async ({ context }) => {
    // НЕ выполняется на бэке — AG-UI перехватывает tool call
    // и делегирует useCopilotAction на фронте
    return { status: "delegated_to_frontend" };
  },
});

// apps/plugin/src/tools/definitions.ts — фронтовая сторона
// handler РЕАЛЬНО выполняет через sendToFigma()
useCopilotAction({
  name: "create_rectangle",  // ДОЛЖЕН совпадать с id на бэке
  parameters: [
    { name: "x", type: "number" },
    { name: "y", type: "number" },
    { name: "width", type: "number" },
    { name: "height", type: "number" },
  ],
  handler: async ({ x, y, width, height }) => {
    return await sendToFigma("create_rectangle", { x, y, width, height });
  },
});
```

> **⚠️ PoC-вопрос #3:** Нужно проверить, что AG-UI корректно маршрутизирует tool calls с `execute: return { delegated }` на фронт. Если AG-UI не поддерживает frontend-executed tools из коробки — альтернатива: tools живут ТОЛЬКО на фронте (useCopilotAction), Mastra agent видит их через CopilotKit runtime, а не через `tools: figmaTools`.

### Designer Agent — создаёт и модифицирует дизайн

```typescript
// apps/api/src/mastra/agents/designer.agent.ts
import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { figmaTools } from "../tools/figma-tools";

export const designerAgent = new Agent({
  name: "designer",
  instructions: `You are a Figma design executor. You receive tasks and execute them using Figma tools.

## How you work
1. Plan your approach: break complex tasks into sequential steps
2. Execute each step using the available tools
3. After each step, verify the result before proceeding
4. If a tool returns an error, try an alternative approach
5. Report what you created/modified after completion

## Design best practices
- Use Auto Layout for responsive designs (set_layout_mode)
- Name layers descriptively (через set_text_content или параметр name в create_* tools)
- Use consistent spacing: 4, 8, 12, 16, 24, 32, 48px
- Group related elements into frames
- Set proper constraints for responsive behavior

## Tool usage
- Always reference elements by their node ID
- For bulk operations, process one element at a time
- Check selection context before modifying elements
- Use create_frame as container before adding child elements

## Tone
Respond concisely. For simple tasks, just do it and confirm.
For complex tasks, briefly explain your plan before executing.
Respond in the same language as the user's message.`,
  model: anthropic("claude-sonnet-4-20250514"),
  tools: figmaTools, // 40 Figma tools
});
```

### Reviewer Agent — проверяет результат

```typescript
// apps/api/src/mastra/agents/reviewer.agent.ts
import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { reviewTools } from "../tools/review-tools";

export const reviewerAgent = new Agent({
  name: "reviewer",
  instructions: `You are a design QA reviewer. You check completed work against the original task.

## What you check
1. Completeness — all requested elements exist
2. Naming — layers are named descriptively (not "Rectangle 1")
3. Structure — Auto Layout used where appropriate
4. Spacing — consistent spacing (4/8/12/16/24/32/48px grid)
5. Alignment — elements properly aligned
6. Hierarchy — proper nesting (frame > elements, not flat)

## Your response format
If issues found:
  ISSUES_FOUND:
  - [issue 1]: specific fix instruction
  - [issue 2]: specific fix instruction

If all good:
  APPROVED: [brief summary of what looks good]

## Important
- Be specific in fix instructions (e.g., "rename 'Rectangle 5' to 'Card Background'")
- Don't nitpick — focus on structural and naming issues
- Max 5 issues per review to avoid overwhelming the designer agent`,
  model: anthropic("claude-sonnet-4-20250514"),
  tools: reviewTools, // read-only tools: get_node_info, get_selection, get_document_info, scan_nodes_by_types
});
```

### Design Workflow — maker-checker loop

```typescript
// apps/api/src/mastra/workflows/design.workflow.ts
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { designerAgent } from "../agents/designer.agent";
import { reviewerAgent } from "../agents/reviewer.agent";

const executeStep = createStep({
  id: "execute",
  inputSchema: z.object({
    userMessage: z.string(),
    selectionContext: z.string().optional(),
    previousFeedback: z.string().optional(),
  }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    const prompt = inputData.previousFeedback
      ? `Fix these issues from the reviewer:\n${inputData.previousFeedback}\n\nOriginal task: ${inputData.userMessage}`
      : `Execute this design task:\n${inputData.userMessage}\n\nSelection context: ${inputData.selectionContext || "none"}`;

    const response = await designerAgent.generate({
      messages: [{ role: "user", content: prompt }],
    });
    return { result: response.text };
  },
});

const reviewStep = createStep({
  id: "review",
  inputSchema: z.object({
    userMessage: z.string(),
    executionResult: z.string(),
  }),
  outputSchema: z.object({
    verdict: z.enum(["APPROVED", "ISSUES_FOUND"]),
    feedback: z.string(),
  }),
  execute: async ({ inputData }) => {
    const response = await reviewerAgent.generate({
      messages: [{
        role: "user",
        content: `Original task: ${inputData.userMessage}\n\nWhat was done: ${inputData.executionResult}\n\nReview:`,
      }],
    });

    const isApproved = response.text.includes("APPROVED");
    return {
      verdict: isApproved ? "APPROVED" : "ISSUES_FOUND",
      feedback: response.text,
    };
  },
});

export const designWorkflow = createWorkflow({
  id: "design-task",
  inputSchema: z.object({
    userMessage: z.string(),
    selectionContext: z.string().optional(),
  }),
  outputSchema: z.object({ finalResult: z.string() }),
})
  .then(executeStep)
  .then(reviewStep)
  .dountil(
    // Повторять execute → review пока reviewer не скажет APPROVED
    reviewStep,
    async ({ inputData, getStepResult }) => {
      const review = getStepResult(reviewStep);
      return review.verdict === "APPROVED" || inputData.iterationCount >= 3;
    }
  )
  .commit();
```

**Что видит пользователь в чате:**

```
🔄 Планирую...
  → Создать Frame 320×400
  → Добавить Image placeholder
  → Добавить Text "Product Name"
  → Добавить Text "$99.00"
  → Добавить Button "Buy Now"
  → Применить Auto Layout

🔨 Выполняю...
  ✅ Frame "Product Card" создан
  ✅ Rectangle placeholder добавлен
  ✅ Text "Product Name" добавлен
  ✅ Text "$99.00" добавлен
  ✅ Button frame создан
  ✅ Auto Layout применён

🔍 Проверяю...
  ⚠️ Кнопка без padding — добавляю 24px horizontal, 12px vertical
  ⚠️ Нет border-radius — добавляю 12px

🔨 Исправляю...
  ✅ Padding добавлен
  ✅ Border-radius добавлен

🔍 Повторная проверка...
  ✅ Всё соответствует задаче

Готово! Карточка продукта создана.
```

### Mastra Memory — помнит между сессиями

```typescript
// apps/api/src/mastra/index.ts
import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";  // Neon PostgreSQL

const memory = new Memory({
  storage: new PostgresStore({
    url: process.env.DATABASE_URL,
  }),
  options: {
    lastMessages: 40,           // последние 40 сообщений в контексте
    semanticRecall: true,       // поиск по смыслу в старых сообщениях
    threads: {
      generateTitle: true,      // автоматический title чата
    },
  },
});

export const mastra = new Mastra({
  agents: { designer: designerAgent, reviewer: reviewerAgent },
  workflows: { designTask: designWorkflow },
  memory,
});
```

**Thread-based memory:** каждый чат = thread, привязан к `resourceId` (userId) + `threadId` (chatId). Mastra сам хранит историю — не нужен отдельный ChatModule для persistence.

```typescript
// Вызов агента с memory context
const agent = mastra.getAgent("designer");
const response = await agent.generate({
  messages: [{ role: "user", content: userMessage }],
  memory: {
    resource: userId,         // владелец
    thread: `chat_${fileKey}`, // привязка к Figma файлу
  },
});
```

---

## CopilotKit — UI чата в плагине

### UI из коробки

CopilotKit даёт готовый чат компонент:

```tsx
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

// Одна строка — и чат работает:
// input field, messages, streaming, markdown, tool call display
<CopilotChat
  labels={{ title: "Figma Agent", placeholder: "Что создать?" }}
  className="figma-chat"
/>
```

Из коробки: поле ввода, сообщения с markdown rendering, streaming текста, индикатор загрузки, отображение tool calls.

Позже можно перейти на headless (`@copilotkit/react-core`) для полного контроля над дизайном.

### useCopilotReadable — контекст канваса → агенту

```tsx
// Агент автоматически видит что выбрано на канвасе
useCopilotReadable({
  description: "Currently selected Figma elements",
  value: selectedNodes, // [{id, name, type, width, height, fills, ...}]
});
```

### useCopilotAction — 40 Figma tools как frontend actions

```tsx
useCopilotAction({
  name: "create_rectangle",
  description: "Create a rectangle on the Figma canvas",
  parameters: [
    { name: "x", type: "number", description: "X position" },
    { name: "y", type: "number", description: "Y position" },
    { name: "width", type: "number" },
    { name: "height", type: "number" },
  ],
  handler: async ({ x, y, width, height }) => {
    return await sendToFigma("create_rectangle", { x, y, width, height });
  },
});
```

### Полная сборка Plugin App

```tsx
// apps/plugin/src/App.tsx
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
// CSS — не импортируем здесь, подключаем через src/styles.css (@import)
// См. секцию "CSS Bundling" ниже
import { useEffect, useState } from "react";
import { sendToFigma, initBridge } from "./bridge/sendToFigma";
import { FIGMA_TOOLS, ToolDefinition } from "./tools/definitions";
import { useFigmaSelection } from "./hooks/useFigmaSelection";
import { AuthScreen } from "./components/AuthScreen";

// Инициализация postMessage bridge
initBridge();

function FigmaToolAction({ tool }: { tool: ToolDefinition }) {
  useCopilotAction({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => sendToFigma(tool.name, params),
  });
  return null;
}

function SelectionProvider() {
  useFigmaSelection(); // регистрирует useCopilotReadable внутри
  return null;
}

function App() {
  const [jwt, setJwt] = useState<string | null>(null);

  useEffect(() => {
    sendToFigma("get_stored_jwt", {}).then(setJwt).catch(() => setJwt(null));
  }, []);

  if (!jwt) return <AuthScreen onAuth={setJwt} />;

  return (
    <CopilotKit
      runtimeUrl={process.env.API_URL + "/api"}
      headers={{ Authorization: `Bearer ${jwt}` }}
    >
      {/* Регистрация 40 Figma tools */}
      {FIGMA_TOOLS.map((tool) => (
        <FigmaToolAction key={tool.name} tool={tool} />
      ))}

      {/* Контекст выделения → агенту */}
      <SelectionProvider />

      {/* UI чата — из коробки */}
      <CopilotChat
        labels={{ title: "Figma Agent", placeholder: "Что создать?" }}
      />
    </CopilotKit>
  );
}

export default App;
```

---

## Plugin Build Pipeline (esbuild → ui.html)

Figma требует **один HTML-файл** (`ui.html`) со всем JS/CSS inline.

```typescript
// apps/plugin/esbuild.config.ts
import * as esbuild from "esbuild";
import * as fs from "fs";

async function build() {
  const result = await esbuild.build({
    entryPoints: ["src/App.tsx"],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2020",
    minify: process.env.NODE_ENV === "production",
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.API_URL": '"https://api.figma-agent.com"',
    },
    loader: { ".tsx": "tsx", ".ts": "ts", ".css": "css" },
  });

  const jsCode = result.outputFiles[0].text;

  const cssResult = await esbuild.build({
    entryPoints: ["src/styles.css"],
    bundle: true,
    write: false,
    minify: true,
  });
  const cssCode = cssResult.outputFiles[0].text;

  const html = `<!DOCTYPE html>
<html>
<head><style>${cssCode}</style></head>
<body>
  <div id="root"></div>
  <script>${jsCode}</script>
</body>
</html>`;

  fs.writeFileSync("ui.html", html);
  console.log(`✅ ui.html built (${(html.length / 1024).toFixed(0)} KB)`);
}

build();
```

---

## postMessage Bridge — sendToFigma()

Concurrent-safe request/response bridge между React UI и code.js:

```typescript
// apps/plugin/src/bridge/sendToFigma.ts
type PendingCall = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const pendingCalls = new Map<string, PendingCall>();
let callCounter = 0;

export function sendToFigma(
  command: string,
  params: Record<string, any> = {},
  timeoutMs = 30_000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const callId = `call_${++callCounter}_${Date.now()}`;
    const timeout = setTimeout(() => {
      pendingCalls.delete(callId);
      reject(new Error(`Timeout: ${command} (${callId}) after ${timeoutMs}ms`));
    }, timeoutMs);
    pendingCalls.set(callId, { resolve, reject, timeout });
    parent.postMessage({ pluginMessage: { callId, command, params } }, "*");
  });
}

export function initBridge() {
  window.addEventListener("message", (event) => {
    const msg = event.data?.pluginMessage;
    if (!msg?.callId) return;
    const pending = pendingCalls.get(msg.callId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    pendingCalls.delete(msg.callId);
    if (msg.error) pending.reject(new Error(msg.error));
    else pending.resolve(msg.result);
  });
}
```

**apps/plugin/code.js — добавить callId:**

```javascript
// apps/plugin/code.js
figma.ui.onmessage = async (msg) => {
  const { callId, command, params } = msg;
  try {
    const result = await handleCommand(command, params);
    figma.ui.postMessage({ callId, result });
  } catch (err) {
    figma.ui.postMessage({ callId, error: err.message });
  }
};
```

---

## Selection Serialization

`figma.on("selectionchange")` callback **не имеет аргументов**. SceneNode[] **не serializable** через postMessage.

```javascript
// apps/plugin/code.js — selection tracking
figma.on("selectionchange", () => {
  const nodes = figma.currentPage.selection; // callback БЕЗ аргументов!
  const serialized = nodes.map(serializeNode);
  figma.ui.postMessage({ type: "SELECTION_CHANGED", nodes: serialized });
});

function serializeNode(node) {
  const base = {
    id: node.id, name: node.name, type: node.type,
    visible: node.visible, locked: node.locked,
    x: node.x, y: node.y, width: node.width, height: node.height,
  };
  if ("fills" in node) base.fills = JSON.parse(JSON.stringify(node.fills));
  if ("strokes" in node) base.strokes = JSON.parse(JSON.stringify(node.strokes));
  if ("characters" in node) base.characters = node.characters;
  if ("layoutMode" in node) {
    base.layoutMode = node.layoutMode;
    base.primaryAxisAlignItems = node.primaryAxisAlignItems;
    base.counterAxisAlignItems = node.counterAxisAlignItems;
    base.itemSpacing = node.itemSpacing;
  }
  if ("children" in node) base.childCount = node.children.length; // НЕ рекурсивно
  return base;
}
```

```tsx
// apps/plugin/src/hooks/useFigmaSelection.ts
import { useState, useEffect } from "react";
import { useCopilotReadable } from "@copilotkit/react-core";

export function useFigmaSelection() {
  const [selectedNodes, setSelectedNodes] = useState<any[]>([]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (msg?.type === "SELECTION_CHANGED") setSelectedNodes(msg.nodes);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useCopilotReadable({
    description: "Currently selected Figma elements with their properties",
    value: selectedNodes,
  });

  return selectedNodes;
}
```

---

## Tool Factory — генерация useCopilotAction из описаний

40 tools описываются как массив, регистрируются через компонент-wrapper.

**Источник tools:** определения 40 Figma tools берём из проекта `cursor-talk-to-figma-mcp`:
- `cursor-talk-to-figma-mcp/src/server.ts` — MCP server с описаниями всех 40 tools (zod schemas + descriptions)
- `cursor-talk-to-figma-mcp/src/code.js` — Figma sandbox с `handleCommand()` для каждого tool

Конвертируем в два формата:
1. **Mastra tools** → `apps/api/src/mastra/tools/figma-tools.ts` (серверный формат для агента)
2. **CopilotKit actions** → `apps/plugin/src/tools/definitions.ts` (фронтовой формат для `useCopilotAction`)

```typescript
// apps/plugin/src/tools/definitions.ts
// Источник: конвертировать из cursor-talk-to-figma-mcp/src/server.ts (40 tool definitions)
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: "string" | "number" | "boolean" | "object" | "string[]";
    description: string;
    required?: boolean;
  }[];
  category: "creation" | "modification" | "query" | "layout" | "components";
}

export const FIGMA_TOOLS: ToolDefinition[] = [
  {
    name: "create_rectangle",
    description: "Create a rectangle. Use for backgrounds, buttons, cards, containers.",
    category: "creation",
    parameters: [
      { name: "x", type: "number", description: "X position in pixels", required: true },
      { name: "y", type: "number", description: "Y position in pixels", required: true },
      { name: "width", type: "number", description: "Width in pixels", required: true },
      { name: "height", type: "number", description: "Height in pixels", required: true },
      { name: "name", type: "string", description: "Layer name", required: false },
    ],
  },
  // ... остальные 39 tools (конвертировать из cursor-talk-to-figma-mcp/src/server.ts)
];
```

---

## Mastra Tools (серверный формат)

Tools на бэкенде описываются в Mastra-формате. Они нужны агенту чтобы **знать** что доступно. Фактическое исполнение происходит на фронте через `useCopilotAction` → `sendToFigma()`.

```typescript
// apps/api/src/mastra/tools/figma-tools.ts
// Источник: конвертировать из cursor-talk-to-figma-mcp/src/server.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const createRectangle = createTool({
  id: "create_rectangle",
  description: "Create a rectangle on the Figma canvas. Use for backgrounds, buttons, cards, containers.",
  inputSchema: z.object({
    x: z.number().describe("X position in pixels"),
    y: z.number().describe("Y position in pixels"),
    width: z.number().describe("Width in pixels"),
    height: z.number().describe("Height in pixels"),
    name: z.string().optional().describe("Layer name"),
  }),
  execute: async ({ context }) => {
    // Mastra tool на бэке — placeholder.
    // Реальное исполнение через CopilotKit useCopilotAction на фронте.
    // AG-UI protocol маршрутизирует tool call → frontend → sendToFigma()
    return { status: "delegated_to_frontend" };
  },
});

// ... остальные 39 tools (конвертировать из cursor-talk-to-figma-mcp/src/server.ts)

export const figmaTools = {
  create_rectangle: createRectangle,
  // create_frame, create_text, set_fill_color, set_layout_mode, ...
};
```

```typescript
// apps/api/src/mastra/tools/review-tools.ts
// Read-only подмножество tools для reviewer agent
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const getNodeInfo = createTool({
  id: "get_node_info",
  description: "Get properties of a Figma node by ID",
  inputSchema: z.object({ nodeId: z.string() }),
  execute: async ({ context }) => {
    return { status: "delegated_to_frontend" };
  },
});

export const reviewTools = {
  get_node_info: getNodeInfo,
  get_nodes_info: getNodesInfo,
  get_selection: getSelection,
  get_document_info: getDocumentInfo,
  get_styles: getStyles,
  get_annotations: getAnnotations,
  scan_nodes_by_types: scanNodesByTypes,
  scan_text_nodes: scanTextNodes,
  read_my_design: readMyDesign,
  export_node_as_image: exportNodeAsImage,
  // Все Read-only tools (✅ в таблице "Полный список 40 Figma tools")
};
```

---

## Auth Flow (Figma OAuth через Better Auth)

### Better Auth config

```typescript
// apps/api/src/auth/auth.config.ts — добавляем к существующему
socialProviders: {
  figma: {
    clientId: process.env.FIGMA_CLIENT_ID!,
    clientSecret: process.env.FIGMA_CLIENT_SECRET!,
  },
},
```

### Popup из Figma iframe

**Вариант A — `figma.openExternal()` (рекомендуемый):**
```
1. Пользователь нажимает "Войти" → Plugin UI → postMessage → code.js
2. code.js → figma.openExternal(authUrl) → системный браузер
3. Better Auth → Figma consent → callback → JWT
4. Callback page показывает код (6 цифр) или deep link
5. Пользователь вводит код / плагин получает JWT через polling
6. JWT → figma.clientStorage.setAsync("jwt", token)
```

**Вариант B — `window.open` (проще, может не работать):**
Начать с B, если не работает — переключиться на A.

### JWT в CopilotKit

```tsx
function App() {
  const [jwt, setJwt] = useState<string | null>(null);
  useEffect(() => {
    sendToFigma("get_stored_jwt", {}).then(setJwt).catch(() => setJwt(null));
  }, []);
  if (!jwt) return <AuthScreen onAuth={setJwt} />;
  return (
    <CopilotKit
      runtimeUrl="https://api.figma-agent.com/api"
      headers={{ Authorization: `Bearer ${jwt}` }}
    >
      ...
    </CopilotKit>
  );
}
```

### Token refresh

При 401 от API:
1. Plugin перехватывает → `POST /api/auth/refresh` с refresh token из `figma.clientStorage`
2. Получает новый JWT → обновляет storage
3. Если refresh тоже 401 → показывает login screen

### Figma OAuth App Registration

1. https://www.figma.com/developers/apps → "Create new app"
2. Callback URL: `https://api.figma-agent.com/api/auth/callback/figma`
3. Scopes: `file_read` (минимальный, для user info)
4. `client_id` + `client_secret` → `.env`

---

## Chat History

Mastra Memory берёт на себя хранение чатов — отдельный ChatModule для persistence **не нужен**.

```
При старте плагина:
1. code.js → figma.ui.postMessage({ type: "INIT", fileKey: figma.fileKey })
2. React получает fileKey → threadId = `file_${fileKey}`
3. Mastra agent.generate({ memory: { resource: userId, thread: threadId } })
4. Mastra Memory автоматически загружает историю и сохраняет новые сообщения

ChatModule REST API (для dashboard, не для плагина):
- GET /api/chats — список чатов пользователя (из Mastra memory threads)
- GET /api/chats/:threadId/messages — история
- DELETE /api/chats/:threadId — удалить чат
```

---

## CORS для Figma Plugin Iframe

```typescript
// apps/api/src/main.ts — CORS config
app.enableCors({
  origin: true,  // MVP: все origins (Figma iframe origin = "null")
  // Production: ['https://www.figma.com', 'null']
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
```

---

## Context Window Budget

| Компонент | Токенов |
|---|---|
| System prompt (designer) | ~500 |
| 40 tool definitions | ~5000 |
| Selection (10 nodes) | ~1000 |
| Chat history (20 messages via Mastra Memory) | ~3000 |
| **Итого overhead** | **~10K** (5% от 200K context Claude) |

---

## Модель данных

### Уже есть (Better Auth)
```
users, accounts, sessions, verifications, jwks
```

### Уже есть (Mastra Memory)
```
Mastra автоматически создаёт таблицы для threads и messages.
Не нужно дублировать в TypeORM.
```

### Нужно добавить (TypeORM)

```typescript
// apps/api/src/billing/entities/subscription.entity.ts
@Entity("subscriptions")
export class Subscription {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() userId: string;
  @Column({ nullable: true }) stripeCustomerId: string;
  @Column({ nullable: true }) stripeSubscriptionId: string;
  @Column({ default: "free" }) plan: string; // "free" | "pro" | "team"
  @Column({ default: "active" }) status: string;
  @Column({ default: 0 }) messagesUsed: number;
  @Column({ default: 50 }) messagesLimit: number;
  @Column({ type: "timestamptz", nullable: true }) currentPeriodStart: Date;
  @Column({ type: "timestamptz", nullable: true }) currentPeriodEnd: Date;
  @CreateDateColumn() createdAt: Date;
}

// apps/api/src/usage/entities/usage-log.entity.ts
@Entity("usage_logs")
export class UsageLog {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() userId: string;
  @Column({ nullable: true }) threadId: string;
  @Column() model: string;
  @Column({ default: 0 }) inputTokens: number;
  @Column({ default: 0 }) outputTokens: number;
  @Column({ default: 0 }) toolCallsCount: number;
  @Column({ default: 0 }) costCents: number;
  @CreateDateColumn() createdAt: Date;
}
```

---

## manifest.json (Figma Plugin)

```json
{
  "name": "Figma Design Agent",
  "id": "figma-design-agent",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"],
  "documentAccess": "dynamic-page",
  "permissions": [],
  "networkAccess": {
    "allowedDomains": ["https://api.figma-agent.com"],
    "reasoning": "Cloud AI agent backend for design assistance",
    "devAllowedDomains": ["http://localhost:3000"]
  }
}
```

> Путь: `apps/plugin/manifest.json`

---

## Поток данных (end-to-end)

```
1. Пользователь выбирает элементы → selectionchange → serialize → postMessage → React state
   → useCopilotReadable автоматически передаёт агенту

2. Пользователь пишет "Создай карточку продукта" в CopilotChat

3. CopilotKit → HTTPS (AG-UI) → @mastra/nestjs endpoint
   → @mastra/nestjs auth guard проверяет JWT
   → @mastra/nestjs rate limit проверяет лимит
   → Mastra design workflow запускается

4. Designer agent планирует → вызывает tools:
   → AG-UI стримит tool_call events в CopilotKit
   → CopilotKit вызывает handler из useCopilotAction
   → handler: sendToFigma("create_frame", {...})
   → postMessage → code.js → figma.createFrame() → result
   → result → postMessage → handler return → CopilotKit → Mastra

5. Reviewer agent получает результат, проверяет
   → Если ISSUES_FOUND → назад к designer с фидбеком (dountil loop)
   → Если APPROVED → финальный ответ пользователю

6. Mastra Memory автоматически сохраняет thread
   → UsageModule логирует tokens для биллинга
```

---

## Error Handling

**Tool errors:**
```
sendToFigma reject → CopilotKit error → Mastra agent видит ошибку
→ Designer agent (по system prompt): объясняет + пробует альтернативу
→ Reviewer agent: учитывает при проверке
```

**Network errors:**
```
CopilotKit → API timeout → retry (built-in)
→ 3 retries failed → "Connection lost, retrying..." в чате
```

**Auth errors:**
```
401 → try refresh token → retry
→ refresh failed → показать login screen
```

**Agent loop protection:**
```
dountil maxIterations: 3 → после 3 попыток reviewer автоматически APPROVED
→ пользователь видит summary что было сделано и что осталось
```

---

## Полный список 40 Figma tools

Все tools из `cursor-talk-to-figma-mcp/src/server.ts`, которые нужно конвертировать в Mastra tools + CopilotKit actions:

| # | Tool name | Категория | Reviewer? |
|---|---|---|---|
| 1 | `clone_node` | Create | ❌ |
| 2 | `create_component_instance` | Create | ❌ |
| 3 | `create_connections` | Create | ❌ |
| 4 | `create_frame` | Create | ❌ |
| 5 | `create_rectangle` | Create | ❌ |
| 6 | `create_text` | Create | ❌ |
| 7 | `delete_multiple_nodes` | Delete | ❌ |
| 8 | `delete_node` | Delete | ❌ |
| 9 | `export_node_as_image` | Export | ✅ |
| 10 | `get_annotations` | Read | ✅ |
| 11 | `get_document_info` | Read | ✅ |
| 12 | `get_instance_overrides` | Read | ✅ |
| 13 | `get_local_components` | Read | ✅ |
| 14 | `get_node_info` | Read | ✅ |
| 15 | `get_nodes_info` | Read | ✅ |
| 16 | `get_reactions` | Read | ✅ |
| 17 | `get_selection` | Read | ✅ |
| 18 | `get_styles` | Read | ✅ |
| 19 | `join_channel` | System | ❌ |
| 20 | `move_node` | Modify | ❌ |
| 21 | `read_my_design` | Read | ✅ |
| 22 | `resize_node` | Modify | ❌ |
| 23 | `scan_nodes_by_types` | Read | ✅ |
| 24 | `scan_text_nodes` | Read | ✅ |
| 25 | `set_annotation` | Modify | ❌ |
| 26 | `set_axis_align` | Layout | ❌ |
| 27 | `set_corner_radius` | Style | ❌ |
| 28 | `set_default_connector` | Modify | ❌ |
| 29 | `set_fill_color` | Style | ❌ |
| 30 | `set_focus` | Navigation | ❌ |
| 31 | `set_instance_overrides` | Modify | ❌ |
| 32 | `set_item_spacing` | Layout | ❌ |
| 33 | `set_layout_mode` | Layout | ❌ |
| 34 | `set_layout_sizing` | Layout | ❌ |
| 35 | `set_multiple_annotations` | Modify | ❌ |
| 36 | `set_multiple_text_contents` | Modify | ❌ |
| 37 | `set_padding` | Layout | ❌ |
| 38 | `set_selections` | Navigation | ❌ |
| 39 | `set_stroke_color` | Style | ❌ |
| 40 | `set_text_content` | Modify | ❌ |

> **Reviewer?** = ✅ значит tool доступен reviewer agent (read-only подмножество). Designer agent имеет доступ ко всем 40.

---

## Development Workflow

### Figma Plugin локальная разработка

```bash
# 1. Запускаем API
docker-compose up -d          # PostgreSQL (Neon в prod, local в dev)
pnpm dev                      # NestJS API на http://localhost:3000

# 2. Запускаем plugin в watch mode
pnpm dev:plugin               # esbuild --watch → ui.html

# 3. Figma Desktop → Plugins → Development → Import plugin from manifest
#    Указать путь: apps/plugin/manifest.json
#    При каждом изменении → Figma: правый клик → Plugins → Run again
```

> **Важно:** Figma Desktop App (не браузер) для local development. В manifest.json `devAllowedDomains` разрешает `http://localhost:3000`.

### Hot reload

Plugin не поддерживает HMR. Рабочий цикл:
1. Изменяешь код в `apps/plugin/src/`
2. esbuild watch автоматически пересобирает `ui.html`
3. В Figma: `Cmd+Alt+P` (Mac) / `Ctrl+Alt+P` (Win) — перезапуск плагина

### Миграции (TypeORM)

```bash
# Генерация миграции из изменений entities
pnpm --filter @figma-agent/api typeorm migration:generate src/migrations/AddSubscription

# Применить миграции
pnpm --filter @figma-agent/api typeorm migration:run

# Откатить последнюю
pnpm --filter @figma-agent/api typeorm migration:revert
```

> В `apps/api/package.json` добавить скрипт:
> ```json
> "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/app/data-source.ts"
> ```

---

## ESLint + Prettier (монорепо)

```json
// figma-design-agent/.eslintrc.json (root)
{
  "root": true,
  "extends": ["eslint:recommended"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "extends": [
        "plugin:@typescript-eslint/recommended"
      ],
      "rules": {
        "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
        "@typescript-eslint/no-explicit-any": "warn"
      }
    }
  ]
}
```

```json
// figma-design-agent/.prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

```json
// root package.json — добавить в devDependencies
{
  "devDependencies": {
    "typescript": "^5.5.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "prettier": "^3.3.0"
  }
}
```

---

## TypeScript Config (наследование)

```json
// figma-design-agent/tsconfig.base.json (из platform/)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@figma-agent/shared": ["packages/shared/src"]
    }
  }
}
```

```json
// apps/api/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "commonjs",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
  "include": ["src/**/*"]
}
```

```json
// apps/plugin/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

---

## Testing

### Стратегия

| Слой | Тип | Инструмент | Что тестируем |
|---|---|---|---|
| `packages/shared` | Unit | Vitest | Type guards, serialization, utils |
| `apps/api` | Unit | Vitest | Mastra tools input validation, billing logic |
| `apps/api` | Integration | Vitest + Supertest | NestJS endpoints, auth flow, Mastra agent run |
| `apps/plugin` | Unit | Vitest + jsdom | sendToFigma bridge, tool definitions mapping |

### Конфигурация

```typescript
// figma-design-agent/vitest.config.ts (из platform/)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["apps/*/src/**/*.test.ts", "packages/*/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
```

### Примеры тестов

```typescript
// apps/api/src/mastra/tools/__tests__/figma-tools.test.ts
import { describe, it, expect } from "vitest";
import { createRectangle } from "../figma-tools";

describe("createRectangle tool", () => {
  it("validates input schema", () => {
    const result = createRectangle.inputSchema.safeParse({
      x: 0, y: 0, width: 100, height: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid input", () => {
    const result = createRectangle.inputSchema.safeParse({
      x: "not-a-number",
    });
    expect(result.success).toBe(false);
  });
});
```

```typescript
// apps/api/src/billing/__tests__/billing.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { BillingService } from "../billing.service";

describe("BillingService", () => {
  it("returns correct limits for free plan", () => {
    const service = new BillingService(/* mocks */);
    const limits = service.getLimitsForPlan("free");
    expect(limits.tokensPerMonth).toBe(100_000);
    expect(limits.agentRunsPerDay).toBe(10);
  });
});
```

```bash
# Запуск тестов
pnpm test                      # все тесты
pnpm test -- --watch           # watch mode
pnpm test -- --coverage        # с coverage отчётом
```

> Root package.json:
> ```json
> "test": "vitest run",
> "test:watch": "vitest"
> ```

---

## Stripe Billing — Webhook Handler

### Endpoint

```typescript
// apps/api/src/billing/billing.controller.ts
import { Controller, Post, Req, Headers, RawBodyRequest } from "@nestjs/common";
import { BillingService } from "./billing.service";
import Stripe from "stripe";

@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  // Создание checkout session
  @Post("checkout")
  async createCheckout(@Req() req: AuthenticatedRequest) {
    return this.billing.createCheckoutSession(req.user.id, req.body.priceId);
  }

  // Stripe webhook — обработка событий
  @Post("webhook")
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") sig: string,
  ) {
    const event = this.billing.constructEvent(req.rawBody!, sig);
    await this.billing.handleEvent(event);
    return { received: true };
  }
}
```

### Обрабатываемые события

```typescript
// apps/api/src/billing/billing.service.ts (handleEvent)
async handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      // Пользователь оплатил → создать/обновить subscription
      break;
    case "customer.subscription.updated":
      // Смена плана (upgrade/downgrade)
      break;
    case "customer.subscription.deleted":
      // Отмена подписки → переключить на free plan
      break;
    case "invoice.payment_failed":
      // Не прошла оплата → уведомление + grace period
      break;
    case "invoice.paid":
      // Успешная оплата → сбросить usage counters
      break;
  }
}
```

### NestJS Raw Body

Stripe webhook требует raw body для верификации подписи:

```typescript
// apps/api/src/main.ts
const app = await NestFactory.create(AppModule, {
  rawBody: true, // ← важно для Stripe webhook signature
});
```

---

## Rate Limiting по подписке

### Планы и лимиты

| План | Tokens/month | Agent runs/day | Max context | Цена |
|---|---|---|---|---|
| **Free** | 100K | 10 | 4K tokens | $0 |
| **Pro** | 1M | 100 | 16K tokens | $19/mo |
| **Team** | 5M | Unlimited | 32K tokens | $49/mo/seat |

### UsageGuard

```typescript
// apps/api/src/usage/usage.guard.ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { UsageService } from "./usage.service";

@Injectable()
export class UsageGuard implements CanActivate {
  constructor(private readonly usage: UsageService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;

    const { allowed, remaining, resetAt } = await this.usage.checkLimit(userId);

    // Добавляем headers для фронта
    const response = context.switchToHttp().getResponse();
    response.header("X-RateLimit-Remaining", remaining.toString());
    response.header("X-RateLimit-Reset", resetAt.toISOString());

    if (!allowed) {
      throw new HttpException(
        { message: "Usage limit exceeded", upgradeUrl: "/billing/upgrade" },
        429,
      );
    }
    return true;
  }
}
```

### Подключение к Mastra endpoint

```typescript
// apps/api/src/app.module.ts
@Module({
  providers: [
    { provide: APP_GUARD, useClass: UsageGuard }, // глобальный guard
  ],
})
```

> В `UsageService` — инкремент `usage_logs` после каждого agent run. Сброс monthly counters по `invoice.paid` webhook.

---

## figma.clientStorage — JWT persistence

В `code.js` нужны обработчики для хранения JWT в Figma sandbox:

```javascript
// apps/plugin/code.js — добавить в handleCommand()
async function handleCommand(command, params) {
  switch (command) {
    // ... существующие Figma tool commands ...

    // JWT storage (Figma sandbox ↔ React UI)
    case "get_stored_jwt":
      return await figma.clientStorage.getAsync("jwt");

    case "set_stored_jwt":
      await figma.clientStorage.setAsync("jwt", params.token);
      return { success: true };

    case "delete_stored_jwt":
      await figma.clientStorage.deleteAsync("jwt");
      return { success: true };

    case "get_stored_refresh_token":
      return await figma.clientStorage.getAsync("refresh_token");

    case "set_stored_refresh_token":
      await figma.clientStorage.setAsync("refresh_token", params.token);
      return { success: true };

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
```

> `figma.clientStorage` — persistent storage, привязанный к pluginId. Данные сохраняются между сессиями Figma.

---

## CSS Bundling (esbuild + node_modules)

CopilotKit поставляет CSS в `@copilotkit/react-ui/dist/styles.css`. Его нужно включить в bundle:

```typescript
// apps/plugin/src/styles.css
@import "@copilotkit/react-ui/dist/styles.css";

/* Кастомные стили плагина */
:root {
  --copilot-kit-primary: #7C3AED;
}

#root {
  width: 100%;
  height: 100%;
  font-family: Inter, system-ui, sans-serif;
}
```

esbuild конфигурация для CSS из node_modules:

```typescript
// В apps/plugin/esbuild.config.ts — обновить cssResult:
const cssResult = await esbuild.build({
  entryPoints: ["src/styles.css"],
  bundle: true,
  write: false,
  minify: true,
  // esbuild по умолчанию резолвит @import из node_modules
  // Если не находит — добавить:
  nodePaths: ["node_modules"],
});
```

---

## Multi-Tab / Multi-Instance

Figma позволяет открыть один плагин в нескольких файлах одновременно. Каждый instance — отдельный iframe.

**Архитектурное решение:**
- Каждый instance = отдельный `threadId` = `file_${figma.fileKey}`
- На бэке — Mastra Memory хранит историю per thread, коллизий нет
- JWT общий (через `figma.clientStorage`, который shared per plugin)
- Нет shared state между instances — каждый независим

**Edge cases:**
- Если два instance работают с одним файлом — два thread для одного fileKey, но разные browser tabs, это ОК
- Rate limiting — per user (не per instance), поэтому лимиты суммируются
- WebSocket/SSE — каждый instance держит свое соединение

---

## Этапы реализации

### PoC (2-3 дня) — проверить 4 предположения

1. React + CopilotKit + `@copilotkit/react-ui` бандлится в Figma `ui.html` через esbuild
2. CopilotKit → @mastra/nestjs → Mastra agent → Claude → streaming работает
3. `useCopilotAction` → `sendToFigma` → `code.js` → Figma API → результат возвращается
4. Auth popup из Figma iframe → JWT получен

Если любой ломается — pivot до production-кода.

### Фаза 1: MVP (2-3 недели)

1. Клонировать nestjs-starter, удалить `products/` module
2. `pnpm add @mastra/core @mastra/nestjs @mastra/memory @ag-ui/mastra @copilotkit/runtime`
3. Создать `mastra/` директорию: designer agent, reviewer agent, design workflow
4. `MastraModule.registerAsync()` в AppModule + `registerCopilotKit()` route
5. Figma OAuth — `socialProviders.figma` в Better Auth config
6. Figma Plugin (React) — esbuild pipeline → ui.html
7. CopilotKit provider + `@copilotkit/react-ui` CopilotChat
8. postMessage bridge — `sendToFigma()` с callId и таймаутами
9. Tool factory — 40 tools из definitions.ts → FigmaToolAction components
10. Selection serialization — serializeNode() + useFigmaSelection()
11. CORS — `origin: true` для Figma iframe
12. Deploy — Railway/Fly.io + managed PostgreSQL

### Фаза 2: Polish + Dashboard (1-2 недели)

13. BillingModule — Stripe subscriptions, checkout, webhooks
14. UsageModule — token counting, rate limiting по плану
15. Web dashboard — React SPA: история чатов, billing, настройки
16. Tool renderers — `useRenderTool` для визуализации (ColorPreview, etc.)
17. Human-in-the-loop — подтверждение деструктивных операций
18. Observational memory — сжатие длинных диалогов через Mastra

### Фаза 3: External Integrations (1-2 недели)

19. Tadata MCP Hub — Slack, GitHub, Linear, Notion
20. Figma Community — публикация плагина
21. Onboarding flow + tutorial
22. Analytics — PostHog/Mixpanel

---

## Environment Variables

```bash
# === Уже в nestjs-starter ===
DATABASE_URL=postgresql://user:pass@localhost:5432/figma_agent
JWT_SECRET=your-jwt-secret
BETTER_AUTH_SECRET=your-auth-secret
RESEND_API_KEY=re_xxx
S3_BUCKET=figma-agent-media
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
SENTRY_DSN=https://xxx@sentry.io/xxx

# === Новые ===
# Figma OAuth
FIGMA_CLIENT_ID=xxx
FIGMA_CLIENT_SECRET=xxx

# LLM
ANTHROPIC_API_KEY=sk-ant-xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_TEAM=price_xxx

# Mastra
MASTRA_LOG_LEVEL=info              # debug | info | warn | error
# DATABASE_URL используется и TypeORM, и @mastra/pg (одна БД)

# App
APP_URL=https://api.figma-agent.com
CORS_ORIGINS=https://www.figma.com,null
```

> **Neon (production):** `DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/figma_agent?sslmode=require`
> **Local (dev):** `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/figma_agent`
> Одна переменная — и TypeORM, и Mastra Memory (`@mastra/pg`) используют одну и ту же базу.

---

## Ключевые архитектурные решения

### Почему Mastra с первого дня, а не Phase 2

CopilotKit direct-to-LLM позволяет LLM вызывать tools, но это один цикл: user → LLM → tools → response. Для Cursor-like agent mode нужен maker-checker loop, planning, persistence — это Mastra workflows. Откладывать на Phase 2 = переписывать backend позже.

### Почему @mastra/nestjs, а не copilotRuntimeNestEndpoint

`@mastra/nestjs` **заменяет** `copilotRuntimeNestEndpoint`. Он даёт: NestJS-native DI, guards, rate limiting, streaming, graceful shutdown — всё из коробки. CopilotKit подключается через AG-UI protocol, не через свой runtime.

### Почему CopilotKit react-ui, а не headless

Для MVP — готовый UI чата из коробки. Позже можно перейти на headless для кастомизации. Bundle size react-ui больше, но PoC покажет допустимо ли.

### Почему Mastra Memory, а не отдельный ChatModule

Mastra Memory = thread-based хранение из коробки. Не нужно дублировать chat/message entities — Mastra сам хранит историю. ChatModule нужен только как thin REST wrapper для dashboard.

---

## Открытые вопросы

1. **Bundle size** — замерить `react + @copilotkit/react-ui + 40 tool definitions` в Figma plugin. Если > 5MB → перейти на headless.
2. **@mastra/nestjs PR status** — PR #12751 ещё open. Если не merged к началу разработки → использовать `@mastra/core` напрямую + custom NestJS controller.
3. **AG-UI + Mastra tools routing** — как useCopilotAction на фронте связывается с Mastra agent tools на бэке? Нужен PoC: tool вызывается на фронте → результат возвращается агенту через AG-UI.
4. **Auth popup** — проверить `window.open()` из Figma plugin iframe. Если не работает → `figma.openExternal()` + polling.
5. **Concurrent tool calls** — проверить что Mastra + AG-UI корректно обрабатывает параллельные tool calls от агента.
