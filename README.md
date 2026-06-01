# Volt TypeScript SDK

TypeScript SDK for [Volt](https://volt.cloud) — the Sovereign Inference Cloud.
OpenAI drop-in for Spark, with first-class sovereign tier, metro pinning, and pod
affinity.

```bash
npm install @thevoltcloud/sdk
```

## Quickstart

```ts
import { Volt } from "@thevoltcloud/sdk";

const client = new Volt({ apiKey: process.env.VOLT_API_KEY }); // or rely on VOLT_API_KEY
const resp = await client.chat.completions.create({
  model: "llama-3.3-70b-instruct",
  messages: [{ role: "user", content: "Explain CAP theorem" }],
});
console.log(resp.choices[0].message.content);
```

## Sovereign mode

```ts
import { Volt, SovereigntyViolation } from "@thevoltcloud/sdk";

const client = new Volt({ sovereign: true, pinnedMetro: "us-east-iad" });
try {
  const resp = await client.chat.completions.create({
    model: "llama-3.3-70b-instruct",
    messages: [{ role: "user", content: "Summarize this contract." }],
    pod_affinity: "contract-review-42",
  });
  console.log(resp.volt.podId, resp.volt.ttftMs);
} catch (e) {
  if (e instanceof SovereigntyViolation) {
    // response payload withheld on a mismatch
  }
}
```

## Streaming

```ts
const stream = await client.chat.completions.create({
  model: "llama-3.3-70b-instruct",
  messages: [{ role: "user", content: "..." }],
  stream: true,
});
for await (const chunk of stream) process.stdout.write(chunk.choices[0].delta.content);
```

## Embeddings

```ts
const resp = await client.embeddings.create({ model: "bge-large-en-v1.5", input: "hello" });
console.log(resp.data[0].embedding.length);
```

## Errors

All errors subclass `VoltError` and carry `requestId` / `podId`: `AuthError`,
`PermissionError`, `SovereigntyViolation`, `QuotaExceeded`, `NoCapacity`,
`InvalidRequest`, `ModelNotFound`, `StreamInterrupted`, `ServerError`. Retries are
bounded and safe by default; override per call with `maxRetries`.

## Development

```bash
npm install
npm run typecheck && npm test && npm run build
```

Requires Node 18+ (uses the global `fetch`). Apache-2.0 — see [LICENSE](LICENSE).
