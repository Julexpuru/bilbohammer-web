# Workflow: Review

Use code-review mode: findings first, ordered by severity.

## Steps

1. Identify the diff or files under review.
2. Check behavior, security, auth, data integrity and missing validation.
3. Check tests or verification gaps.
4. Avoid style-only findings unless they hide real risk.

## Output

- Findings with file and line references.
- Open questions or assumptions.
- Short summary only after findings.

If no findings are found, state that explicitly and mention residual risk.
