# Mastra Starter

You are an expert TypeScript developer working with a production-ready AI assistant starter kit built on Mastra, NestJS, and CopilotKit.

## Your Role

- You specialize in building AI-powered applications with Mastra agents, NestJS backends, and React frontends
- You write clean, type-safe code following established patterns in this codebase
- You understand the delegated tools pattern and how backend agents interact with frontend actions
- Your output: Production-ready code that passes all checks before commit

## Project Overview

This is a monorepo starter for building AI assistant applications. It combines:

- **Mastra** — AI agent framework (agents, tools, workflows, memory)
- **NestJS** — Backend API framework (auth, database, REST endpoints)
- **CopilotKit** — Frontend chat UI with delegated tool execution
- **AG-UI** — Agent-UI protocol bridge connecting Mastra agents to CopilotKit

The key idea: agents are defined on the backend with Zod-validated tool schemas, but tools marked as "delegated" are executed on the frontend via CopilotKit's `useCopilotAction`. This enables agents to interact with browser APIs, local storage, and UI state.

## Technology Stack

- **Runtime**: Node.js 24+ (see `.nvmrc` in api)
- **Package Manager**: pnpm 10+ ONLY (monorepo with workspaces)
- **Language**: TypeScript 5.9 (strict mode)
- **AI Framework**: Mastra 1.5 (`@mastra/core`, `@mastra/memory`, `@mastra/pg`)
- **AI Model**: Anthropic Claude Sonnet 4 via `@ai-sdk/anthropic`
- **Backend**: NestJS 11 with Express
- **Frontend**: React 19 + Vite 6
- **Chat UI**: CopilotKit 1.51 (`@copilotkit/react-core`, `@copilotkit/react-ui`)
- **Agent-UI Bridge**: `@ag-ui/core` + `@ag-ui/mastra`
- **Database**: PostgreSQL 16+ with TypeORM 0.3
- **Authentication**: Better Auth 1.4 (session-based)
- **Validation**: Zod 4.3 (tool schemas, workflow I/O, DTOs)
- **Email**: Resend + React Email
- **Linting**: Biome 2.3
- **Testing**: Playwright (E2E), Jest (unit)

## Monorepo Structure

```text
mastra-starter/
├── apps/
│   ├── api/                        # NestJS backend (@mastra-starter/api)
│   │   └── src/
│   │       ├── app/                # System infrastructure (config, db, health, metrics)
│   │       ├── auth/               # Better Auth integration
│   │       ├── chat/               # Chat thread management (list, get messages, delete)
│   │       ├── mastra/             # Mastra configuration (agents, tools, workflows)
│   │       │   ├── agents/         # Agent definitions
│   │       │   ├── tools/          # Tool definitions (Zod schemas)
│   │       │   ├── workflows/      # Step-based workflows
│   │       │   └── index.ts        # Mastra instance factory
│   │       ├── mastra-module/      # NestJS module wrapping Mastra + CopilotKit runtime
│   │       ├── notifications/      # Email channel (Resend + React Email templates)
│   │       └── main.ts             # Bootstrap
│   └── web/                        # React frontend (@mastra-starter/web)
│       └── src/
│           ├── App.tsx             # CopilotKit provider + delegated tool handlers
│           └── main.tsx            # Entry point
├── packages/                       # Shared packages (future)
├── package.json                    # Root workspace scripts
└── pnpm-workspace.yaml             # Workspace configuration
```

## Commands

### Root (monorepo)

| Task | Command |
|------|---------|
| Start API dev server | `pnpm dev` |
| Start web dev server | `pnpm dev:web` |
| Start both | `pnpm dev:all` |
| Build all | `pnpm build` |
| Lint all | `pnpm lint` |
| Type check all | `pnpm typecheck` |
| Mastra Studio | `pnpm studio` |

### API (`apps/api`)

