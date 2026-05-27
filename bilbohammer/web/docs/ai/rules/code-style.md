# Code Style Rules

- Keep changes local to the requested behavior.
- Prefer explicit names over clever abstractions.
- Keep TypeScript types close to the data they describe.
- Reuse existing components and helpers before adding new ones.
- Avoid comments for obvious code; comment only non-trivial business rules or migration assumptions.
- Preserve existing formatting style in nearby files.
- Do not introduce a new package unless it materially reduces risk or complexity.

## React And Next.js

- Respect App Router boundaries between server and client components.
- Add `"use client"` only when a component needs client-side state, effects, browser APIs or event handlers.
- Keep data fetching server-side where practical.
- Avoid broad client-side rewrites of server-rendered flows.

## APIs

- Validate inputs at route boundaries.
- Return clear status codes and stable JSON shapes.
- Keep permission checks close to the operation being protected.
