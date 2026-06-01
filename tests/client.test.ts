import { describe, expect, it } from "vitest";
import { QuotaExceeded, SovereigntyViolation, Volt } from "../src/index.js";
import type { FetchLike } from "../src/client.js";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function clientWith(fetchImpl: FetchLike, extra: Record<string, unknown> = {}): Volt {
  return new Volt({ apiKey: "volt_sk_test", baseURL: "https://api.test", fetch: fetchImpl, ...extra });
}

describe("chat", () => {
  it("returns a completion with volt meta", async () => {
    const client = clientWith(async () =>
      jsonResponse({
        id: "cmpl-1",
        model: "llama-3.3-70b-instruct",
        choices: [{ index: 0, message: { role: "assistant", content: "CAP says pick two." }, finish_reason: "stop" }],
        volt: { pod_id: "pod-iad-001", metro: "us-east-iad", tier: "sovereign", ttft_ms: 180 },
      }),
    );
    const resp = await client.chat.completions.create({
      model: "llama-3.3-70b-instruct",
      messages: [{ role: "user", content: "Explain CAP theorem" }],
    });
    expect(resp.choices[0].message.content).toBe("CAP says pick two.");
    expect(resp.volt.podId).toBe("pod-iad-001");
    expect(resp.volt.ttftMs).toBe(180);
  });

  it("injects volt extension fields when sovereign", async () => {
    let sentBody: Record<string, unknown> = {};
    const client = clientWith(
      async (_url, init) => {
        sentBody = JSON.parse(String(init?.body));
        return jsonResponse({ id: "x", model: "m", choices: [], volt: { tier: "sovereign", metro: "us-east-iad" } });
      },
      { sovereign: true, pinnedMetro: "us-east-iad" },
    );
    await client.chat.completions.create({
      model: "m",
      messages: [],
      pod_affinity: "sess-42",
    });
    expect(sentBody.volt_tier).toBe("sovereign");
    expect(sentBody.volt_metro).toBe("us-east-iad");
    expect(sentBody.pod_affinity).toBe("sess-42");
  });

  it("streams chunks", async () => {
    const sse =
      'data: {"id":"c","model":"m","choices":[{"index":0,"delta":{"content":"Hel"}}]}\n\n' +
      'data: {"id":"c","model":"m","choices":[{"index":0,"delta":{"content":"lo"}}]}\n\n' +
      "data: [DONE]\n\n";
    const client = clientWith(async () => new Response(sse, { status: 200 }));
    const stream = await client.chat.completions.create({ model: "m", messages: [], stream: true });
    let out = "";
    for await (const chunk of stream) out += chunk.choices[0].delta.content;
    expect(out).toBe("Hello");
  });
});

describe("sovereignty enforcement", () => {
  it("raises and withholds on a tier mismatch", async () => {
    const client = clientWith(
      async () => jsonResponse({ id: "c", model: "m", choices: [{ index: 0, message: { role: "a", content: "secret" } }], volt: { tier: "standard", metro: "us-east-iad" } }),
      { sovereign: true, pinnedMetro: "us-east-iad" },
    );
    await expect(
      client.chat.completions.create({ model: "m", messages: [] }),
    ).rejects.toBeInstanceOf(SovereigntyViolation);
  });
});

describe("errors", () => {
  it("maps 429 to QuotaExceeded with request_id", async () => {
    const client = clientWith(
      async () => jsonResponse({ error: { code: "quota_exceeded", message: "slow down", request_id: "req-9" } }, { status: 429, headers: { "Retry-After": "0" } }),
      { maxRetries: 0 },
    );
    try {
      await client.chat.completions.create({ model: "m", messages: [] });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(QuotaExceeded);
      expect((e as QuotaExceeded).requestId).toBe("req-9");
    }
  });

  it("does not retry non-429 4xx", async () => {
    let calls = 0;
    const client = clientWith(
      async () => {
        calls++;
        return jsonResponse({ error: { message: "bad" } }, { status: 400 });
      },
      { maxRetries: 3 },
    );
    await expect(client.chat.completions.create({ model: "m", messages: [] })).rejects.toThrow();
    expect(calls).toBe(1);
  });
});
