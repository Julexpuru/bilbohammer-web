import { PrismaClient, Rol, PostType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Usuario con contraseña (para probar login por credenciales)
  const hash = await bcrypt.hash("DemoSegura123!", 12);
  const userLocal = await prisma.user.upsert({
    where: { email: "local@bilbohammer.test" },
    update: {},
    create: {
      email: "local@bilbohammer.test",
      passwordHash: hash,
      name: "Local Demo",
      rol: Rol.SOCIO,
      nick: "local_demo",
      etiquetas: ["tester", "demo"],
      isActive: true,
    },
  });

  // Usuario “OAuth-demo” sin password (puedes enlazar con Google)
  const userOauth = await prisma.user.upsert({
    where: { email: "oauth@bilbohammer.test" },
    update: {},
    create: {
      email: "oauth@bilbohammer.test",
      name: "OAuth Demo",
      rol: Rol.AMIGO,
      isActive: true,
    },
  });

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

  // Post público enlazado al evento
  await prisma.post.create({
    data: {
      title: "¡Este viernes, quedada!",
      type: PostType.EVENTO,
      published: true,
      authorId: userLocal.id,
      eventId: evento.id,
      content: "Trae tu ejército y ganas de jugar.",
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

  // Notificación visible
  await prisma.notification.create({
    data: {
      title: "Mantenimiento",
      content: "La web estará en mantenimiento el lunes de 02:00 a 03:00.",
      visible: true,
    },
  });

  console.log("Seed OK ✅", {
    userLocal: userLocal.email,
    userOauth: userOauth.email,
    evento: evento.title,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
