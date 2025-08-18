
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toEnumKey, toUiId } from "@/lib/games_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody = {
  name?: string | null;
  nick?: string | null;
  membershipSince?: string | null;
  description?: string | null;
  juegos?: string[]; // UI ids
  factions?: Record<string, string[]>; // { w40k: [...uiIds] }
  avatarUrl?: string | null;
};

function normalize(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function pickAllowed(candidates: string[], allowed: string[]): string | null {
  const allowedSet = new Set(allowed);
  for (const c of candidates) {
    if (allowedSet.has(c)) return c;
  }
  const normAllowed = allowed.map(a => ({ a, n: normalize(a) }));
  for (const c of candidates) {
    const n = normalize(c);
    const hit = normAllowed.find(x => x.n === n || x.n.includes(n) || n.includes(x.n));
    if (hit) return hit.a;
  }
  return null;
}

const GAME_CANDIDATES: Record<string, string[]> = {
  w40k: ["W40K", "WARHAMMER_40K", "WARHAMMER_40000", "WARHAMMER40K"],
  aos: ["AOS", "AGE_OF_SIGMAR"],
  tow: ["TOW", "THE_OLD_WORLD", "OLD_WORLD"],
  esdla: ["ESDLA", "MIDDLE_EARTH", "LORD_OF_THE_RINGS", "EL_SENOR_DE_LOS_ANILLOS", "EL_SEÑOR_DE_LOS_ANILLOS"],
  bb: ["BB", "BLOOD_BOWL"],
  marvel: ["MARVEL", "MCP", "CRISIS_PROTOCOL"],
  rol: ["ROL", "RPG", "ROLEPLAY"],
  magic: ["MAGIC", "MTG"],
  boardgames: ["BOARDGAMES", "BOARD_GAMES", "JUEGOS_DE_MESA"],
  otros: ["OTROS", "OTHERS"],
};

function mapUiListToEnum(uiIds: string[], allowed: string[], extra: Record<string,string[]> = {}): string[] {
  const out: string[] = [];
  for (const id of uiIds) {
    const base = toEnumKey(id);
    const cand = [base, ...(extra[id] ?? [])];
    const pick = pickAllowed(cand, allowed);
    if (pick) out.push(pick);
  }
  return out;
}

async function getEnumLabels(enumType: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ enumlabel: string }[]>`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE lower(t.typname) = lower(${enumType})
    ORDER BY e.enumsortorder
  `;
  return rows.map(r => r.enumlabel);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as PatchBody;

  const [allowedJuego, allowedW40K, allowedAoS, allowedTOW] = await Promise.all([
    getEnumLabels("Juego"),
    getEnumLabels("FaccionesW40K"),
    getEnumLabels("FaccionesAoS"),
    getEnumLabels("FaccionesTOW"),
  ]);

  const uiJuegos = Array.isArray(body.juegos) ? body.juegos : undefined;
  const enumJuegos = uiJuegos ? mapUiListToEnum(uiJuegos, allowedJuego, GAME_CANDIDATES) : undefined;

  const factions = body.factions;
  const w40k = factions ? mapUiListToEnum((factions["w40k"] || []), allowedW40K) : undefined;
  const aos  = factions ? mapUiListToEnum((factions["aos"]  || []), allowedAoS) : undefined;
  const tow  = factions ? mapUiListToEnum((factions["tow"]  || []), allowedTOW.concat(["HIGH_ELVES","HIGHELVES"])) : undefined;

  await prisma.user.update({
  where: { email: session.user.email },
  data: {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.nick !== undefined ? { nick: body.nick } : {}),
    ...(body.membershipSince !== undefined ? { membershipSince: (() => {
      const v = body.membershipSince;
      if (!v) return null;
      const mmOnly = /^\d{4}-\d{2}$/.test(v) ? v.match(/^(\d{4})-(\d{2})$/)! : null;
      if (mmOnly) {
        const y = parseInt(mmOnly[1], 10);
        const m = parseInt(mmOnly[2], 10) - 1;
        return new Date(Date.UTC(y, m, 1));
      }
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      }
      return null;
    })() } : {}),
    ...(body.description !== undefined ? { descripcion: body.description } : {}),
    ...(enumJuegos !== undefined ? { juegos: enumJuegos as any } : {}),
    ...(w40k !== undefined ? { faccionesW40K: w40k as any } : {}),
    ...(aos  !== undefined ? { faccionesAoS:  aos  as any } : {}),
    ...(tow  !== undefined ? { faccionesTOW: tow  as any } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, 'avatarUrl') ? { avatarUrl: body.avatarUrl } : {}),
  },
  select: { id: true }
});

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const u = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { accounts: true },
  });

  if (!u) return NextResponse.json(null);

  return NextResponse.json({
    ...u,
    juegos: Array.isArray(u.juegos) ? (u.juegos as any[]).map((e:any)=>toUiId(String(e))) : [],
    faccionesW40K: Array.isArray(u.faccionesW40K) ? (u.faccionesW40K as any[]).map((e:any)=>toUiId(String(e))) : [],
    faccionesAoS: Array.isArray(u.faccionesAoS) ? (u.faccionesAoS as any[]).map((e:any)=>toUiId(String(e))) : [],
    faccionesTOW: Array.isArray(u.faccionesTOW) ? (u.faccionesTOW as any[]).map((e:any)=>toUiId(String(e))) : [],
  });
}
