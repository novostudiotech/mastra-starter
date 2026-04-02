import { Mastra } from '@mastra/core';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { designerAgent } from './agents/designer.agent';
import { reviewerAgent } from './agents/reviewer.agent';
import { designWorkflow } from './workflows/design.workflow';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Default export for Mastra Studio CLI (`npx mastra studio`)
export const mastra = createMastra(process.env.DATABASE_URL);

export function createMastra(databaseUrl: string) {
  const storage = new PostgresStore({
    id: 'figma-agent-storage',
    connectionString: databaseUrl,
  });

  const memory = new Memory({
    storage,
    options: {
      lastMessages: 40,
      semanticRecall: false,
    },
  });

  return new Mastra({
    agents: { designer: designerAgent, reviewer: reviewerAgent },
    workflows: { designTask: designWorkflow },
    memory: { chat: memory },
    storage,
  });
}
