import type { HttpCore } from "./client.js";
import type { Embedding, EmbeddingResponse } from "./types.js";
import { parseVoltMeta } from "./types.js";

export interface EmbeddingCreateParams {
  model: string;
  input: string | string[];
  maxRetries?: number;
  [key: string]: unknown;
}

export class Embeddings {
  constructor(private readonly core: HttpCore) {}

  async create(params: EmbeddingCreateParams): Promise<EmbeddingResponse> {
    const { maxRetries, ...rest } = params;
    const body = this.core.prepareBody({ ...rest });
    const raw = await this.core.requestJson<Record<string, unknown>>("POST", "/v1/embeddings", body, { maxRetries });
    const dataRaw = (raw.data as Array<Record<string, unknown>>) ?? [];
    const data: Embedding[] = dataRaw.map((e, i) => ({
      index: (e.index as number) ?? i,
      embedding: (e.embedding as number[]) ?? [],
    }));
    const resp: EmbeddingResponse = {
      model: (raw.model as string) ?? "",
      data,
      volt: parseVoltMeta(raw.volt as Record<string, unknown>),
    };
    this.core.enforceSovereignty(resp.volt);
    return resp;
  }
}
