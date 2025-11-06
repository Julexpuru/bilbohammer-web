import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@bilbohammer.eus";
  const plain = "admin1234";
  const hash = await bcrypt.hash(plain, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        roles: { set: [Rol.ADMIN] },
        isActive: true,
        passwordHash: existing.passwordHash ?? hash,
        name: existing.name ?? "Admin",
        nombre: existing.nombre ?? "Admin",
        nick: existing.nick ?? "Admin",
        descripcion: existing.descripcion ?? "Usuario de administracion de la pagina web",
      },
    });
    console.log("[create_admin] Ya existia. Roles actualizados. id:", updated.id);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        name: "Admin",
        nombre: "Admin",
        nick: "Admin",
        descripcion: "Usuario de administracion de la pagina web",
        roles: { set: [Rol.ADMIN] },
        etiquetas: [],
        isActive: true,
      },
    });
    console.log("[create_admin] Usuario creado. id:", created.id);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
