import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { serializeRegistration } from "@/lib/event-registrations";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

type RouteParams = {
  params: { id: string; registrationId: string };
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!(await userCanEditEvent(session, params.id))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let email = "";
  try {
    const payload = (await request.json()) as { email?: unknown };
    email = normalizeEmail(payload.email);
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Indica el correo del usuario registrado." }, { status: 400 });
  }

  const existing = await prisma.eventRegistration.findFirst({
    where: { id: params.registrationId, eventId: params.id },
    include: { user: { select: { id: true, name: true, nick: true, email: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Inscripción no encontrada." }, { status: 404 });
  }

  if (existing.userId != null) {
    return NextResponse.json({ error: "Esta inscripción ya está vinculada a un usuario." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      isActive: true,
    },
    select: { id: true, name: true, nick: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "No existe un usuario activo con ese correo." }, { status: 404 });
  }

  const duplicate = await prisma.eventRegistration.findFirst({
    where: {
      eventId: params.id,
      userId: user.id,
      id: { not: existing.id },
    },
    select: { id: true },
  });

  if (duplicate) {
    return NextResponse.json({ error: "Ese usuario ya tiene una inscripción en este evento." }, { status: 409 });
  }

  const registration = await prisma.$transaction(async (tx) => {
    await tx.competitiveMatchPlayer.updateMany({
      where: {
        userId: null,
        displayName: { equals: existing.playerName, mode: "insensitive" },
        match: { eventId: params.id },
      },
      data: { userId: user.id },
    });

    await tx.competitiveMatchReportPlayer.updateMany({
      where: {
        userId: null,
        displayName: { equals: existing.playerName, mode: "insensitive" },
        report: { eventId: params.id },
      },
      data: { userId: user.id },
    });

    return tx.eventRegistration.update({
      where: { id: existing.id },
      data: { userId: user.id },
      include: { user: { select: { id: true, name: true, nick: true, email: true } } },
    });
  });

  return NextResponse.json({ registration: serializeRegistration(registration) });
}
