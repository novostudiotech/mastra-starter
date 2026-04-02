import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// ============================================================================
// Example delegated tools
//
// These tools define Zod schemas on the backend but are executed on the frontend
// via CopilotKit's "delegated tools" pattern. The backend returns
// { status: 'delegated_to_frontend' } and CopilotKit runtime forwards the call
// to the frontend where useCopilotAction handlers do the real work.
// ============================================================================

/**
 * Get the current time — delegated to the frontend
 */
export const getCurrentTime = createTool({
  id: 'get_current_time',
  description: 'Get the current date and time',
  inputSchema: z.object({}),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

/**
 * Create a note — delegated to the frontend
 */
export const createNote = createTool({
  id: 'create_note',
  description: 'Create a new note with a title and content',
  inputSchema: z.object({
    title: z.string().describe('Title of the note'),
    content: z.string().describe('Content of the note'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

/**
 * Get all notes — delegated to the frontend
 */
export const getNotes = createTool({
  id: 'get_notes',
  description: 'Retrieve all saved notes',
  inputSchema: z.object({}),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

// ============================================================================
// Tool collections for agents
// ============================================================================

/** Tools available to the assistant agent */
export const assistantTools = {
  get_current_time: getCurrentTime,
  create_note: createNote,
  get_notes: getNotes,
};

/** Read-only tools available to the reviewer agent */
export const reviewerTools = {
  get_notes: getNotes,
};
