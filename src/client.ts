import { SovereigntyViolation, StreamInterrupted, VoltError, fromStatus } from "./errors.js";
import type { VoltMeta } from "./types.js";

export const DEFAULT_BASE_URL = "https://api.voltcloud.ai";

export type FetchLike = typeof fetch;

export interface VoltOptions {
  apiKey?: string;
  baseURL?: string;
  sovereign?: boolean;
  pinnedMetro?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Inject a fetch implementation (tests). Defaults to global fetch. */
  fetch?: FetchLike;
}

export interface RequestOptions {
  maxRetries?: number;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Core transport: auth, bounded retries, and client-side sovereignty enforcement. */
export class HttpCore {
  readonly baseURL: string;
  readonly sovereign: boolean;
  readonly pinnedMetro?: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: FetchLike;

  constructor(opts: VoltOptions) {
    const apiKey = opts.apiKey ?? globalThis.process?.env?.VOLT_API_KEY ?? "";
    if (!apiKey) {
      throw new VoltError("no API key provided", {
        status: 401,
        hint: "pass apiKey or set VOLT_API_KEY",
      });
    }
    this.apiKey = apiKey;
    this.baseURL = (opts.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.sovereign = opts.sovereign ?? false;
    this.pinnedMetro = opts.pinnedMetro;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.maxRetries = opts.maxRetries ?? 3;
    this.fetchImpl = opts.fetch ?? fetch;
  }

  prepareBody(body: Record<string, unknown>): Record<string, unknown> {
    const out = { ...body };
    if (this.sovereign && out.volt_tier === undefined) out.volt_tier = "sovereign";
    if (this.pinnedMetro && out.volt_metro === undefined) out.volt_metro = this.pinnedMetro;
    return out;
  }

  enforceSovereignty(meta: VoltMeta): void {
    if (this.sovereign && meta.tier !== "sovereign") {
      throw new SovereigntyViolation(
        `expected sovereign tier, response came from tier=${String(meta.tier)}`,
        { status: 403, podId: meta.podId, hint: "response withheld from caller" },
      );
    }
    if (this.pinnedMetro && meta.metro !== this.pinnedMetro) {
      throw new SovereigntyViolation(
        `expected metro ${this.pinnedMetro}, response came from ${String(meta.metro)}`,
        { status: 403, podId: meta.podId, hint: "response withheld from caller" },
      );
    }
  }

  async requestJson<T = unknown>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    opts: RequestOptions = {},
  ): Promise<T> {
    const resp = await this.send(method, path, body, opts);
    return (await resp.json()) as T;
  }

  async stream(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    opts: RequestOptions = {},
  ): Promise<Response> {
    return this.send(method, path, body, opts);
  }

  private async send(
    method: string,
    path: string,
    body: Record<string, unknown> | undefined,
    opts: RequestOptions,
  ): Promise<Response> {
    const retries = opts.maxRetries ?? this.maxRetries;
    let attempt = 0;
    let backoff = 250;

    for (;;) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
      let resp: Response;
      try {
        resp = await this.fetchImpl(this.baseURL + path, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: "application/json",
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: ctl.signal,
        });
      } catch (e) {
        if (attempt < retries) {
          attempt++;
          await sleep(backoff);
          backoff *= 2;
          continue;
        }
        throw new StreamInterrupted("network error", { hint: "check connectivity" });
      } finally {
        clearTimeout(timer);
      }

      if (resp.ok) return resp;

      if (resp.status === 429 && attempt < retries) {
        attempt++;
        await sleep(parseRetryAfter(resp.headers.get("Retry-After")));
        continue;
      }
      if (resp.status === 503 && attempt < retries) {
        attempt++;
        await sleep(backoff);
        backoff *= 2;
        continue;
      }
      throw await errorFrom(resp);
    }
  }
}

function parseRetryAfter(value: string | null): number {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.max(0, n) * 1000 : 1000;
}

async function errorFrom(resp: Response): Promise<VoltError> {
  let message = `HTTP ${resp.status}`;
  let code: string | undefined;
  let requestId = resp.headers.get("x-request-id") ?? undefined;
  let podId = resp.headers.get("x-volt-pod-id") ?? undefined;
  try {
    const data = (await resp.json()) as Record<string, unknown>;
    const err = (data.error as Record<string, unknown>) ?? data;
    message = (err.message as string) ?? message;
    code = err.code as string | undefined;
    requestId = (err.request_id as string) ?? requestId;
    podId = (err.pod_id as string) ?? podId;
  } catch {
    // body may not be JSON
  }
  if (code === "sovereignty_violation") {
    return new SovereigntyViolation(message, { status: resp.status, requestId, podId });
  }
  return fromStatus(resp.status, message, { requestId, podId });
}
