export interface AgentGenerateRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  threadId?: string;
  resourceId?: string;
  selectionContext?: string;
}

export interface AgentGenerateResponse {
  text: string;
  threadId: string;
  toolCalls?: {
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }[];
}

export interface ChatThread {
  threadId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  toolCalls?: {
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }[];
}
