# Vendored IAN API description

- **Repository:** https://github.com/PeterPontbriand/investment-analysis-engine
- **Commit:** `ab180c7450a1a15d906ff9b2c220d8596da04406`
- **Commit date:** 2026-11-12
- **Source path:** `schemas/openapi.json`

`openapi.json` is a byte-for-byte copy of that file. `src/api/schema.ts` is generated from it with openapi-typescript, and the gate's "OpenAPI types drift check" step fails when the two disagree. Moving to a newer engine replaces `openapi.json` and regenerates the types in the same change.
