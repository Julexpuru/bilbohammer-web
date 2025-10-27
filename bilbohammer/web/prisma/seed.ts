import {
  PrismaClient,
  Prisma,
  Rol,
  PostType,
  EventType,
  EventStatus,
  EventHighlightType,
} from "@prisma/client";
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

async function upsertOrganization(params: { slug: string; name: string; isClub?: boolean }) {
  const { slug, name, isClub = false } = params;
  return prisma.organization.upsert({
    where: { slug },
    update: { name, isClub },
    create: { slug, name, isClub },
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
  const hash = await bcrypt.hash("DemoSegura123!", 12);
  const userLocal = await upsertUser({
    email: "local@bilbohammer.test",
    passwordHash: hash,
    name: "Local Demo",
    nick: "local_demo",
    etiquetas: ["tester", "demo"],
    roles: [Rol.SOCIO],
  });

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

  const [bilbohammerOrg, dkhmOrg] = await Promise.all([
    upsertOrganization({ slug: "bilbohammer", name: "Bilbohammer", isClub: true }),
    upsertOrganization({ slug: "dkhm", name: "DKHM" }),
  ]);

  const album = await prisma.galleryAlbum.create({
    data: {
      slug: "quedada-semanal",
      title: "Quedada semanal Bilbohammer",
      description: "Momentos destacados de nuestra quedada semanal.",
      location: "Bilbohammer HQ",
      displayDate: new Date().toLocaleDateString("es-ES"),
      dateISO: new Date().toISOString(),
      coverImagePath: "/assets/img/slide1.svg",
      coverImageAlt: "Mesa de juego con miniaturas",
      totalPhotos: 0,
      facetYear: String(new Date().getFullYear()),
      facetGame: "w40k",
      facetFormat: "social",
    },
  });

  const ahora = new Date();
  const dosHoras = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
  const evento = await prisma.event.create({
    data: {
      title: "Quedada semanal",
      bannerUrl: "/assets/img/slide2.svg",
      startsAt: ahora,
      endsAt: dosHoras,
      location: "Bilbohammer HQ - Bilbao",
      latitude: 43.263,
      longitude: -2.935,
      mapsUrl: "https://maps.google.com/?q=Bilbohammer+HQ",
      details: "Partidas casuales, briefing inicial y espacio para pintura.",
      recap: "Gran ambiente, mesas llenas y muchas risas. ¡Repetiremos!",
      status: EventStatus.PUBLISHED,
      type: EventType.SOCIAL,
      game: "OTROS",
      priceGeneral: new Prisma.Decimal("5.00"),
      priceSocios: new Prisma.Decimal("0.00"),
      capacityMax: 30,
      capacityCurrent: 18,
      isInternal: true,
      isMembersOnly: false,
      showDescription: true,
      showAttachments: true,
      showLinks: true,
      showStandings: true,
      showRecap: true,
      showGallery: true,
      showLocation: true,
      album: { connect: { id: album.id } },
      tags: {
        create: [{ label: "Casual" }, { label: "Pintura" }, { label: "Demo" }],
      },
      organizers: {
        create: [
          { userId: userLocal.id, role: "Coordinador" },
          { userId: userOauth.id, role: "Apoyo logístico" },
        ],
      },
      organizations: {
        create: [{ organizationId: bilbohammerOrg.id, role: "Host" }],
      },
      attachments: {
        create: [
          {
            title: "Guía del evento",
            description: "Información general y planificación.",
            fileUrl: "https://example.com/docs/guia-evento.pdf",
          },
        ],
      },
      links: {
        create: [
          { label: "Inscripción", url: "https://example.com/registro" },
          { label: "Reglas de convivencia", url: "https://example.com/reglas" },
        ],
      },
      highlights: {
        create: [
          {
            type: EventHighlightType.FIRST,
            title: "Mejor general",
            playerName: "Julen",
            playerId: userLocal.id,
          },
          {
            type: EventHighlightType.AWARD,
            title: "Mejor pintado",
            playerName: "Kimetz",
            playerId: userOauth.id,
          },
        ],
      },
      rankings: {
        create: [
          {
            position: 1,
            playerName: "Julen",
            playerId: userLocal.id,
            score: "3-0",
          },
          {
            position: 2,
            playerName: "Kimetz",
            playerId: userOauth.id,
            score: "2-1",
          },
          {
            position: 3,
            playerName: "Andoni",
            score: "1-2",
          },
        ],
      },
    },
  });

  await prisma.eventOrganization.create({
    data: {
      eventId: evento.id,
      organizationId: dkhmOrg.id,
      role: "Colabora",
    },
  });

  await prisma.galleryImage.createMany({
    data: [
      {
        albumId: album.id,
        eventId: evento.id,
        storagePath: "/gallery/quedada-1.jpg",
        title: "Inicio del evento",
        description: "Briefing inicial con los participantes.",
        width: 1600,
        height: 900,
        mimeType: "image/jpeg",
        position: 1,
      },
      {
        albumId: album.id,
        eventId: evento.id,
        storagePath: "/gallery/quedada-2.jpg",
        title: "Mesas en juego",
        description: "Varias partidas en simultáneo.",
        width: 1600,
        height: 900,
        mimeType: "image/jpeg",
        position: 2,
      },
    ],
  });

  await prisma.galleryAlbum.update({
    where: { id: album.id },
    data: { totalPhotos: 2 },
  });

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

  await prisma.post.create({
    data: {
      title: "Bienvenida a nuevos socios",
      type: PostType.ANUNCIO,
      published: true,
      authorId: userOauth.id,
      content: "Recordad leer las normas del local.",
    },
  });

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
    organizations: [bilbohammerOrg.slug, dkhmOrg.slug],
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
