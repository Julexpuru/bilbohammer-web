# Workflow: New Feature

1. Check `docs/backlog/current.md` and existing tasks to avoid duplicate scope.
2. Confirm the user-facing behavior and roles affected.
3. Identify data model impact before UI work.
4. Keep implementation incremental: schema/API first when needed, then UI.
5. Update or create a backlog task if the feature will outlive the current session.
6. Validate with lint/build and any relevant migration guard.

## Scope Control

- Separate bug fixes from feature expansion.
- Do not add new third-party services without documenting privacy and cookie implications.
- Do not add new package dependencies unless justified.
