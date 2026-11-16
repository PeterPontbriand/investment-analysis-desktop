# Vendored IAN API description

- **Repository:** https://github.com/PeterPontbriand/investment-analysis-engine
- **Commit:** `0a767d24cc29c8b9859547a167bcb464044e4b1c`
- **Commit date:** 2026-11-16
- **Source path:** `schemas/openapi.json`

`openapi.json` is a byte-for-byte copy of that file. `src/api/schema.ts` is generated from it with openapi-typescript, and the gate's "OpenAPI types drift check" step fails when the two disagree. Moving to a newer engine, with `pnpm vendor-ian <commit>`, replaces `openapi.json`, regenerates the types and updates this record in the same change.
