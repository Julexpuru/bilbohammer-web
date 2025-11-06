import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import { loadContactContent, mergeWithDefaults, saveContactContent } from "@/lib/contact-content";
import type { ContactPageContent } from "@/lib/contact-content-data";

function forbid() {
  return NextResponse.json({ error: "No autorizado." }, { status: 403 });
}

function sanitizePayload(value: unknown): Partial<ContactPageContent> {
  if (!value || typeof value !== "object") return {};
  return value as Partial<ContactPageContent>;
}

export async function GET() {
  const session = await auth();
  const roles = extractRoles(session);
  if (!roles.includes("ADMIN") && !roles.includes("JUNTA")) {
    return forbid();
  }

  try {
    const content = await loadContactContent();
    return NextResponse.json(content);
  } catch (error) {
    console.error("[admin/contact-content] Error leyendo contenido", error);
    return NextResponse.json({ error: "No se pudo cargar el contenido." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  const roles = extractRoles(session);
  if (!roles.includes("ADMIN") && !roles.includes("JUNTA")) {
    return forbid();
  }

  try {
    const body = sanitizePayload(await request.json());
    const merged = mergeWithDefaults(body);
    await saveContactContent(merged);
    revalidatePath("/sobre-nosotros/contacto");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/contact-content] Error guardando contenido", error);
    return NextResponse.json(
      { error: "No se pudo guardar el contenido. Intenta de nuevo mas tarde." },
      { status: 500 },
    );
  }
}
