/** Response types for the Volt SDK. */

export interface VoltMeta {
  podId?: string;
  metro?: string;
  tier?: string;
  ttftMs?: number;
  tps?: number;
}

export interface Message {
  role: string;
  content: string;
}

export interface Choice {
  index: number;
  message: Message;
  finishReason?: string;
}

export interface ChatCompletion {
  id: string;
  model: string;
  choices: Choice[];
  volt: VoltMeta;
}

export interface Delta {
  content: string;
}

export interface ChunkChoice {
  index: number;
  delta: Delta;
}

export interface ChatCompletionChunk {
  id: string;
  model: string;
  choices: ChunkChoice[];
}

export interface Embedding {
  index: number;
  embedding: number[];
}

export interface EmbeddingResponse {
  model: string;
  data: Embedding[];
  volt: VoltMeta;
}

export interface Model {
  id: string;
  ownedBy?: string;
  catalog?: string;
}

/** Parse the Volt extension block from a raw response object. */
export function parseVoltMeta(raw: Record<string, unknown> | undefined): VoltMeta {
  const v = (raw ?? {}) as Record<string, unknown>;
  return {
    podId: v.pod_id as string | undefined,
    metro: v.metro as string | undefined,
    tier: v.tier as string | undefined,
    ttftMs: v.ttft_ms as number | undefined,
    tps: v.tps as number | undefined,
  };
}
