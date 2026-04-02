export interface SerializedNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: any[];
  strokes?: any[];
  characters?: string;
  layoutMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  itemSpacing?: number;
  childCount?: number;
}

export interface SelectionContext {
  nodes: SerializedNode[];
  count: number;
}

export interface FigmaCommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
