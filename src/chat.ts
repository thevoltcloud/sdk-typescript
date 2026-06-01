import type { HttpCore } from "./client.js";
import { parseChatStream } from "./streaming.js";
import type { ChatCompletion, ChatCompletionChunk, Choice } from "./types.js";
import { parseVoltMeta } from "./types.js";

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatCreateParams {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  maxRetries?: number;
  /** Volt extensions (pod_affinity, volt_tier, volt_metro, ...) pass through. */
  [key: string]: unknown;
}

export class Completions {
  constructor(private readonly core: HttpCore) {}

  create(params: ChatCreateParams & { stream: true }): Promise<AsyncGenerator<ChatCompletionChunk>>;
  create(params: ChatCreateParams & { stream?: false }): Promise<ChatCompletion>;
  async create(params: ChatCreateParams): Promise<ChatCompletion | AsyncGenerator<ChatCompletionChunk>> {
    const { stream, maxRetries, ...rest } = params;
    const body = this.core.prepareBody({ ...rest, stream: Boolean(stream) });
    if (stream) {
      const resp = await this.core.stream("POST", "/v1/chat/completions", body, { maxRetries });
      return parseChatStream(resp);
    }
    const raw = await this.core.requestJson<Record<string, unknown>>("POST", "/v1/chat/completions", body, {
      maxRetries,
    });
    const completion = toChatCompletion(raw);
    this.core.enforceSovereignty(completion.volt);
    return completion;
  }
}

export class Chat {
  readonly completions: Completions;
  constructor(core: HttpCore) {
    this.completions = new Completions(core);
  }
}

function toChatCompletion(raw: Record<string, unknown>): ChatCompletion {
  const choicesRaw = (raw.choices as Array<Record<string, unknown>>) ?? [];
  const choices: Choice[] = choicesRaw.map((c, i) => {
    const msg = (c.message as Record<string, unknown>) ?? {};
    return {
      index: (c.index as number) ?? i,
      message: { role: (msg.role as string) ?? "", content: (msg.content as string) ?? "" },
      finishReason: c.finish_reason as string | undefined,
    };
  });
  return {
    id: (raw.id as string) ?? "",
    model: (raw.model as string) ?? "",
    choices,
    volt: parseVoltMeta(raw.volt as Record<string, unknown>),
  };
}
