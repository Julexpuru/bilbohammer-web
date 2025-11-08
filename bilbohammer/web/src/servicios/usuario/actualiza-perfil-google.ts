import { prisma } from "@/lib/prisma";

type DatosPerfil = { nombre?: string | null; imagen?: string | null };

/**
 * Sincroniza nombre e imagen procedentes de Google.
 * - El nombre solo se guarda si aun no hay uno en la ficha (se prioriza el manual).
 * - La imagen OAuth se sincroniza cuando cambia para garantizar que cualquier vista apoyada en BD la conserve.
 */
export async function actualizaPerfilGoogleSiNecesario(opts: {
  userId: number;
  perfil: DatosPerfil;
}) {
  const { userId, perfil } = opts;
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, image: true, oauthAvatarUrl: true },
  });
  if (!usuario) return;

  const updateData: { name?: string; image?: string | null; oauthAvatarUrl?: string | null } = {};

  if (!usuario.name && perfil.nombre) {
    updateData.name = perfil.nombre;
  }

  const imagenNormalizada = perfil.imagen?.trim?.();
  if (imagenNormalizada && imagenNormalizada !== usuario.image) {
    updateData.image = imagenNormalizada;
  }
  if (imagenNormalizada && imagenNormalizada !== usuario.oauthAvatarUrl) {
    updateData.oauthAvatarUrl = imagenNormalizada;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }
}