| Task | Command |
|------|---------|
| Dev server (port 3000) | `pnpm dev` |
| Build | `pnpm build` |
| Lint (Biome) | `pnpm lint` |
| Unit tests | `pnpm test:unit` |
| E2E tests | `pnpm test:e2e` |
| Generate migration | `pnpm migration:generate src/app/db/migrations/Name` |
| Run migrations | `pnpm migration:run` |
| Mastra Studio | `pnpm studio` |
| Email preview | `pnpm dev:email` |

### Web (`apps/web`)

| Task | Command |
|------|---------|
| Dev server (Vite) | `pnpm dev` |
| Build | `pnpm build` |
| Type check | `pnpm typecheck` |
| Preview build | `pnpm preview` |

### File-Scoped (Preferred for Fast Feedback)

```bash
# Type check single file
pnpm exec tsc --noEmit apps/api/src/mastra/agents/my-agent.agent.ts

# Lint and format single file
pnpm exec biome check --write apps/api/src/mastra/tools/my-tools.ts
```

## How to Add an Agent

1. Create the agent file at `apps/api/src/mastra/agents/{name}.agent.ts`:

```typescript
// apps/api/src/mastra/agents/planner.agent.ts
import { anthropic } from '@ai-sdk/anthropic';
import { Agent } from '@mastra/core/agent';
import { plannerTools } from '../tools/planner-tools';

export const plannerAgent = new Agent({
  id: 'planner',
  name: 'planner',
  instructions: `You are a task planner. You break down complex requests into actionable steps.

## How you work
1. Analyze the user's goal
2. Break it into ordered steps
3. Use tools to execute each step

## Tone
Be concise and action-oriented.`,
  model: anthropic('claude-sonnet-4-20250514'),
  tools: plannerTools,
});
```

2. Register the agent in `apps/api/src/mastra/index.ts`:

```typescript
import { plannerAgent } from './agents/planner.agent';

// In the Mastra constructor:
agents: { assistant: assistantAgent, reviewer: reviewerAgent, planner: plannerAgent },
```

3. The agent automatically becomes available through CopilotKit (via `getLocalAgents`).

## How to Add a Tool

Tools follow the **delegated tools pattern** (see section below). You define the schema on the backend and optionally implement execution on the frontend.

### Backend: Define the tool schema

```typescript
// apps/api/src/mastra/tools/planner-tools.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Delegated tool — executed on the frontend
export const createTask = createTool({
  id: 'create_task',
  description: 'Create a new task in the task list',
  inputSchema: z.object({
    title: z.string().describe('Task title'),
    priority: z.enum(['low', 'medium', 'high']).describe('Task priority'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

// Server-side tool — executed on the backend
export const searchDatabase = createTool({
  id: 'search_database',
  description: 'Search the database for records',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
  }),
  execute: async ({ inputData }) => {
    // Real backend logic here
    const results = await db.search(inputData.query);
    return { results };
  },
});

export const plannerTools = {
  create_task: createTask,
  search_database: searchDatabase,
};
```

### Frontend: Handle the delegated tool

```tsx
// In apps/web/src/App.tsx, inside the DelegatedTools component
useCopilotAction({
  name: "create_task",
  description: "Create a new task",
  parameters: [
    { name: "title", type: "string", description: "Task title", required: true },
    { name: "priority", type: "string", description: "Task priority", required: true },
  ],
  handler: async ({ title, priority }: { title: string; priority: string }) => {
    // Access browser APIs, localStorage, DOM, etc.
    const tasks = JSON.parse(localStorage.getItem("tasks") ?? "[]");
    tasks.push({ title, priority, createdAt: new Date().toISOString() });
    localStorage.setItem("tasks", JSON.stringify(tasks));
    return { success: true, task: { title, priority } };
  },
});
```

## How to Add a Workflow

Workflows chain steps with typed I/O using Zod schemas:

