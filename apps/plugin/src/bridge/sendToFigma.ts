type PendingCall = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const pendingCalls = new Map<string, PendingCall>();
let callCounter = 0;

export function sendToFigma(
  command: string,
  params: Record<string, any> = {},
  timeoutMs = 30_000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const callId = `call_${++callCounter}_${Date.now()}`;
    const timeout = setTimeout(() => {
      pendingCalls.delete(callId);
      reject(new Error(`Timeout: ${command} (${callId}) after ${timeoutMs}ms`));
    }, timeoutMs);
    pendingCalls.set(callId, { resolve, reject, timeout });
    parent.postMessage({ pluginMessage: { callId, command, params } }, "*");
  });
}

export function initBridge() {
  window.addEventListener("message", (event) => {
    const msg = event.data?.pluginMessage;
    if (!msg?.callId) return;
    const pending = pendingCalls.get(msg.callId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    pendingCalls.delete(msg.callId);
    if (msg.error) pending.reject(new Error(msg.error));
    else pending.resolve(msg.result);
  });
}
