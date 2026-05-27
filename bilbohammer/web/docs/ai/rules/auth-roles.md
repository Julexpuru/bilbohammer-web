# Auth And Roles Rules

- Roles are business-critical. Check `../MANUAL_FUNCIONAL.md` and `src/lib/roles.ts` before changing access behavior.
- Do not duplicate role logic across components if an existing helper can express it.
- Server-side access checks are mandatory for protected data and mutations.
- Client-side hiding is only a UX layer, not a security boundary.
- Be careful with `ADMIN`, `JUNTA`, `REDACTOR`, `SOCIO` and `AMIGO`; each has distinct expectations in the functional manual.

## Review Checklist

- Protected page access.
- Protected API mutation access.
- UI visibility for buttons and links.
- Behavior for unauthenticated users.
- Behavior for registered users without elevated roles.
