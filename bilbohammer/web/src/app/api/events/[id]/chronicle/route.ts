import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { userCanManageEvents } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: { id: string };
};

type ChroniclePayload = {
  chronicleArticleId?: string | null;
};

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!userCanManageEvents(session)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const eventId = params.id;
  if (!eventId) {
    return NextResponse.json({ error: "Evento no encontrado." }, { status: 400 });
  }

  let payload: ChroniclePayload;
  try {
    payload = (await request.json()) as ChroniclePayload;
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud invalido." }, { status: 400 });
  }

  const chronicleArticleId = payload?.chronicleArticleId ?? null;

  try {
    await prisma.event.update({
      where: { id: eventId },
      data: { chronicleArticleId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[events] Failed to update chronicle link", error);
    return NextResponse.json({ error: "No se pudo actualizar el evento." }, { status: 400 });
  }
}
