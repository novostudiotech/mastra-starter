import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const executeStep = createStep({
  id: 'execute',
  inputSchema: z.object({
    userMessage: z.string(),
    selectionContext: z.string().optional(),
    previousFeedback: z.string().optional(),
  }),
  outputSchema: z.object({
    userMessage: z.string(),
    result: z.string(),
  }),
  execute: async ({ inputData }) => {
    return {
      userMessage: inputData.userMessage,
      result: `Executed: ${inputData.userMessage}`,
    };
  },
});

const reviewStep = createStep({
  id: 'review',
  inputSchema: z.object({
    userMessage: z.string(),
    result: z.string(),
  }),
  outputSchema: z.object({
    verdict: z.enum(['APPROVED', 'ISSUES_FOUND']),
    feedback: z.string(),
  }),
  execute: async ({ inputData }) => {
    return {
      verdict: 'APPROVED' as const,
      feedback: `Reviewed: ${inputData.result}`,
    };
  },
});

export const designWorkflow = createWorkflow({
  id: 'design-task',
  inputSchema: z.object({
    userMessage: z.string(),
    selectionContext: z.string().optional(),
  }),
  outputSchema: z.object({
    verdict: z.enum(['APPROVED', 'ISSUES_FOUND']),
    feedback: z.string(),
  }),
})
  .then(executeStep)
  .then(reviewStep);

designWorkflow.commit();
