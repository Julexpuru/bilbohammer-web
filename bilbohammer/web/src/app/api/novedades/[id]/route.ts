import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import { deleteArticleById } from "@/lib/novedades-repository";

const MANAGER_ROLES = new Set(["ADMIN", "JUNTA", "REDACTOR"]);

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const roles = extractRoles(session);
  const canManage = roles.some((role) => MANAGER_ROLES.has(role));
  if (!canManage) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const articleId = params.id;
  if (!articleId) {
    return NextResponse.json({ error: "Falta el id de la noticia." }, { status: 400 });
  }

  const deleted = await deleteArticleById(articleId);
  if (!deleted) {
    return NextResponse.json({ error: "No se pudo eliminar la noticia." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
