import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useCopilotAction } from "@copilotkit/react-core";

function DelegatedTools() {
  useCopilotAction({
    name: "get_current_time",
    description: "Get the current time",
    parameters: [],
    handler: async () => {
      const time = new Date().toISOString();
      return { time };
    },
  });

  useCopilotAction({
    name: "create_note",
    description: "Create a new note",
    parameters: [
      { name: "title", type: "string", description: "Note title", required: true },
      { name: "content", type: "string", description: "Note content", required: true },
    ],
    handler: async ({ title, content }: { title: string; content: string }) => {
      const notes = JSON.parse(localStorage.getItem("notes") ?? "[]") as Array<{
        title: string;
        content: string;
        createdAt: string;
      }>;
      const note = { title, content, createdAt: new Date().toISOString() };
      notes.push(note);
      localStorage.setItem("notes", JSON.stringify(notes));
      return { success: true, note };
    },
  });

  useCopilotAction({
    name: "get_notes",
    description: "Get all saved notes",
    parameters: [],
    handler: async () => {
      const notes = JSON.parse(localStorage.getItem("notes") ?? "[]") as Array<{
        title: string;
        content: string;
        createdAt: string;
      }>;
      return { notes, count: notes.length };
    },
  });

  return null;
}

export function App() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <DelegatedTools />
      <div className="app">
        <header className="header">
          <h1>Mastra Starter</h1>
          <p>AI assistant with delegated tools</p>
        </header>
        <main className="chat-container">
          <CopilotChat
            labels={{
              title: "AI Assistant",
              initial: "Hi! I can help you manage notes and tell you the current time. Try asking me something!",
            }}
          />
        </main>
      </div>
    </CopilotKit>
  );
}
