import { StreamInterrupted } from "./errors.js";
import type { ChatCompletionChunk } from "./types.js";

/** Async iterator over SSE chat-completion chunks. */
export async function* parseChatStream(resp: Response): AsyncGenerator<ChatCompletionChunk> {
  const body = resp.body;
  if (!body) throw new StreamInterrupted("no response body", { hint: "retry" });
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const event = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        const yielded = handleEvent(event);
        if (yielded === "done") return;
        if (yielded) yield yielded;
      }
    }
  } catch (e) {
    throw new StreamInterrupted("stream disconnected", { hint: "retry; SDK can resume if stream_id is known" });
  } finally {
    reader.releaseLock();
  }
}

function handleEvent(event: string): ChatCompletionChunk | "done" | null {
  if (!event.startsWith("data:")) return null;
  const payload = event.slice("data:".length).trim();
  if (payload === "[DONE]") return "done";
  try {
    return JSON.parse(payload) as ChatCompletionChunk;
  } catch {
    throw new StreamInterrupted("malformed SSE chunk", { hint: "reconnect or re-issue" });
  }
}
