export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendMail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { nueva, confirmar } = await req.json();
    if (typeof nueva !== "string" || typeof confirmar !== "string") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    if (nueva !== confirmar) {
      return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 });
    }
    if (nueva.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    const passwordHash = await bcrypt.hash(nueva, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    try {
      await sendMail({
        to: user.email,
        subject: "Bilbohammer: tu contraseña ha sido actualizada",
        html: `<p>Hola${user.name ? " " + user.name : ""},</p>
               <p>Te confirmamos que tu contraseña se ha actualizado correctamente.</p>
               <p>Si no has sido tú, contacta con un administrador de inmediato.</p>
               <p>— Bilbohammer</p>`,
      });
    } catch (e) { console.warn("[password] Email no enviado:", e); }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/me/password error", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
