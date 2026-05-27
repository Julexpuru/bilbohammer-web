# Testing And Validation Rules

## Default Checks

Run from `bilbohammer/web` when relevant:

```powershell
npm run lint
npm run build
```

For database migrations or data-shape changes, also run:

```powershell
npm run migration:guards
```

## Manual Verification

- For UI changes, identify the route that should be opened and the role needed.
- For API changes, verify auth, validation, success and failure paths.
- For migrations, verify existing seed assumptions and migration guard impact.

## Reporting

- In the final response, state which checks ran.
- If checks were skipped, state why.
- Do not claim coverage that was not executed.
