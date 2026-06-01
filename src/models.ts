import type { HttpCore } from "./client.js";
import type { Model } from "./types.js";

function toModel(raw: Record<string, unknown>): Model {
  return {
    id: (raw.id as string) ?? "",
    ownedBy: raw.owned_by as string | undefined,
    catalog: raw.catalog as string | undefined,
  };
}

export class Models {
  constructor(private readonly core: HttpCore) {}

  async list(): Promise<Model[]> {
    const raw = await this.core.requestJson<Record<string, unknown>>("GET", "/v1/models");
    const data = (raw.data as Array<Record<string, unknown>>) ?? [];
    return data.map(toModel);
  }

  async retrieve(modelId: string): Promise<Model> {
    const raw = await this.core.requestJson<Record<string, unknown>>("GET", `/v1/models/${modelId}`);
    return toModel(raw);
  }
}
