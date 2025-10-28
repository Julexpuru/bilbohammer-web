import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import type { GameId } from "@/lib/games";
import { GAME_ID_TO_ENUM } from "@/lib/game-enum";
import { buildGameContactDisplay } from "@/lib/game-info";

const LEARNING_VALUES = new Set(["Baja", "Media", "Alta"]);

function isGameId(value: string): value is GameId {
  return value in GAME_ID_TO_ENUM;
}

export async function PATCH(request: Request, { params }: { params: { gameId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const roles = extractRoles(session);
  if (!roles.includes("ADMIN") && !roles.includes("JUNTA")) {
    return NextResponse.json({ error: "No tienes permisos para editar este contenido." }, { status: 403 });
  }

  const gameParam = params.gameId;
  if (!isGameId(gameParam)) {
    return NextResponse.json({ error: "Juego no reconocido." }, { status: 400 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la peticion invalido." }, { status: 400 });
  }

  const summary = typeof payload?.summary === "string" ? payload.summary.trim() : "";
  const contentHtml = typeof payload?.contentHtml === "string" ? payload.contentHtml.trim() : "";
  const investment = typeof payload?.investment === "string" ? payload.investment.trim() : "";
  const playtime = typeof payload?.playtime === "string" ? payload.playtime.trim() : "";
  const learning = typeof payload?.learning === "string" ? payload.learning.trim() : "";
  const contactEmail = typeof payload?.contactEmail === "string" ? payload.contactEmail.trim() : null;
  const contactNote = typeof payload?.contactNote === "string" ? payload.contactNote.trim() : "";

  if (!summary) {
    return NextResponse.json({ error: "El resumen no puede estar vacio." }, { status: 400 });
  }

  if (!contentHtml) {
    return NextResponse.json({ error: "La descripcion no puede estar vacia." }, { status: 400 });
  }

  if (learning && !LEARNING_VALUES.has(learning)) {
    return NextResponse.json({ error: "Curva de aprendizaje no valida." }, { status: 400 });
  }

  let contactUserId: number | null = null;
  if (contactEmail) {
    const user = await prisma.user.findUnique({
      where: { email: contactEmail },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "No existe ningun socio con ese email." }, { status: 400 });
    }
    contactUserId = user.id;
  }

  const gameEnum = GAME_ID_TO_ENUM[gameParam];

  const record = await prisma.gameInfo.upsert({
    where: { game: gameEnum },
    update: {
      summary,
      contentHtml,
      investment,
      playtime,
      learning: learning || "Media",
      contactUserId,
      contactNote,
    },
    create: {
      game: gameEnum,
      summary,
      contentHtml,
      investment,
      playtime,
      learning: learning || "Media",
      contactUserId,
      contactNote,
    },
    include: {
      contactUser: {
        select: {
          email: true,
          nick: true,
          name: true,
          roles: true,
        },
      },
    },
  });

  const contact = buildGameContactDisplay(record.contactUser ?? null, record.contactNote ?? "");

  return NextResponse.json({
    summary: record.summary,
    contentHtml: record.contentHtml,
    investment: record.investment,
    playtime: record.playtime,
    learning: record.learning,
    contactEmail: contact.email,
    contactDisplay: contact.display,
    contactNote: contact.note,
    contactRoleLabel: record.contactUser ? deriveRoleLabel(record.contactUser.roles) : null,
  });
}

function deriveRoleLabel(roles: string[]): string | null {
  const priority = ["ADMIN", "JUNTA", "SOCIO", "AMIGO"];
  const labels: Record<string, string> = {
    ADMIN: "Admin",
    JUNTA: "Junta",
    SOCIO: "Socio",
    AMIGO: "Amigo",
  };
  const selected = priority.find((role) => roles.includes(role));
  return selected ? labels[selected] ?? selected : null;
}
