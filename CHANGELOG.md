# Changelog

Auto-generated from [Conventional Commits](https://www.conventionalcommits.org/). SemVer.

## [0.1.0] - Unreleased

### Added
- `Volt` client: OpenAI drop-in for Spark with additive Volt extensions.
- `chat.completions.create` (await + async-iterator streaming), `embeddings.create`, `models.list/retrieve`.
- Client-side sovereignty enforcement (`sovereign` + `pinnedMetro`): validates every
  response and withholds the payload on a mismatch (`SovereigntyViolation`).
- Bounded, safe-by-default retries; typed error hierarchy with `requestId`/`podId`.
- ESM build with type declarations; hermetic tests (injected fetch).
- CI (typecheck + test + build on Node 18/20/22) + release (SLSA provenance + npm publish with provenance).
