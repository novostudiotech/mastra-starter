export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  category: 'creation' | 'modification' | 'query' | 'layout' | 'components' | 'navigation' | 'style' | 'export' | 'system' | 'delete';
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'string[]';
  description: string;
  required?: boolean;
}