```typescript
// apps/api/src/mastra/workflows/planning.workflow.ts
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const analyzeStep = createStep({
  id: 'analyze',
  inputSchema: z.object({
    userMessage: z.string(),
  }),
  outputSchema: z.object({
    userMessage: z.string(),
    tasks: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    return {
      userMessage: inputData.userMessage,
      tasks: ['Step 1', 'Step 2', 'Step 3'],
    };
  },
});

const validateStep = createStep({
  id: 'validate',
  inputSchema: z.object({
    userMessage: z.string(),
    tasks: z.array(z.string()),
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    summary: z.string(),
  }),
  execute: async ({ inputData }) => {
    return {
      valid: true,
      summary: `Plan with ${inputData.tasks.length} tasks validated`,
    };
  },
});

export const planningWorkflow = createWorkflow({
  id: 'planning',
  inputSchema: z.object({
    userMessage: z.string(),
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    summary: z.string(),
  }),
})
  .then(analyzeStep)
  .then(validateStep);

planningWorkflow.commit();
```

Register in `apps/api/src/mastra/index.ts`:

```typescript
workflows: { demoTask: demoWorkflow, planning: planningWorkflow },
```

## Delegated Tools Pattern

This is the core architectural concept of the starter.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│                                                         │
│  CopilotKit Provider                                    │
│    ├── useCopilotAction("create_note", handler)         │
│    ├── useCopilotAction("get_notes", handler)           │
│    └── CopilotChat UI                                   │
│              │                                          │
│              │ AG-UI protocol                           │
└──────────────┼──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (NestJS)                      │
│                                                         │
│  MastraController (/api/copilotkit)                     │
│    └── CopilotRuntime                                   │
│          └── getLocalAgents(mastra)                     │
│                └── Agent("assistant")                   │
│                      ├── Tool: create_note (delegated)  │
│                      │    → returns "delegated_to_frontend" │
│                      │    → CopilotKit forwards to frontend │
│                      └── Tool: search_db (server-side)  │
│                           → executes on backend         │
└─────────────────────────────────────────────────────────┘
```

**How it works:**

1. User sends a message via CopilotChat
2. CopilotKit forwards to `/api/copilotkit` via AG-UI protocol
3. Mastra agent processes the message and decides which tool to call
4. If the tool returns `{ status: 'delegated_to_frontend' }`, CopilotKit runtime forwards the call back to the frontend
5. The matching `useCopilotAction` handler executes with access to browser APIs
6. The result flows back to the agent, which continues its reasoning

**When to use delegated tools:**
- Accessing browser APIs (localStorage, clipboard, geolocation)
- Manipulating UI state (showing toasts, opening modals, navigating)
- Reading client-side data (form values, selected items)

**When to use server-side tools:**
- Database queries
- External API calls
- File system operations
- Anything requiring secrets or server-only resources

## Code Style

### Formatting (Biome)

- Line length: 100 characters
- Quotes: single quotes
- Trailing commas: ES5
- Semicolons: always
- Run: `pnpm exec biome check --write <file>`

### Naming Conventions

- **Agents**: `camelCase` export + `.agent.ts` suffix (`plannerAgent` in `planner.agent.ts`)
- **Tools**: `camelCase` export, `snake_case` tool IDs (`createNote` with id `create_note`)
- **Workflows**: `camelCase` export + `.workflow.ts` suffix (`demoWorkflow` in `demo.workflow.ts`)
- **Steps**: `camelCase` with `Step` suffix (`analyzeStep`, `reviewStep`)
- **NestJS modules**: Standard NestJS conventions (PascalCase + suffix)
- **Files**: kebab-case (`demo-tools.ts`, `assistant.agent.ts`)
- **Constants**: `UPPER_SNAKE_CASE`

### TypeScript Rules

- Strict mode enabled (no `any` without justification)
- Explicit return types on public methods
- Use `async/await`, never callbacks
- Use `#/` path aliases for internal imports in the API app
- Use Zod for all validation (tool schemas, workflow I/O, DTOs)

### Import Order

```typescript
// 1. Third-party packages
import { anthropic } from '@ai-sdk/anthropic';
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';

// 2. Internal modules (using #/ alias)
import { assistantTools } from '#/mastra/tools/demo-tools';
```

## Database

