# Vendored IAN API description

- **Repository:** https://github.com/PeterPontbriand/investment-analysis-engine
- **Commit:** `570b2fa2c7fdec7057b0b05aff56a814a5a4aad5`
- **Commit date:** 2026-11-22
- **Source path:** `schemas/openapi.json`

`openapi.json` is a byte-for-byte copy of that file. `src/api/schema.ts` is generated from it with openapi-typescript, and the gate's "OpenAPI types drift check" step fails when the two disagree. Moving to a newer engine, with `pnpm vendor-ian <commit>`, replaces `openapi.json`, regenerates the types and updates this record in the same change.
