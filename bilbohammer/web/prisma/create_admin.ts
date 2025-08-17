import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@bilbohammer.eus";
  const plain = "admin1234";
  const hash = await bcrypt.hash(plain, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // No machacamos datos existentes salvo lo imprescindible para rol y password inicial
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        rol: Rol.ADMIN,
        isActive: true,
        passwordHash: existing.passwordHash ?? hash,
        name: existing.name ?? "Admin",
        nombre: existing.nombre ?? "Admin",
        nick: existing.nick ?? "Admin",
        descripcion: existing.descripcion ?? "Usuario de administración de la pagina web",
        // campos opcionales que de momento dejamos como están si existen
      },
    });
    console.log("[create_admin] Ya existía. Asegurado rol=ADMIN e iniciales. id:", updated.id);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        name: "Admin",
        nombre: "Admin",
        nick: "Admin",
        descripcion: "Usuario de administración de la pagina web",
        rol: Rol.ADMIN,
        juegos: [],
        etiquetas: [],
        isActive: true,
        emailVerified: null,
        image: null,
        avatarUrl: null,
        lastLoginAt: null,
        membershipSince: null,
        membershipUntil: null,
        // createdAt/updatedAt se gestionan automáticamente
      },
    });
    console.log("[create_admin] Usuario creado. id:", created.id);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
