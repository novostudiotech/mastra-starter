import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/dist/index.css";
import { sendToFigma, initBridge } from "./bridge/sendToFigma";
import { useFigmaSelection } from "./hooks/useFigmaSelection";
import { FigmaToolsProvider } from "./components/FigmaToolsProvider";

initBridge();

function SelectionProvider() {
  useFigmaSelection();
  return null;
}

function App() {
  return (
    <CopilotKit
      runtimeUrl={(process.env.API_URL || "https://extensive-gaby-jkchv.novps.app") + "/api/copilotkit"}
      agent="designer"
      useSingleEndpoint
    >
      <SelectionProvider />
      <FigmaToolsProvider />
      <CopilotChat
        className="copilotKitChat"
        labels={{ title: "Figma Agent", placeholder: "What should I create?" }}
      />
    </CopilotKit>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);

export default App;
