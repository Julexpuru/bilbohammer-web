# AI Operating Layer

This directory contains lightweight context for Codex. It is not product documentation and should not duplicate the README or functional manual.

## Structure

- `rules/`: focused rules for recurring areas.
- `workflows/`: repeatable operating playbooks.
- `agents/`: role profiles for optional delegated review or analysis.

## Loading Rule

Load only what is relevant to the current task:

- Code changes: read `rules/code-style.md` and the area-specific rule.
- Bugs: read `workflows/fix-issue.md`.
- Reviews: read `workflows/review.md`.
- New features: read `workflows/new-feature.md`.
- Backlog work: read `workflows/backlog-triage.md`.

## Non Goals

- Do not turn this into a full wiki.
- Do not mirror source code details that can be discovered with `rg`.
- Do not store secrets, credentials, tokens, or environment values.
- Do not add Codex-only executable scripts under `web/scripts`.

## Validation Baseline

Prefer existing project commands from the web root:

```powershell
npm run lint
npm run build
npm run migration:guards
```

If a command cannot be run, mention it in the final response with the reason.