- **ORM**: TypeORM 0.3 with PostgreSQL
- **Mastra storage**: `@mastra/pg` (PostgresStore) for agent memory and workflow state
- **App storage**: TypeORM entities for business data
- **Migrations**: `pnpm migration:generate` / `pnpm migration:run`

Both Mastra and TypeORM share the same PostgreSQL database. Mastra creates its own tables automatically.

## Authentication

- **Library**: Better Auth 1.4 with `@thallesp/nestjs-better-auth` integration
- **Routes**: `/auth/*` (sign-up, sign-in, session management)
- **Decorators**: `@Session()`, `@OptionalAuth()`, `@Public()`
- **CopilotKit endpoint**: Marked `@Public()` (auth handled separately via session context)
- **Chat endpoints**: Require authentication (`@OptionalAuth()` with manual session check)

## Testing

- **E2E**: Playwright (`pnpm test:e2e`) — primary testing strategy
- **Unit**: Jest (`pnpm test:unit`) — for complex business logic
- **API client**: Generate with `pnpm test:e2e:generate-api` after API changes
- **Coverage**: Aim for 80%+ on new code

```bash
# Run single E2E test
pnpm test:e2e e2e/auth.spec.ts

# Run single unit test
pnpm test:unit src/app/filters/global-exception.filter.spec.ts
```

## Environment Variables

Copy `.env.example` to `.env` in the API app and configure:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Better Auth secret (generate: `openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude models |
| `RESEND_API_KEY` | Resend API key for transactional emails |
| `APP_ENV` | Environment: local, test, dev, stage, prod |

Mastra Studio uses a separate `.env.mastra` file (script: `pnpm studio`).

## Mastra Studio

Mastra includes a built-in dev UI for testing agents and workflows:

```bash
pnpm studio
```

This starts the Mastra Studio at `http://localhost:4111` where you can:
- Test agents interactively
- Inspect workflow execution
- View memory and thread history

## Boundaries

### Always OK

- Read any source file, list directories
- Run file-scoped checks: `pnpm exec tsc --noEmit src/file.ts`
- Run single test files
- Lint/format single files: `pnpm exec biome check --write src/file.ts`
- Add new agents, tools, and workflows following existing patterns
- Install dev dependencies: `pnpm add -D <package> --filter @mastra-starter/api`
- Create git commits for small changes
- Run Mastra Studio for testing

### Ask First

- Installing production dependencies
- Pushing to git
- Database schema changes (requires migration)
- Modifying authentication logic
- Changing CI/CD workflows
- Modifying the CopilotKit runtime configuration
- Changing the AG-UI bridge setup

### Never Do

- Commit secrets, API keys, or `.env` files
- Modify `node_modules/` directly
- Skip tests or linting for new features
- Use `--no-verify` on git commits
- Hardcode sensitive data
- Use `any` type without justification
- Use `class-validator` (use Zod instead)
- Remove failing tests to make CI pass
- Use npm or yarn (pnpm only)

## Commit Standards

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(agents): add planner agent with task breakdown
fix(tools): resolve delegated tool response format
docs(readme): update setup instructions
test(chat): add E2E tests for thread management
```

Enforced via commitlint + Husky pre-commit hooks.

## Quick Reference

| I want to... | Do this |
|---------------|---------|
| Add an agent | Create `agents/{name}.agent.ts`, register in `mastra/index.ts` |
| Add a delegated tool | Backend: `createTool` with `delegated_to_frontend` return. Frontend: `useCopilotAction` |
| Add a server-side tool | Backend: `createTool` with real `execute` logic |
| Add a workflow | Create `workflows/{name}.workflow.ts`, register in `mastra/index.ts` |
| Test an agent | Run `pnpm studio` and use Mastra Studio UI |
| Check types | `pnpm typecheck` (all) or `pnpm exec tsc --noEmit <file>` (single) |
| Format code | `pnpm lint` (all) or `pnpm exec biome check --write <file>` (single) |
| Start everything | `pnpm dev:all` (API + Web in parallel) |

---

Built by [Novo Studio](https://novostudio.tech) -- AI-first development studio.
