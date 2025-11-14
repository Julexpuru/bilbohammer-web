const DEFAULT_ADMIN_EMAILS = ["admin@bilbohammer.es", "admin@bilbohammer.eus"];

const configuredEmails = [process.env.SEED_ADMIN_EMAIL]
  .filter((value): value is string => Boolean(value && value.trim().length))
  .map((value) => value.trim().toLowerCase());

export const SYSTEM_ACCOUNT_EMAILS = Array.from(
  new Set(configuredEmails.concat(DEFAULT_ADMIN_EMAILS.map((email) => email.toLowerCase()))),
);
