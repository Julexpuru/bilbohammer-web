export type UserRole = "Socio" | "Junta" | "Admin" | "Arbitro" | string;

export type JuntaPosition = "Presidencia" | "Secretaría" | "Tesorería" | "Vocalía" | string;

export interface GameFaction {
  id: string;            // slug ej: "leagues-of-votann"
  name: string;          // nombre visible
  iconUrl?: string | null;
}

export interface UserGame {
  id: string;            // slug ej: "w40k"
  name: string;          // Warhammer 40,000
  iconUrl?: string | null;
  factions?: GameFaction[]; // facciones seleccionadas para ese juego
}

export interface ProfileEventRef {
  id: string;
  title: string;
  date: string; // ISO
}

export interface UserProfile {
  id: string;
  email: string;
  nick?: string | null;
  avatarUrl?: string | null;     // avatar especificado por el usuario en BD
  oauthAvatarUrl?: string | null; // avatar de proveedor (NextAuth) si no hay avatar propio
  roles?: UserRole[];            // p.ej. ["Socio","Junta"]
  juntaPositions?: JuntaPosition[]; // si roles incluye "Junta"
  memberSince?: string | null;   // ISO
  description?: string | null;   // markdown
  games?: UserGame[];            // juegos marcados en BD
  eventsOrganized?: ProfileEventRef[];
  eventsParticipated?: ProfileEventRef[];
}
