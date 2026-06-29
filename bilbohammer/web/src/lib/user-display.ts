type DisplayUser = {
  id?: number | string | null;
  nick?: string | null;
  name?: string | null;
  nombre?: string | null;
  email?: string | null;
};

function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function getUserDisplayName(user: DisplayUser | null | undefined, fallback: string | null = "Usuario") {
  if (!user) return fallback;
  return clean(user.nick) ?? clean(user.name) ?? clean(user.nombre) ?? clean(user.email) ?? fallback;
}
