# Workflow: Fix Issue

1. Read `docs/backlog/current.md` and the related `BH-XXX` task if one exists.
2. Reproduce or locate the behavior with `rg` and targeted file reads.
3. Identify the smallest safe change.
4. Edit only the relevant files.
5. Run the narrowest useful validation first, then broader checks if risk justifies it.
6. Update backlog or worklog only if the fix changes durable project state.

## Final Response

Include:

- What changed.
- What validation ran.
- Any residual risk or follow-up.
