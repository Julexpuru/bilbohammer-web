import { PrismaClient, Rol, PostType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedUser = {
  email: string;
  roles: Rol[];
  name?: string | null;
  nick?: string | null;
  etiquetas?: string[];
  descripcion?: string | null;
  passwordHash?: string | null;
  isActive?: boolean;
};

async function upsertUser(user: SeedUser) {
  const etiquetas = user.etiquetas ?? [];
  const isActive = user.isActive ?? true;
  const updateData: Record<string, unknown> = {
    name: user.name ?? null,
    nick: user.nick ?? null,
    descripcion: user.descripcion ?? null,
    etiquetas,
    roles: { set: user.roles },
    isActive,
  };

  if (user.passwordHash !== undefined) {
    updateData.passwordHash = user.passwordHash;
  }

  return prisma.user.upsert({
    where: { email: user.email },
    update: updateData,
    create: {
      email: user.email,
      name: user.name ?? null,
      nick: user.nick ?? null,
      descripcion: user.descripcion ?? null,
      etiquetas,
      roles: { set: user.roles },
      isActive,
      passwordHash: user.passwordHash ?? null,
    },
  });
}

const SAMPLE_USERS: SeedUser[] = [
  {
    name: "Julen",
    email: "julexpuru@gmail.com",
    nick: "Julen",
    etiquetas: [],
    roles: [Rol.ADMIN, Rol.SOCIO],
    passwordHash: "$2a$12$lQf5dfG97mY2r90NJ1pWse14c.JaC8tNy3jAhHiLs1W7aBfkwNFD.",
  },
  {
    name: "Kimetz",
    email: "kimetzimetz@bilbohammer.test",
    nick: "Kimetz",
    etiquetas: [],
    roles: [Rol.JUNTA, Rol.SOCIO],
  },
  {
    name: "Andoni",
    email: "andoni@bilbohammer.test",
    nick: "Andoni",
    etiquetas: [],
    roles: [Rol.SOCIO],
  },
  {
    name: "Gorka",
    email: "gorka@bilbohammer.test",
    nick: "gorka",
    etiquetas: [],
    roles: [Rol.AMIGO],
  },
];

async function main() {
  // Usuario con contrasena (para probar login por credenciales)
  const hash = await bcrypt.hash("DemoSegura123!", 12);
  const userLocal = await upsertUser({
    email: "local@bilbohammer.test",
    passwordHash: hash,
    name: "Local Demo",
    nick: "local_demo",
    etiquetas: ["tester", "demo"],
    roles: [Rol.SOCIO],
  });

  // Usuario "OAuth-demo" sin password (puedes enlazar con Google)
  const userOauth = await upsertUser({
    email: "oauth@bilbohammer.test",
    name: "OAuth Demo",
    roles: [Rol.AMIGO],
  });

  const extraUsers: string[] = [];
  for (const candidate of SAMPLE_USERS) {
    const created = await upsertUser(candidate);
    extraUsers.push(created.email);
  }

  // Evento de ejemplo
  const ahora = new Date();
  const dosHoras = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
  const evento = await prisma.event.create({
    data: {
      title: "Quedada semanal",
      startsAt: ahora,
      endsAt: dosHoras,
      location: "Bilbao",
      details: "Partidas casuales y charla.",
    },
  });

  // Post publico enlazado al evento
  await prisma.post.create({
    data: {
      title: "Este viernes, quedada",
      type: PostType.EVENTO,
      published: true,
      authorId: userLocal.id,
      eventId: evento.id,
      content: "Trae tu ejercito y ganas de jugar.",
    },
  });

  // Anuncio sin evento
  await prisma.post.create({
    data: {
      title: "Bienvenida a nuevos socios",
      type: PostType.ANUNCIO,
      published: true,
      authorId: userOauth.id,
      content: "Recordad leer las normas del local.",
    },
  });

  // Notificacion visible
  await prisma.notification.create({
    data: {
      title: "Mantenimiento",
      content: "La web estara en mantenimiento el lunes de 02:00 a 03:00.",
      visible: true,
    },
  });

  console.log("Seed OK ?", {
    userLocal: userLocal.email,
    userOauth: userOauth.email,
    extraUsers,
    evento: evento.title,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

