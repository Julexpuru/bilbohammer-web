import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email, contrasena, nombre, nick } = await req.json();

  if (!email || !contrasena) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(contrasena, 12);
  const usuario = await prisma.user.create({
    data: { email, passwordHash, name: nombre ?? null, nick: nick ?? null },
    select: { id: true, email: true },
  });

  return NextResponse.json({ ok: true, usuarioId: usuario.id });
}
