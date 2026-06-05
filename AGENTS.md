# Codex Operating Guide

This file is the entry point for Codex sessions in this repository. Keep it short and point to deeper context instead of duplicating it.

## Project Shape

- Main product lives in `bilbohammer/web`.
- The web app is a Next.js 14 App Router project with TypeScript, Prisma, PostgreSQL, NextAuth v5, Tailwind and Cloudflare R2 uploads.
- Functional documentation lives in `bilbohammer/README.md` and `bilbohammer/MANUAL_FUNCIONAL.md`.
- The canonical backlog lives in `bilbohammer/web/docs/backlog`.
- AI working rules and workflows live in `bilbohammer/web/docs/ai`.

## Working Rules

- Read the relevant `AGENTS.md` closest to the files being changed before editing.
- Do not overwrite user changes. The worktree can be dirty.
- Do not read, print or summarize secrets from `.env` files unless the user explicitly asks for a specific variable check.
- Prefer small, reviewable patches.
- For manual edits, use `apply_patch`.
- Use `rg` / `rg --files` for search.
- Keep generated artifacts out of commits unless explicitly intended.
- Any new Spanish user-facing or documentation text must be written in UTF-8 with proper accents and ñ. If encoding prevents that, stop and report the encoding problem instead of writing degraded text.

## Script Boundary

- `bilbohammer/web/scripts` is reserved for product, data, migration or deployment scripts used by the web app.
- Do not add Codex-only helper scripts to `bilbohammer/web/scripts`.
- Do not add AI helper commands to `bilbohammer/web/package.json` unless the user explicitly approves it.
- If future Codex-only tooling is needed, place it outside the web app script surface, for example under a root-level `tools/codex/`, and document why.

## Default Validation

Run validation from `bilbohammer/web` when relevant:

```powershell
npm run lint
npm run build
npm run migration:guards
```

Only run database-affecting commands when the task requires it and the target environment is clear.

## Backlog Protocol

- If a decision or pending task matters beyond the current chat, record it in `bilbohammer/web/docs/backlog`.
- New unrefined ideas go to `inbox.md`.
- Actionable tasks get one file under `tasks/` with the next `BH-XXX` ID.
- Update `current.md` only when the active project focus changes.
- Add a short `worklog.md` entry after meaningful backlog or architecture changes.

## Rule Capture

- When the user corrects a recurring working preference, treat it as a candidate operating rule.
- Do not silently add new rules. Ask for explicit confirmation before persisting them unless the user directly asks to write the rule.
- If a new preference conflicts with existing rules, stop and surface the conflict before editing documentation.
- Prefer refining an existing rule over creating a new document.
- Keep persisted rules concrete, short and verifiable.
