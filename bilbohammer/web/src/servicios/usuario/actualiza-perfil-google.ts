import { prisma } from "@/lib/prisma";

type DatosPerfil = { nombre?: string | null; imagen?: string | null };

/**
 * Actualiza nombre e imagen desde Google SOLO si están vacíos en el usuario.
 * No pisa datos existentes.
 */
export async function actualizaPerfilGoogleSiNecesario(opts: {
  userId: number;
  perfil: DatosPerfil;
}) {
  const { userId, perfil } = opts;
  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, image: true } });
  if (!usuario) return;

  const updateData: { name?: string; image?: string } = {};
  if (!usuario.name && perfil.nombre) updateData.name = perfil.nombre;
  if (!usuario.image && perfil.imagen) updateData.image = perfil.imagen;

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: updateData });
  }
}
