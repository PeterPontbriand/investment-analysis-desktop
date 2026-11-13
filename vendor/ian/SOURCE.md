# Vendored IAN API description

- **Repository:** https://github.com/PeterPontbriand/investment-analysis-engine
- **Commit:** `beb58a23bf9b72b763ce2b260c1dcaaa6d0a884b`
- **Commit date:** 2026-11-13
- **Source path:** `schemas/openapi.json`

`openapi.json` is a byte-for-byte copy of that file. `src/api/schema.ts` is generated from it with openapi-typescript, and the gate's "OpenAPI types drift check" step fails when the two disagree. Moving to a newer engine replaces `openapi.json` and regenerates the types in the same change.
