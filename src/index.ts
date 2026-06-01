import { Chat } from "./chat.js";
import { HttpCore } from "./client.js";
import type { VoltOptions } from "./client.js";
import { Embeddings } from "./embeddings.js";
import { Models } from "./models.js";

export { DEFAULT_BASE_URL } from "./client.js";
export type { VoltOptions } from "./client.js";
export * from "./errors.js";
export * from "./types.js";
export type { ChatCreateParams, ChatMessage } from "./chat.js";
export type { EmbeddingCreateParams } from "./embeddings.js";

/**
 * Volt client — OpenAI drop-in for Spark with first-class sovereign tier,
 * metro pinning, and pod affinity.
 *
 * ```ts
 * import { Volt } from "@thevoltcloud/sdk";
 * const client = new Volt({ apiKey: process.env.VOLT_API_KEY });
 * const resp = await client.chat.completions.create({
 *   model: "llama-3.3-70b-instruct",
 *   messages: [{ role: "user", content: "Explain CAP theorem" }],
 * });
 * console.log(resp.choices[0].message.content);
 * ```
 */
export class Volt {
  readonly chat: Chat;
  readonly embeddings: Embeddings;
  readonly models: Models;

  constructor(options: VoltOptions = {}) {
    const core = new HttpCore(options);
    this.chat = new Chat(core);
    this.embeddings = new Embeddings(core);
    this.models = new Models(core);
  }
}
