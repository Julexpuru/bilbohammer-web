import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userCanManageEvents, userCanManageGallery } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMAT_LABELS: Record<string, string> = {
  TORNEO: "Torneo",
  LIGA: "Liga",
  SOCIAL: "Social",
  TALLER: "Taller",
  EXPO: "Exposicion",
  OTROS: "Otros",
};

function normalizeAlbumFormat(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return FORMAT_LABELS.OTROS;
  }
  const upper = value.trim().toUpperCase();
  return FORMAT_LABELS[upper] ?? FORMAT_LABELS.OTROS;
}

function safeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseOptionalDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

async function uniqueAlbumSlug(title: string): Promise<string> {
  const base = slugify(title, "album");
  let candidate = base;
  let attempt = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.galleryAlbum.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) {
      return candidate;
    }
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

function determineYear(inputYear: string | null, date: Date | null): string {
  if (inputYear && inputYear.trim()) {
    return inputYear.trim();
  }
  if (date) {
    return String(date.getFullYear());
  }
  return String(new Date().getFullYear());
}

function normalizeGameFacet(game: unknown): string {
  if (typeof game !== "string" || !game.trim()) {
    return "general";
  }
  return game.trim().toLowerCase();
}

export async function POST(request: Request) {
  const session = await auth();
  if (!userCanManageGallery(session) && !userCanManageEvents(session)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud invalido." }, { status: 400 });
  }

  const rawTitle = safeOptionalString(payload.title);
  if (!rawTitle) {
    return NextResponse.json({ error: "El titulo del album es obligatorio." }, { status: 400 });
  }

  const description = safeOptionalString(payload.description);
  const location = safeOptionalString(payload.location);
  const rawDate = parseOptionalDate(payload.date);
  const year = determineYear(safeOptionalString(payload.year), rawDate);
  const facetFormat = normalizeAlbumFormat(payload.format);
  const facetGame = normalizeGameFacet(payload.game);

  const displayDate = rawDate
    ? rawDate.toLocaleDateString("es-ES", { dateStyle: "long" })
    : null;
  const dateISO = rawDate ? rawDate.toISOString() : null;

  const slug = await uniqueAlbumSlug(rawTitle);

  try {
    const album = await prisma.galleryAlbum.create({
      data: {
        slug,
        title: rawTitle,
        description,
        location,
        displayDate,
        dateISO,
        facetYear: year,
        facetGame,
        facetFormat,
      },
    });

    return NextResponse.json({ album: { id: album.id, slug: album.slug, title: album.title } }, { status: 201 });
  } catch (error) {
    console.error("Error creando album", error);
    return NextResponse.json({ error: "No se pudo crear el album." }, { status: 500 });
  }
}
