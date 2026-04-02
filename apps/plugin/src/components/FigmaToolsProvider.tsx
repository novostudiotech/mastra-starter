import { useCopilotAction } from "@copilotkit/react-core";
import { toolDefinitions } from "../tools/definitions";

function useFigmaTools() {
  for (const tool of toolDefinitions) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useCopilotAction({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters.map((p) => ({
        name: p.name,
        type: p.type as any,
        description: p.description,
        required: p.required,
      })),
      handler: tool.handler,
    });
  }
}

export function FigmaToolsProvider() {
  useFigmaTools();
  return null;
}
