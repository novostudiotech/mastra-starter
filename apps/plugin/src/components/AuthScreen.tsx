import React from "react";

interface AuthScreenProps {
  onAuth: (jwt: string) => void;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2>Figma Design Agent</h2>
      <p>Please sign in to continue</p>
      <button onClick={() => onAuth("dev-token")}>
        Sign in (dev mode)
      </button>
    </div>
  );
}
