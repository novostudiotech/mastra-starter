import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// ============================================================================
// Read-only / Inspection Tools
// ============================================================================

export const getDocumentInfo = createTool({
  id: 'get_document_info',
  description: 'Get detailed information about the current Figma document',
  inputSchema: z.object({}),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const getSelection = createTool({
  id: 'get_selection',
  description: 'Get information about the current selection in Figma',
  inputSchema: z.object({}),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const readMyDesign = createTool({
  id: 'read_my_design',
  description:
    'Get detailed information about the current selection in Figma, including all node details',
  inputSchema: z.object({}),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const getNodeInfo = createTool({
  id: 'get_node_info',
  description: 'Get detailed information about a specific node in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to get information about'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const getNodesInfo = createTool({
  id: 'get_nodes_info',
  description: 'Get detailed information about multiple nodes in Figma',
  inputSchema: z.object({
    nodeIds: z.array(z.string()).describe('Array of node IDs to get information about'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const getStyles = createTool({
  id: 'get_styles',
  description: 'Get all styles from the current Figma document',
  inputSchema: z.object({}),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const getLocalComponents = createTool({
  id: 'get_local_components',
  description: 'Get all local components from the Figma document',
  inputSchema: z.object({}),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const getAnnotations = createTool({
  id: 'get_annotations',
  description: 'Get all annotations in the current document or specific node',
  inputSchema: z.object({
    nodeId: z.string().describe('node ID to get annotations for specific node'),
    includeCategories: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to include category information'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const scanTextNodes = createTool({
  id: 'scan_text_nodes',
  description: 'Scan all text nodes in the selected Figma node',
  inputSchema: z.object({
    nodeId: z.string().describe('ID of the node to scan'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const scanNodesByTypes = createTool({
  id: 'scan_nodes_by_types',
  description: 'Scan for child nodes with specific types in the selected Figma node',
  inputSchema: z.object({
    nodeId: z.string().describe('ID of the node to scan'),
    types: z
      .array(z.string())
      .describe("Array of node types to find in the child nodes (e.g. ['COMPONENT', 'FRAME'])"),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const exportNodeAsImage = createTool({
  id: 'export_node_as_image',
  description: 'Export a node as an image from Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to export'),
    format: z.enum(['PNG', 'JPG', 'SVG', 'PDF']).optional().describe('Export format'),
    scale: z.number().positive().optional().describe('Export scale'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const getInstanceOverrides = createTool({
  id: 'get_instance_overrides',
  description:
    'Get all override properties from a selected component instance. These overrides can be applied to other instances, which will swap them to match the source component.',
  inputSchema: z.object({
    nodeId: z
      .string()
      .optional()
      .describe(
        'Optional ID of the component instance to get overrides from. If not provided, currently selected instance will be used.'
      ),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const getReactions = createTool({
  id: 'get_reactions',
  description:
    "Get Figma Prototyping Reactions from multiple nodes. CRITICAL: The output MUST be processed using the 'reaction_to_connector_strategy' prompt IMMEDIATELY to generate parameters for connector lines via the 'create_connections' tool.",
  inputSchema: z.object({
    nodeIds: z.array(z.string()).describe('Array of node IDs to get reactions from'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

// ============================================================================
// Creation Tools
// ============================================================================

export const createRectangle = createTool({
  id: 'create_rectangle',
  description: 'Create a new rectangle in Figma',
  inputSchema: z.object({
    x: z.number().describe('X position'),
    y: z.number().describe('Y position'),
    width: z.number().describe('Width of the rectangle'),
    height: z.number().describe('Height of the rectangle'),
    name: z.string().optional().describe('Optional name for the rectangle'),
    parentId: z.string().optional().describe('Optional parent node ID to append the rectangle to'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const createFrame = createTool({
  id: 'create_frame',
  description: 'Create a new frame in Figma',
  inputSchema: z.object({
    x: z.number().describe('X position'),
    y: z.number().describe('Y position'),
    width: z.number().describe('Width of the frame'),
    height: z.number().describe('Height of the frame'),
    name: z.string().optional().describe('Optional name for the frame'),
    parentId: z.string().optional().describe('Optional parent node ID to append the frame to'),
    fillColor: z
      .object({
        r: z.number().min(0).max(1).describe('Red component (0-1)'),
        g: z.number().min(0).max(1).describe('Green component (0-1)'),
        b: z.number().min(0).max(1).describe('Blue component (0-1)'),
        a: z.number().min(0).max(1).optional().describe('Alpha component (0-1)'),
      })
      .optional()
      .describe('Fill color in RGBA format'),
    strokeColor: z
      .object({
        r: z.number().min(0).max(1).describe('Red component (0-1)'),
        g: z.number().min(0).max(1).describe('Green component (0-1)'),
        b: z.number().min(0).max(1).describe('Blue component (0-1)'),
        a: z.number().min(0).max(1).optional().describe('Alpha component (0-1)'),
      })
      .optional()
      .describe('Stroke color in RGBA format'),
    strokeWeight: z.number().positive().optional().describe('Stroke weight'),
    layoutMode: z
      .enum(['NONE', 'HORIZONTAL', 'VERTICAL'])
      .optional()
      .describe('Auto-layout mode for the frame'),
    layoutWrap: z
      .enum(['NO_WRAP', 'WRAP'])
      .optional()
      .describe('Whether the auto-layout frame wraps its children'),
    paddingTop: z.number().optional().describe('Top padding for auto-layout frame'),
    paddingRight: z.number().optional().describe('Right padding for auto-layout frame'),
    paddingBottom: z.number().optional().describe('Bottom padding for auto-layout frame'),
    paddingLeft: z.number().optional().describe('Left padding for auto-layout frame'),
    primaryAxisAlignItems: z
      .enum(['MIN', 'MAX', 'CENTER', 'SPACE_BETWEEN'])
      .optional()
      .describe(
        'Primary axis alignment for auto-layout frame. Note: When set to SPACE_BETWEEN, itemSpacing will be ignored as children will be evenly spaced.'
      ),
    counterAxisAlignItems: z
      .enum(['MIN', 'MAX', 'CENTER', 'BASELINE'])
      .optional()
      .describe('Counter axis alignment for auto-layout frame'),
    layoutSizingHorizontal: z
      .enum(['FIXED', 'HUG', 'FILL'])
      .optional()
      .describe('Horizontal sizing mode for auto-layout frame'),
    layoutSizingVertical: z
      .enum(['FIXED', 'HUG', 'FILL'])
      .optional()
      .describe('Vertical sizing mode for auto-layout frame'),
    itemSpacing: z
      .number()
      .optional()
      .describe(
        'Distance between children in auto-layout frame. Note: This value will be ignored if primaryAxisAlignItems is set to SPACE_BETWEEN.'
      ),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const createText = createTool({
  id: 'create_text',
  description: 'Create a new text element in Figma',
  inputSchema: z.object({
    x: z.number().describe('X position'),
    y: z.number().describe('Y position'),
    text: z.string().describe('Text content'),
    fontSize: z.number().optional().describe('Font size (default: 14)'),
    fontWeight: z.number().optional().describe('Font weight (e.g., 400 for Regular, 700 for Bold)'),
    fontColor: z
      .object({
        r: z.number().min(0).max(1).describe('Red component (0-1)'),
        g: z.number().min(0).max(1).describe('Green component (0-1)'),
        b: z.number().min(0).max(1).describe('Blue component (0-1)'),
        a: z.number().min(0).max(1).optional().describe('Alpha component (0-1)'),
      })
      .optional()
      .describe('Font color in RGBA format'),
    name: z.string().optional().describe('Semantic layer name for the text node'),
    parentId: z.string().optional().describe('Optional parent node ID to append the text to'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const createComponentInstance = createTool({
  id: 'create_component_instance',
  description: 'Create an instance of a component in Figma',
  inputSchema: z.object({
    componentKey: z.string().describe('Key of the component to instantiate'),
    x: z.number().describe('X position'),
    y: z.number().describe('Y position'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const cloneNode = createTool({
  id: 'clone_node',
  description: 'Clone an existing node in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to clone'),
    x: z.number().optional().describe('New X position for the clone'),
    y: z.number().optional().describe('New Y position for the clone'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

// ============================================================================
// Modification Tools
// ============================================================================

export const setFillColor = createTool({
  id: 'set_fill_color',
  description: 'Set the fill color of a node in Figma can be TextNode or FrameNode',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to modify'),
    r: z.number().min(0).max(1).describe('Red component (0-1)'),
    g: z.number().min(0).max(1).describe('Green component (0-1)'),
    b: z.number().min(0).max(1).describe('Blue component (0-1)'),
    a: z.number().min(0).max(1).optional().describe('Alpha component (0-1)'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setStrokeColor = createTool({
  id: 'set_stroke_color',
  description: 'Set the stroke color of a node in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to modify'),
    r: z.number().min(0).max(1).describe('Red component (0-1)'),
    g: z.number().min(0).max(1).describe('Green component (0-1)'),
    b: z.number().min(0).max(1).describe('Blue component (0-1)'),
    a: z.number().min(0).max(1).optional().describe('Alpha component (0-1)'),
    weight: z.number().positive().optional().describe('Stroke weight'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const moveNode = createTool({
  id: 'move_node',
  description: 'Move a node to a new position in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to move'),
    x: z.number().describe('New X position'),
    y: z.number().describe('New Y position'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const resizeNode = createTool({
  id: 'resize_node',
  description: 'Resize a node in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to resize'),
    width: z.number().positive().describe('New width'),
    height: z.number().positive().describe('New height'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const deleteNode = createTool({
  id: 'delete_node',
  description: 'Delete a node from Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to delete'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const deleteMultipleNodes = createTool({
  id: 'delete_multiple_nodes',
  description: 'Delete multiple nodes from Figma at once',
  inputSchema: z.object({
    nodeIds: z.array(z.string()).describe('Array of node IDs to delete'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setTextContent = createTool({
  id: 'set_text_content',
  description: 'Set the text content of an existing text node in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the text node to modify'),
    text: z.string().describe('New text content'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setMultipleTextContents = createTool({
  id: 'set_multiple_text_contents',
  description: 'Set multiple text contents parallelly in a node',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node containing the text nodes to replace'),
    text: z
      .array(
        z.object({
          nodeId: z.string().describe('The ID of the text node'),
          text: z.string().describe('The replacement text'),
        })
      )
      .describe('Array of text node IDs and their replacement texts'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setCornerRadius = createTool({
  id: 'set_corner_radius',
  description: 'Set the corner radius of a node in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to modify'),
    radius: z.number().min(0).describe('Corner radius value'),
    corners: z
      .array(z.boolean())
      .length(4)
      .optional()
      .describe(
        'Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]'
      ),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setAnnotation = createTool({
  id: 'set_annotation',
  description: 'Create or update an annotation',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to annotate'),
    annotationId: z
      .string()
      .optional()
      .describe('The ID of the annotation to update (if updating existing annotation)'),
    labelMarkdown: z.string().describe('The annotation text in markdown format'),
    categoryId: z.string().optional().describe('The ID of the annotation category'),
    properties: z
      .array(
        z.object({
          type: z.string(),
        })
      )
      .optional()
      .describe('Additional properties for the annotation'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setMultipleAnnotations = createTool({
  id: 'set_multiple_annotations',
  description: 'Set multiple annotations parallelly in a node',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node containing the elements to annotate'),
    annotations: z
      .array(
        z.object({
          nodeId: z.string().describe('The ID of the node to annotate'),
          labelMarkdown: z.string().describe('The annotation text in markdown format'),
          categoryId: z.string().optional().describe('The ID of the annotation category'),
          annotationId: z
            .string()
            .optional()
            .describe('The ID of the annotation to update (if updating existing annotation)'),
          properties: z
            .array(
              z.object({
                type: z.string(),
              })
            )
            .optional()
            .describe('Additional properties for the annotation'),
        })
      )
      .describe('Array of annotations to apply'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setInstanceOverrides = createTool({
  id: 'set_instance_overrides',
  description:
    'Apply previously copied overrides to selected component instances. Target instances will be swapped to the source component and all copied override properties will be applied.',
  inputSchema: z.object({
    sourceInstanceId: z.string().describe('ID of the source component instance'),
    targetNodeIds: z
      .array(z.string())
      .describe('Array of target instance IDs. Currently selected instances will be used.'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

// ============================================================================
// Layout Tools
// ============================================================================

export const setLayoutMode = createTool({
  id: 'set_layout_mode',
  description: 'Set the layout mode and wrap behavior of a frame in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the frame to modify'),
    layoutMode: z.enum(['NONE', 'HORIZONTAL', 'VERTICAL']).describe('Layout mode for the frame'),
    layoutWrap: z
      .enum(['NO_WRAP', 'WRAP'])
      .optional()
      .describe('Whether the auto-layout frame wraps its children'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setPadding = createTool({
  id: 'set_padding',
  description: 'Set padding values for an auto-layout frame in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the frame to modify'),
    paddingTop: z.number().optional().describe('Top padding value'),
    paddingRight: z.number().optional().describe('Right padding value'),
    paddingBottom: z.number().optional().describe('Bottom padding value'),
    paddingLeft: z.number().optional().describe('Left padding value'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setAxisAlign = createTool({
  id: 'set_axis_align',
  description: 'Set primary and counter axis alignment for an auto-layout frame in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the frame to modify'),
    primaryAxisAlignItems: z
      .enum(['MIN', 'MAX', 'CENTER', 'SPACE_BETWEEN'])
      .optional()
      .describe(
        'Primary axis alignment (MIN/MAX = left/right in horizontal, top/bottom in vertical). Note: When set to SPACE_BETWEEN, itemSpacing will be ignored as children will be evenly spaced.'
      ),
    counterAxisAlignItems: z
      .enum(['MIN', 'MAX', 'CENTER', 'BASELINE'])
      .optional()
      .describe(
        'Counter axis alignment (MIN/MAX = top/bottom in horizontal, left/right in vertical)'
      ),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setLayoutSizing = createTool({
  id: 'set_layout_sizing',
  description: 'Set horizontal and vertical sizing modes for an auto-layout frame in Figma',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the frame to modify'),
    layoutSizingHorizontal: z
      .enum(['FIXED', 'HUG', 'FILL'])
      .optional()
      .describe(
        'Horizontal sizing mode (HUG for frames/text only, FILL for auto-layout children only)'
      ),
    layoutSizingVertical: z
      .enum(['FIXED', 'HUG', 'FILL'])
      .optional()
      .describe(
        'Vertical sizing mode (HUG for frames/text only, FILL for auto-layout children only)'
      ),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setItemSpacing = createTool({
  id: 'set_item_spacing',
  description: 'Set distance between children in an auto-layout frame',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the frame to modify'),
    itemSpacing: z
      .number()
      .optional()
      .describe(
        'Distance between children. Note: This value will be ignored if primaryAxisAlignItems is set to SPACE_BETWEEN.'
      ),
    counterAxisSpacing: z
      .number()
      .optional()
      .describe(
        'Distance between wrapped rows/columns. Only works when layoutWrap is set to WRAP.'
      ),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

// ============================================================================
// Connector Tools
// ============================================================================

export const setDefaultConnector = createTool({
  id: 'set_default_connector',
  description: 'Set a copied connector node as the default connector',
  inputSchema: z.object({
    connectorId: z.string().optional().describe('The ID of the connector node to set as default'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const createConnections = createTool({
  id: 'create_connections',
  description: 'Create connections between nodes using the default connector style',
  inputSchema: z.object({
    connections: z
      .array(
        z.object({
          startNodeId: z.string().describe('ID of the starting node'),
          endNodeId: z.string().describe('ID of the ending node'),
          text: z.string().optional().describe('Optional text to display on the connector'),
        })
      )
      .describe('Array of node connections to create'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

// ============================================================================
// Navigation / Selection Tools
// ============================================================================

export const setFocus = createTool({
  id: 'set_focus',
  description: 'Set focus on a specific node in Figma by selecting it and scrolling viewport to it',
  inputSchema: z.object({
    nodeId: z.string().describe('The ID of the node to focus on'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

export const setSelections = createTool({
  id: 'set_selections',
  description: 'Set selection to multiple nodes in Figma and scroll viewport to show them',
  inputSchema: z.object({
    nodeIds: z.array(z.string()).describe('Array of node IDs to select'),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

// ============================================================================
// System-level Tool (included for completeness)
// ============================================================================

export const joinChannel = createTool({
  id: 'join_channel',
  description: 'Join a specific channel to communicate with Figma',
  inputSchema: z.object({
    channel: z.string().describe('The name of the channel to join').default(''),
  }),
  execute: async () => {
    return { status: 'delegated_to_frontend' };
  },
});

// ============================================================================
// Combined export of all Figma tools
// ============================================================================

export const figmaTools = {
  get_document_info: getDocumentInfo,
  get_selection: getSelection,
  read_my_design: readMyDesign,
  get_node_info: getNodeInfo,
  get_nodes_info: getNodesInfo,
  get_styles: getStyles,
  get_local_components: getLocalComponents,
  get_annotations: getAnnotations,
  scan_text_nodes: scanTextNodes,
  scan_nodes_by_types: scanNodesByTypes,
  export_node_as_image: exportNodeAsImage,
  get_instance_overrides: getInstanceOverrides,
  get_reactions: getReactions,
  create_rectangle: createRectangle,
  create_frame: createFrame,
  create_text: createText,
  create_component_instance: createComponentInstance,
  clone_node: cloneNode,
  set_fill_color: setFillColor,
  set_stroke_color: setStrokeColor,
  move_node: moveNode,
  resize_node: resizeNode,
  delete_node: deleteNode,
  delete_multiple_nodes: deleteMultipleNodes,
  set_text_content: setTextContent,
  set_multiple_text_contents: setMultipleTextContents,
  set_corner_radius: setCornerRadius,
  set_annotation: setAnnotation,
  set_multiple_annotations: setMultipleAnnotations,
  set_instance_overrides: setInstanceOverrides,
  set_layout_mode: setLayoutMode,
  set_padding: setPadding,
  set_axis_align: setAxisAlign,
  set_layout_sizing: setLayoutSizing,
  set_item_spacing: setItemSpacing,
  set_default_connector: setDefaultConnector,
  create_connections: createConnections,
  set_focus: setFocus,
  set_selections: setSelections,
  join_channel: joinChannel,
};
