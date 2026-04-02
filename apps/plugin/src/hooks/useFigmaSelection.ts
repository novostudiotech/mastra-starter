import { useState, useEffect } from "react";
import { useCopilotReadable } from "@copilotkit/react-core";

export function useFigmaSelection() {
  const [selectedNodes, setSelectedNodes] = useState<any[]>([]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (msg?.type === "SELECTION_CHANGED") setSelectedNodes(msg.nodes);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useCopilotReadable({
    description: "Currently selected Figma elements with their properties",
    value: selectedNodes,
  });

  return selectedNodes;
}
