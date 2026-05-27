# Script Boundary Rules

This project separates product scripts from Codex helper tooling.

## Product Scripts

Product scripts may live in `web/scripts` when they are used by the app, data migrations, upload operations, deployment or operational maintenance.

Examples already in scope:

- R2 upload migration scripts.
- Data normalization scripts.
- Migration guard scripts.
- Table data maintenance scripts.

## Codex Helper Scripts

Codex-only scripts must not be added to `web/scripts`.

If future helper tooling is useful, use this order:

1. Document the workflow in `docs/ai/workflows`.
2. Reuse existing `npm` scripts where possible.
3. Ask before adding executable tooling.
4. If approved, place Codex-only tooling outside the web app script surface, for example at repository root under `tools/codex`.

## Package Scripts

Do not add AI-specific commands to `web/package.json` without explicit user approval.
