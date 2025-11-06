import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import prisma from "@/lib/prisma";
import { buildGameContactDisplay } from "@/lib/game-info";

type Payload = {
  summary?: string;
  contentHtml?: string;
  investment?: string;
  playtime?: string;
  learning?: string;
  contactUserId?: number | string | null;
  contactNote?: string;
};

const LEARNING_VALUES = new Set(["Baja", "Media", "Alta"]);

export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  const roles = extractRoles(session);
  if (!roles.includes("ADMIN") && !roles.includes("JUNTA")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const slugParam = params.slug?.trim();
  if (!slugParam) {
    return NextResponse.json({ error: "Juego no reconocido." }, { status: 400 });
  }

  const payload = (await request.json()) as Payload;
  const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
  const contentHtml = typeof payload.contentHtml === "string" ? payload.contentHtml.trim() : "";
  const investment = typeof payload.investment === "string" ? payload.investment.trim() : "";
  const playtime = typeof payload.playtime === "string" ? payload.playtime.trim() : "";
  const learning = typeof payload.learning === "string" ? payload.learning.trim() : "";
  const contactNote = typeof payload.contactNote === "string" ? payload.contactNote.trim() : "";

  if (!summary) {
    return NextResponse.json({ error: "El resumen no puede estar vacío." }, { status: 400 });
  }
  if (!contentHtml) {
    return NextResponse.json({ error: "La descripción no puede estar vacía." }, { status: 400 });
  }
  if (learning && !LEARNING_VALUES.has(learning)) {
    return NextResponse.json({ error: "Curva de aprendizaje no válida." }, { status: 400 });
  }

  const game = await prisma.game.findFirst({
    where: {
      OR: [{ slug: slugParam.toLowerCase() }, { legacyEnumKey: slugParam.toUpperCase() }],
    },
    select: { id: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Juego no encontrado." }, { status: 404 });
  }

  let contactUserId: number | null = null;
  if (payload.contactUserId !== undefined && payload.contactUserId !== null && payload.contactUserId !== "") {
    const numeric =
      typeof payload.contactUserId === "string" ? Number.parseInt(payload.contactUserId, 10) : payload.contactUserId;
    if (!Number.isInteger(numeric)) {
      return NextResponse.json({ error: "Identificador de contacto no válido." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(numeric) },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "No existe ningún socio con ese identificador." }, { status: 400 });
    }
    contactUserId = Number(numeric);
  }

  const record = await prisma.gameInfo.upsert({
    where: { gameId: game.id },
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
      gameId: game.id,
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
          id: true,
          email: true,
          nick: true,
          name: true,
          roles: true,
        },
      },
    },
  });

  const contact = buildGameContactDisplay(record.contactUser ?? null, record.contactNote ?? "");

  revalidatePath("/sobre-nosotros/juegos");

  return NextResponse.json({
    summary: record.summary,
    contentHtml: record.contentHtml,
    investment: record.investment,
    playtime: record.playtime,
    learning: record.learning,
    contactNote: record.contactNote,
    contactDisplay: contact.display,
    contactEmail: contact.email,
    contactUserId: record.contactUserId,
  });
}
