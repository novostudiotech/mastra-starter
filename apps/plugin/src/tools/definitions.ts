import { sendToFigma } from "../bridge/sendToFigma";

export type ToolParameter = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "string[]" | "object[]";
  description: string;
  required: boolean;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: ToolParameter[];
  handler: (params: Record<string, any>) => Promise<any>;
};

function makeHandler(name: string) {
  return async (params: Record<string, any>) => {
    return await sendToFigma(name, params);
  };
}

export const toolDefinitions: ToolDefinition[] = [
  // ========================================================================
  // Read-only / Inspection Tools
  // ========================================================================
  {
    name: "get_document_info",
    description: "Get detailed information about the current Figma document",
    parameters: [],
    handler: makeHandler("get_document_info"),
  },
  {
    name: "get_selection",
    description: "Get information about the current selection in Figma",
    parameters: [],
    handler: makeHandler("get_selection"),
  },
  {
    name: "read_my_design",
    description:
      "Get detailed information about the current selection in Figma, including all node details",
    parameters: [],
    handler: makeHandler("read_my_design"),
  },
  {
    name: "get_node_info",
    description: "Get detailed information about a specific node in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to get information about",
        required: true,
      },
    ],
    handler: makeHandler("get_node_info"),
  },
  {
    name: "get_nodes_info",
    description: "Get detailed information about multiple nodes in Figma",
    parameters: [
      {
        name: "nodeIds",
        type: "string[]",
        description: "Array of node IDs to get information about",
        required: true,
      },
    ],
    handler: makeHandler("get_nodes_info"),
  },
  {
    name: "get_styles",
    description: "Get all styles from the current Figma document",
    parameters: [],
    handler: makeHandler("get_styles"),
  },
  {
    name: "get_local_components",
    description: "Get all local components from the Figma document",
    parameters: [],
    handler: makeHandler("get_local_components"),
  },
  {
    name: "get_annotations",
    description:
      "Get all annotations in the current document or specific node",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "node ID to get annotations for specific node",
        required: true,
      },
      {
        name: "includeCategories",
        type: "boolean",
        description: "Whether to include category information",
        required: false,
      },
    ],
    handler: makeHandler("get_annotations"),
  },
  {
    name: "scan_text_nodes",
    description: "Scan all text nodes in the selected Figma node",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "ID of the node to scan",
        required: true,
      },
    ],
    handler: makeHandler("scan_text_nodes"),
  },
  {
    name: "scan_nodes_by_types",
    description:
      "Scan for child nodes with specific types in the selected Figma node",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "ID of the node to scan",
        required: true,
      },
      {
        name: "types",
        type: "string[]",
        description:
          "Array of node types to find in the child nodes (e.g. ['COMPONENT', 'FRAME'])",
        required: true,
      },
    ],
    handler: makeHandler("scan_nodes_by_types"),
  },
  {
    name: "export_node_as_image",
    description: "Export a node as an image from Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to export",
        required: true,
      },
      {
        name: "format",
        type: "string",
        description: "Export format (PNG, JPG, SVG, PDF)",
        required: false,
      },
      {
        name: "scale",
        type: "number",
        description: "Export scale",
        required: false,
      },
    ],
    handler: makeHandler("export_node_as_image"),
  },
  {
    name: "get_instance_overrides",
    description:
      "Get all override properties from a selected component instance. These overrides can be applied to other instances, which will swap them to match the source component.",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description:
          "Optional ID of the component instance to get overrides from. If not provided, currently selected instance will be used.",
        required: false,
      },
    ],
    handler: makeHandler("get_instance_overrides"),
  },
  {
    name: "get_reactions",
    description:
      "Get Figma Prototyping Reactions from multiple nodes. CRITICAL: The output MUST be processed using the 'reaction_to_connector_strategy' prompt IMMEDIATELY to generate parameters for connector lines via the 'create_connections' tool.",
    parameters: [
      {
        name: "nodeIds",
        type: "string[]",
        description: "Array of node IDs to get reactions from",
        required: true,
      },
    ],
    handler: makeHandler("get_reactions"),
  },

  // ========================================================================
  // Creation Tools
  // ========================================================================
  {
    name: "create_rectangle",
    description: "Create a new rectangle in Figma",
    parameters: [
      {
        name: "x",
        type: "number",
        description: "X position",
        required: true,
      },
      {
        name: "y",
        type: "number",
        description: "Y position",
        required: true,
      },
      {
        name: "width",
        type: "number",
        description: "Width of the rectangle",
        required: true,
      },
      {
        name: "height",
        type: "number",
        description: "Height of the rectangle",
        required: true,
      },
      {
        name: "name",
        type: "string",
        description: "Optional name for the rectangle",
        required: false,
      },
      {
        name: "parentId",
        type: "string",
        description: "Optional parent node ID to append the rectangle to",
        required: false,
      },
    ],
    handler: makeHandler("create_rectangle"),
  },
  {
    name: "create_frame",
    description: "Create a new frame in Figma",
    parameters: [
      {
        name: "x",
        type: "number",
        description: "X position",
        required: true,
      },
      {
        name: "y",
        type: "number",
        description: "Y position",
        required: true,
      },
      {
        name: "width",
        type: "number",
        description: "Width of the frame",
        required: true,
      },
      {
        name: "height",
        type: "number",
        description: "Height of the frame",
        required: true,
      },
      {
        name: "name",
        type: "string",
        description: "Optional name for the frame",
        required: false,
      },
      {
        name: "parentId",
        type: "string",
        description: "Optional parent node ID to append the frame to",
        required: false,
      },
      {
        name: "fillColor",
        type: "object",
        description: "Fill color in RGBA format (r, g, b: 0-1, optional a: 0-1)",
        required: false,
      },
      {
        name: "strokeColor",
        type: "object",
        description:
          "Stroke color in RGBA format (r, g, b: 0-1, optional a: 0-1)",
        required: false,
      },
      {
        name: "strokeWeight",
        type: "number",
        description: "Stroke weight",
        required: false,
      },
      {
        name: "layoutMode",
        type: "string",
        description: "Auto-layout mode for the frame (NONE, HORIZONTAL, VERTICAL)",
        required: false,
      },
      {
        name: "layoutWrap",
        type: "string",
        description:
          "Whether the auto-layout frame wraps its children (NO_WRAP, WRAP)",
        required: false,
      },
      {
        name: "paddingTop",
        type: "number",
        description: "Top padding for auto-layout frame",
        required: false,
      },
      {
        name: "paddingRight",
        type: "number",
        description: "Right padding for auto-layout frame",
        required: false,
      },
      {
        name: "paddingBottom",
        type: "number",
        description: "Bottom padding for auto-layout frame",
        required: false,
      },
      {
        name: "paddingLeft",
        type: "number",
        description: "Left padding for auto-layout frame",
        required: false,
      },
      {
        name: "primaryAxisAlignItems",
        type: "string",
        description:
          "Primary axis alignment for auto-layout frame (MIN, MAX, CENTER, SPACE_BETWEEN). Note: When set to SPACE_BETWEEN, itemSpacing will be ignored as children will be evenly spaced.",
        required: false,
      },
      {
        name: "counterAxisAlignItems",
        type: "string",
        description:
          "Counter axis alignment for auto-layout frame (MIN, MAX, CENTER, BASELINE)",
        required: false,
      },
      {
        name: "layoutSizingHorizontal",
        type: "string",
        description: "Horizontal sizing mode for auto-layout frame (FIXED, HUG, FILL)",
        required: false,
      },
      {
        name: "layoutSizingVertical",
        type: "string",
        description: "Vertical sizing mode for auto-layout frame (FIXED, HUG, FILL)",
        required: false,
      },
      {
        name: "itemSpacing",
        type: "number",
        description:
          "Distance between children in auto-layout frame. Note: This value will be ignored if primaryAxisAlignItems is set to SPACE_BETWEEN.",
        required: false,
      },
    ],
    handler: makeHandler("create_frame"),
  },
  {
    name: "create_text",
    description: "Create a new text element in Figma",
    parameters: [
      {
        name: "x",
        type: "number",
        description: "X position",
        required: true,
      },
      {
        name: "y",
        type: "number",
        description: "Y position",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Text content",
        required: true,
      },
      {
        name: "fontSize",
        type: "number",
        description: "Font size (default: 14)",
        required: false,
      },
      {
        name: "fontWeight",
        type: "number",
        description: "Font weight (e.g., 400 for Regular, 700 for Bold)",
        required: false,
      },
      {
        name: "fontColor",
        type: "object",
        description: "Font color in RGBA format (r, g, b: 0-1, optional a: 0-1)",
        required: false,
      },
      {
        name: "name",
        type: "string",
        description: "Semantic layer name for the text node",
        required: false,
      },
      {
        name: "parentId",
        type: "string",
        description: "Optional parent node ID to append the text to",
        required: false,
      },
    ],
    handler: makeHandler("create_text"),
  },
  {
    name: "create_component_instance",
    description: "Create an instance of a component in Figma",
    parameters: [
      {
        name: "componentKey",
        type: "string",
        description: "Key of the component to instantiate",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description: "X position",
        required: true,
      },
      {
        name: "y",
        type: "number",
        description: "Y position",
        required: true,
      },
    ],
    handler: makeHandler("create_component_instance"),
  },
  {
    name: "clone_node",
    description: "Clone an existing node in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to clone",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description: "New X position for the clone",
        required: false,
      },
      {
        name: "y",
        type: "number",
        description: "New Y position for the clone",
        required: false,
      },
    ],
    handler: makeHandler("clone_node"),
  },

  // ========================================================================
  // Modification Tools
  // ========================================================================
  {
    name: "set_fill_color",
    description:
      "Set the fill color of a node in Figma can be TextNode or FrameNode",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to modify",
        required: true,
      },
      {
        name: "r",
        type: "number",
        description: "Red component (0-1)",
        required: true,
      },
      {
        name: "g",
        type: "number",
        description: "Green component (0-1)",
        required: true,
      },
      {
        name: "b",
        type: "number",
        description: "Blue component (0-1)",
        required: true,
      },
      {
        name: "a",
        type: "number",
        description: "Alpha component (0-1)",
        required: false,
      },
    ],
    handler: makeHandler("set_fill_color"),
  },
  {
    name: "set_stroke_color",
    description: "Set the stroke color of a node in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to modify",
        required: true,
      },
      {
        name: "r",
        type: "number",
        description: "Red component (0-1)",
        required: true,
      },
      {
        name: "g",
        type: "number",
        description: "Green component (0-1)",
        required: true,
      },
      {
        name: "b",
        type: "number",
        description: "Blue component (0-1)",
        required: true,
      },
      {
        name: "a",
        type: "number",
        description: "Alpha component (0-1)",
        required: false,
      },
      {
        name: "weight",
        type: "number",
        description: "Stroke weight",
        required: false,
      },
    ],
    handler: makeHandler("set_stroke_color"),
  },
  {
    name: "move_node",
    description: "Move a node to a new position in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to move",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description: "New X position",
        required: true,
      },
      {
        name: "y",
        type: "number",
        description: "New Y position",
        required: true,
      },
    ],
    handler: makeHandler("move_node"),
  },
  {
    name: "resize_node",
    description: "Resize a node in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to resize",
        required: true,
      },
      {
        name: "width",
        type: "number",
        description: "New width",
        required: true,
      },
      {
        name: "height",
        type: "number",
        description: "New height",
        required: true,
      },
    ],
    handler: makeHandler("resize_node"),
  },
  {
    name: "delete_node",
    description: "Delete a node from Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to delete",
        required: true,
      },
    ],
    handler: makeHandler("delete_node"),
  },
  {
    name: "delete_multiple_nodes",
    description: "Delete multiple nodes from Figma at once",
    parameters: [
      {
        name: "nodeIds",
        type: "string[]",
        description: "Array of node IDs to delete",
        required: true,
      },
    ],
    handler: makeHandler("delete_multiple_nodes"),
  },
  {
    name: "set_text_content",
    description: "Set the text content of an existing text node in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the text node to modify",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "New text content",
        required: true,
      },
    ],
    handler: makeHandler("set_text_content"),
  },
  {
    name: "set_multiple_text_contents",
    description: "Set multiple text contents parallelly in a node",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description:
          "The ID of the node containing the text nodes to replace",
        required: true,
      },
      {
        name: "text",
        type: "object[]",
        description:
          "Array of text node IDs and their replacement texts. Each object has nodeId (string) and text (string).",
        required: true,
      },
    ],
    handler: makeHandler("set_multiple_text_contents"),
  },
  {
    name: "set_corner_radius",
    description: "Set the corner radius of a node in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to modify",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description: "Corner radius value",
        required: true,
      },
      {
        name: "corners",
        type: "object",
        description:
          "Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]",
        required: false,
      },
    ],
    handler: makeHandler("set_corner_radius"),
  },
  {
    name: "set_annotation",
    description: "Create or update an annotation",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to annotate",
        required: true,
      },
      {
        name: "annotationId",
        type: "string",
        description:
          "The ID of the annotation to update (if updating existing annotation)",
        required: false,
      },
      {
        name: "labelMarkdown",
        type: "string",
        description: "The annotation text in markdown format",
        required: true,
      },
      {
        name: "categoryId",
        type: "string",
        description: "The ID of the annotation category",
        required: false,
      },
      {
        name: "properties",
        type: "object[]",
        description: "Additional properties for the annotation. Each object has a type (string).",
        required: false,
      },
    ],
    handler: makeHandler("set_annotation"),
  },
  {
    name: "set_multiple_annotations",
    description: "Set multiple annotations parallelly in a node",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description:
          "The ID of the node containing the elements to annotate",
        required: true,
      },
      {
        name: "annotations",
        type: "object[]",
        description:
          "Array of annotations to apply. Each object has nodeId (string, required), labelMarkdown (string, required), categoryId (string, optional), annotationId (string, optional), properties (array of {type: string}, optional).",
        required: true,
      },
    ],
    handler: makeHandler("set_multiple_annotations"),
  },
  {
    name: "set_instance_overrides",
    description:
      "Apply previously copied overrides to selected component instances. Target instances will be swapped to the source component and all copied override properties will be applied.",
    parameters: [
      {
        name: "sourceInstanceId",
        type: "string",
        description: "ID of the source component instance",
        required: true,
      },
      {
        name: "targetNodeIds",
        type: "string[]",
        description:
          "Array of target instance IDs. Currently selected instances will be used.",
        required: true,
      },
    ],
    handler: makeHandler("set_instance_overrides"),
  },

  // ========================================================================
  // Layout Tools
  // ========================================================================
  {
    name: "set_layout_mode",
    description:
      "Set the layout mode and wrap behavior of a frame in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the frame to modify",
        required: true,
      },
      {
        name: "layoutMode",
        type: "string",
        description: "Layout mode for the frame (NONE, HORIZONTAL, VERTICAL)",
        required: true,
      },
      {
        name: "layoutWrap",
        type: "string",
        description:
          "Whether the auto-layout frame wraps its children (NO_WRAP, WRAP)",
        required: false,
      },
    ],
    handler: makeHandler("set_layout_mode"),
  },
  {
    name: "set_padding",
    description: "Set padding values for an auto-layout frame in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the frame to modify",
        required: true,
      },
      {
        name: "paddingTop",
        type: "number",
        description: "Top padding value",
        required: false,
      },
      {
        name: "paddingRight",
        type: "number",
        description: "Right padding value",
        required: false,
      },
      {
        name: "paddingBottom",
        type: "number",
        description: "Bottom padding value",
        required: false,
      },
      {
        name: "paddingLeft",
        type: "number",
        description: "Left padding value",
        required: false,
      },
    ],
    handler: makeHandler("set_padding"),
  },
  {
    name: "set_axis_align",
    description:
      "Set primary and counter axis alignment for an auto-layout frame in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the frame to modify",
        required: true,
      },
      {
        name: "primaryAxisAlignItems",
        type: "string",
        description:
          "Primary axis alignment (MIN, MAX, CENTER, SPACE_BETWEEN). Note: When set to SPACE_BETWEEN, itemSpacing will be ignored as children will be evenly spaced.",
        required: false,
      },
      {
        name: "counterAxisAlignItems",
        type: "string",
        description:
          "Counter axis alignment (MIN, MAX, CENTER, BASELINE)",
        required: false,
      },
    ],
    handler: makeHandler("set_axis_align"),
  },
  {
    name: "set_layout_sizing",
    description:
      "Set horizontal and vertical sizing modes for an auto-layout frame in Figma",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the frame to modify",
        required: true,
      },
      {
        name: "layoutSizingHorizontal",
        type: "string",
        description:
          "Horizontal sizing mode (FIXED, HUG, FILL). HUG for frames/text only, FILL for auto-layout children only.",
        required: false,
      },
      {
        name: "layoutSizingVertical",
        type: "string",
        description:
          "Vertical sizing mode (FIXED, HUG, FILL). HUG for frames/text only, FILL for auto-layout children only.",
        required: false,
      },
    ],
    handler: makeHandler("set_layout_sizing"),
  },
  {
    name: "set_item_spacing",
    description: "Set distance between children in an auto-layout frame",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the frame to modify",
        required: true,
      },
      {
        name: "itemSpacing",
        type: "number",
        description:
          "Distance between children. Note: This value will be ignored if primaryAxisAlignItems is set to SPACE_BETWEEN.",
        required: false,
      },
      {
        name: "counterAxisSpacing",
        type: "number",
        description:
          "Distance between wrapped rows/columns. Only works when layoutWrap is set to WRAP.",
        required: false,
      },
    ],
    handler: makeHandler("set_item_spacing"),
  },

  // ========================================================================
  // Connector Tools
  // ========================================================================
  {
    name: "set_default_connector",
    description: "Set a copied connector node as the default connector",
    parameters: [
      {
        name: "connectorId",
        type: "string",
        description: "The ID of the connector node to set as default",
        required: false,
      },
    ],
    handler: makeHandler("set_default_connector"),
  },
  {
    name: "create_connections",
    description:
      "Create connections between nodes using the default connector style",
    parameters: [
      {
        name: "connections",
        type: "object[]",
        description:
          "Array of node connections to create. Each object has startNodeId (string), endNodeId (string), and optional text (string).",
        required: true,
      },
    ],
    handler: makeHandler("create_connections"),
  },

  // ========================================================================
  // Navigation / Selection Tools
  // ========================================================================
  {
    name: "set_focus",
    description:
      "Set focus on a specific node in Figma by selecting it and scrolling viewport to it",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to focus on",
        required: true,
      },
    ],
    handler: makeHandler("set_focus"),
  },
  {
    name: "set_selections",
    description:
      "Set selection to multiple nodes in Figma and scroll viewport to show them",
    parameters: [
      {
        name: "nodeIds",
        type: "string[]",
        description: "Array of node IDs to select",
        required: true,
      },
    ],
    handler: makeHandler("set_selections"),
  },

  // ========================================================================
  // System-level Tool
  // ========================================================================
  {
    name: "join_channel",
    description: "Join a specific channel to communicate with Figma",
    parameters: [
      {
        name: "channel",
        type: "string",
        description: "The name of the channel to join",
        required: true,
      },
    ],
    handler: makeHandler("join_channel"),
  },
];
