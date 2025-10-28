import { PrismaClient, Prisma, Rol, EventType, EventStatus, Juego } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

const addDays = (base: Date, days: number) => new Date(base.getTime() + days * DAY_MS);

const setTime = (base: Date, hours: number, minutes = 0) => {
  const copy = new Date(base);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
};

const decimalOrNull = (value?: number | null): Prisma.Decimal | null => {
  if (value == null) return null;
  return new Prisma.Decimal(value.toFixed(2));
};

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

async function clearEventsData() {
  await prisma.eventRankingEntry.deleteMany();
  await prisma.eventHighlight.deleteMany();
  await prisma.eventAttachment.deleteMany();
  await prisma.eventLink.deleteMany();
  await prisma.eventTag.deleteMany();
  await prisma.eventOrganizer.deleteMany();
  await prisma.eventOrganization.deleteMany();
  await prisma.post.updateMany({
    where: { eventId: { not: null } },
    data: { eventId: null },
  });
  await prisma.galleryImage.updateMany({
    where: { eventId: { not: null } },
    data: { eventId: null },
  });
  await prisma.event.deleteMany();
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

type GameInfoSeed = {
  game: Juego;
  summary: string;
  contentHtml: string;
  investment: string;
  playtime: string;
  learning: string;
  contactEmail: string | null;
  contactNote?: string;
};

const GAME_INFO_SEED: GameInfoSeed[] = [
  {
    game: Juego.W40K,
    summary: "Competitivo, narrativo y siempre con mesas llenas.",
    contentHtml: `<p>Warhammer 40,000 es el motor principal del club: combinamos ligas, campanas narrativas y torneos puntuables. Si empiezas desde cero siempre encontraras a alguien dispuesto a ensenarte.</p>
<ul>
  <li>Calendario trimestral con noches fijas entre semana y torneos puntuables.</li>
  <li>Escenografia propia y tapetes listos para formatos de 2000, 1500 y 1000 puntos.</li>
  <li>Grupo de aprendizaje con partidas dirigidas para nuevos jugadores.</li>
</ul>`,
    investment: "Desde 150 EUR",
    playtime: "2.5 - 3 h",
    learning: "Alta",
    contactEmail: "julexpuru@gmail.com",
    contactNote: "Coordinacion principal del sistema.",
  },
  {
    game: Juego.AOS,
    summary: "Age of Sigmar reune a todos los perfiles de juego.",
    contentHtml: `<p>Alternamos ligas cortas con campanas narrativas para mantener la escena variada. Nos desplazamos juntos a eventos del norte y cuidamos cada mesa para representar los Reinos Mortales.</p>
<ul>
  <li>Mini ligas de cuatro semanas para no saturar agendas.</li>
  <li>Escenografia tematizada y tapetes de 44x60 y 60x44.</li>
  <li>Coordinamos viajes a torneos cercanos.</li>
</ul>`,
    investment: "Desde 140 EUR",
    playtime: "2 - 2.5 h",
    learning: "Media",
    contactEmail: "kimetzimetz@bilbohammer.test",
  },
  {
    game: Juego.TOW,
    summary: "El regreso del Old World con campanas de mapa.",
    contentHtml: `<p>Recuperamos el espiritu clasico con campanas por territorios, partidas narrativas y quedadas especiales para grandes batallas. Restauramos minis antiguas y compartimos recursos de trasfondo.</p>
<ul>
  <li>Campanas de mapa con seguimiento digital de resultados.</li>
  <li>Quedadas mensuales para partidas epicas.</li>
  <li>Talleres de restauracion y pintura clasica.</li>
</ul>`,
    investment: "Desde 180 EUR",
    playtime: "3 - 4 h",
    learning: "Media",
    contactEmail: "andoni@bilbohammer.test",
  },
  {
    game: Juego.ESDLA,
    summary: "Escenarios de la Tierra Media con mimo tematico.",
    contentHtml: `<p>Ofrecemos escenarios competitivos y campanas cooperativas inspiradas en los libros. La escenografia recrea ruinas, bosques y minas emblematicas para cada mision.</p>
<ul>
  <li>Narrativas basadas en los libros y peliculas.</li>
  <li>Escenografia tematica propia y compartida con otros clubs.</li>
  <li>Quedadas cruzadas con asociaciones vecinas.</li>
</ul>`,
    investment: "Desde 120 EUR",
    playtime: "2 h",
    learning: "Media",
    contactEmail: "andoni@bilbohammer.test",
  },
  {
    game: Juego.BB,
    summary: "Blood Bowl asegura risas, drama y ranking anual.",
    contentHtml: `<p>La liga anual incluye draft de franquicias, playoffs y cronicas semanales. Cada jornada se juega en estadios tematizados con escenografia modular para ambientar el campo.</p>
<ul>
  <li>Liga anual con clasificacion y premios tematicos.</li>
  <li>Gestor online para fichajes y cronicas.</li>
  <li>Escenografia modular para personalizar cada estadio.</li>
</ul>`,
    investment: "Desde 95 EUR",
    playtime: "2 - 2.5 h",
    learning: "Media",
    contactEmail: "kimetzimetz@bilbohammer.test",
  },
  {
    game: Juego.MARVEL,
    summary: "Partidas dinamicas y eventos tematicos de comic.",
    contentHtml: `<p>Marvel Crisis Protocol es ideal si buscas dinamismo. Organizamos ligas cortas, escenarios caseros y talleres de escenografia urbana para ambientar las mesas.</p>
<ul>
  <li>Ligas rapidas de seis jornadas.</li>
  <li>Talleres de escenografia urbana y pintura.</li>
  <li>Jornadas de demostracion abiertas al publico.</li>
</ul>`,
    investment: "Desde 110 EUR",
    playtime: "90 - 120 min",
    learning: "Media",
    contactEmail: "gorka@bilbohammer.test",
  },
  {
    game: Juego.ROL,
    summary: "Rol semanal con plazas abiertas y rotacion de directores.",
    contentHtml: `<p>Gestionamos una agenda compartida para reservar mesa, anunciar campanas y organizar sesiones cero. Hay hueco para aventuras cortas o campanas de larga duracion.</p>
<ul>
  <li>Calendario colaborativo para reservar sesiones.</li>
  <li>Biblioteca de manuales y ayudas de juego.</li>
  <li>Sesiones cero para crear personajes desde cero.</li>
</ul>`,
    investment: "Desde 30 EUR",
    playtime: "3 - 4 h",
    learning: "Baja",
    contactEmail: "oauth@bilbohammer.test",
  },
  {
    game: Juego.MAGIC,
    summary: "Commander casual y sellados tematicos cada temporada.",
    contentHtml: `<p>Quedamos los domingos para Commander, con listas compartidas y sellados tematicos cuando llega una nueva expansion. Tenemos pool de cartas para quien quiera iniciarse.</p>
<ul>
  <li>Quedadas dominicales con seguimiento de ligas.</li>
  <li>Sellados tematicos con kits comunitarios.</li>
  <li>Pool de cartas para iniciacion.</li>
</ul>`,
    investment: "Desde 80 EUR",
    playtime: "2 - 3 h",
    learning: "Media",
    contactEmail: "oauth@bilbohammer.test",
  },
  {
    game: Juego.JUEGOS_DE_MESA,
    summary: "Juegos de mesa modernos y planes familiares.",
    contentHtml: `<p>Disponemos de una ludoteca comunitaria que cubre euros, party y cooperativos. Tambien organizamos sesiones para probar prototipos de autores locales en Bilbao.</p>
<ul>
  <li>Ludoteca comunitaria en constante crecimiento.</li>
  <li>Club mensual de testeo de prototipos.</li>
  <li>Sesiones introductorias para familias y novatos.</li>
</ul>`,
    investment: "Desde 40 EUR",
    playtime: "60 - 120 min",
    learning: "Baja",
    contactEmail: "local@bilbohammer.test",
  },
  {
    game: Juego.OTROS,
    summary: "Hueco para proyectos nuevos y sistemas emergentes.",
    contentHtml: `<p>Si tienes un juego minoritario o quieres lanzar un proyecto experimental, la junta te ayuda con logistica, difusion y material siempre que sea posible.</p>
<ul>
  <li>Reservamos mesas para campanas experimentales.</li>
  <li>Apoyo logistico para materiales y difusion.</li>
  <li>Inventario colaborativo para nuevos sistemas.</li>
</ul>`,
    investment: "Variable",
    playtime: "Segun sistema",
    learning: "Media",
    contactEmail: "julexpuru@gmail.com",
    contactNote: "Coordinacion general de propuestas nuevas.",
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

  const [bilbohammerOrg, dkhmOrg, goblinForgeOrg] = await Promise.all([
    upsertOrganization({ slug: "bilbohammer", name: "Bilbohammer", isClub: true }),
    upsertOrganization({ slug: "dkhm", name: "DKHM" }),
    upsertOrganization({ slug: "goblinforge", name: "Goblin Forge" }),
  ]);

  const seededEmails = [userLocal.email, userOauth.email, ...extraUsers];
  const seededUsers = await prisma.user.findMany({
    where: { email: { in: seededEmails } },
  });
  const usersByEmail = new Map(seededUsers.map((user) => [user.email, user]));

  for (const entry of GAME_INFO_SEED) {
    const contactUser = entry.contactEmail ? usersByEmail.get(entry.contactEmail) : null;
    await prisma.gameInfo.upsert({
      where: { game: entry.game },
      update: {
        summary: entry.summary,
        contentHtml: entry.contentHtml,
        investment: entry.investment,
        playtime: entry.playtime,
        learning: entry.learning,
        contactUserId: contactUser?.id ?? null,
        contactNote: entry.contactNote ?? "",
      },
      create: {
        game: entry.game,
        summary: entry.summary,
        contentHtml: entry.contentHtml,
        investment: entry.investment,
        playtime: entry.playtime,
        learning: entry.learning,
        contactUserId: contactUser?.id ?? null,
        contactNote: entry.contactNote ?? "",
      },
    });
  }

  await clearEventsData();

  type EventBlueprint = {
    title: string;
    bannerUrl?: string;
    startsAt: Date;
    endsAt: Date;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    mapsUrl?: string | null;
    details?: string | null;
    status: EventStatus;
    type: EventType;
    game?: Juego | null;
    priceGeneral?: number | null;
    priceSocios?: number | null;
    capacityMax?: number | null;
    capacityCurrent?: number | null;
    isInternal?: boolean;
    isMembersOnly?: boolean;
    organizations: { organizationId: string; role?: string | null }[];
    organizers: { email: string; role?: string | null }[];
    tags: string[];
  };

  const baseDate = new Date();

  const eventsBlueprint: EventBlueprint[] = [
    {
      title: "Bilbohammer Grand Tournament 2025",
      bannerUrl: "/assets/img/events/gt-bilbohammer.jpg",
      startsAt: setTime(addDays(baseDate, 30), 9),
      endsAt: setTime(addDays(baseDate, 31), 19),
      location: "Bilbao Arena - Miribilla",
      mapsUrl: "https://maps.google.com/?q=Bilbao+Arena",
      details:
        "Dos días intensos de Warhammer 40.000 con mesas temáticas, premios y cobertura en directo. Incluye pack de bienvenida y sorteos.",
      status: EventStatus.PUBLISHED,
      type: EventType.TOURNAMENT,
      game: Juego.W40K,
      priceGeneral: 45,
      priceSocios: 30,
      capacityMax: 64,
      organizations: [{ organizationId: bilbohammerOrg.id, role: "Organiza" }],
      organizers: [
        { email: "julexpuru@gmail.com", role: "Director del torneo" },
        { email: "kimetzimetz@bilbohammer.test", role: "Jefe de árbitros" },
      ],
      tags: ["torneo", "w40k", "gt"],
    },
    {
      title: "Liga de Sigmar Invierno",
      bannerUrl: "/assets/img/events/liga-aos.jpg",
      startsAt: setTime(addDays(baseDate, 7), 19),
      endsAt: setTime(addDays(baseDate, 90), 22),
      location: "Local Bilbohammer - Bilbao",
      details:
        "Liga interna con enfrentamientos quincenales, seguimiento online y premios para pintura y narrativa.",
      status: EventStatus.PUBLISHED,
      type: EventType.LEAGUE,
      game: Juego.AOS,
      priceGeneral: 15,
      priceSocios: 5,
      isInternal: true,
      isMembersOnly: true,
      organizations: [{ organizationId: bilbohammerOrg.id, role: "Organiza" }],
      organizers: [{ email: "kimetzimetz@bilbohammer.test", role: "Coordinador" }],
      tags: ["liga", "aos", "campaña"],
    },
    {
      title: "Workshop de Pintura Épica",
      bannerUrl: "/assets/img/events/workshop-pintura.jpg",
      startsAt: setTime(addDays(baseDate, 12), 10),
      endsAt: setTime(addDays(baseDate, 12), 14),
      location: "Bilbohammer HQ - Sala de talleres",
      details:
        "Sesión práctica enfocada en técnicas de iluminación rápida, con materiales incluidos y guía paso a paso.",
      status: EventStatus.PUBLISHED,
      type: EventType.WORKSHOP,
      game: Juego.OTROS,
      priceGeneral: 12,
      priceSocios: 0,
      capacityMax: 16,
      organizations: [{ organizationId: bilbohammerOrg.id, role: "Organiza" }],
      organizers: [{ email: "andoni@bilbohammer.test", role: "Ponente" }],
      tags: ["workshop", "pintura"],
    },
    {
      title: "DKHM Open ESDLA",
      bannerUrl: "/assets/img/events/dkhm-esdla.jpg",
      startsAt: setTime(addDays(baseDate, 18), 9),
      endsAt: setTime(addDays(baseDate, 18), 18),
      location: "DKHM Club - Donostia",
      details:
        "Torneo regional de El Señor de los Anillos con escenarios competitivos y presencia de jugadores internacionales.",
      status: EventStatus.PUBLISHED,
      type: EventType.TOURNAMENT,
      game: Juego.ESDLA,
      priceGeneral: 20,
      priceSocios: null,
      organizations: [{ organizationId: dkhmOrg.id, role: "Organiza" }],
      organizers: [],
      tags: ["torneo", "esdla", "regional"],
    },
    {
      title: "Marvel Crisis Narrative Night",
      bannerUrl: "/assets/img/events/marvel-night.jpg",
      startsAt: setTime(addDays(baseDate, 3), 20),
      endsAt: setTime(addDays(baseDate, 3), 23),
      location: "Bar Pixel - Bilbao",
      details:
        "Quedada nocturna con misiones narrativas, música temática y premios a la mejor escenografía improvisada.",
      status: EventStatus.PUBLISHED,
      type: EventType.SOCIAL,
      game: Juego.MARVEL,
      priceGeneral: 0,
      priceSocios: 0,
      organizations: [
        { organizationId: bilbohammerOrg.id, role: "Organiza" },
        { organizationId: goblinForgeOrg.id, role: "Colabora" },
      ],
      organizers: [{ email: "gorka@bilbohammer.test", role: "Anfitrión" }],
      tags: ["social", "marvel"],
    },
    {
      title: "Narrativa The Old World - Primavera",
      bannerUrl: "/assets/img/events/tow-primavera.jpg",
      startsAt: setTime(addDays(baseDate, -45), 10),
      endsAt: setTime(addDays(baseDate, -45), 20),
      location: "Casa de Cultura - Getxo",
      details:
        "Campaña narrativa cerrada con cuatro mesas simultáneas y desenlace colaborativo. Incluye informe final.",
      status: EventStatus.FINALIZED,
      type: EventType.SOCIAL,
      game: Juego.TOW,
      priceGeneral: 18,
      priceSocios: 10,
      organizations: [{ organizationId: bilbohammerOrg.id, role: "Organiza" }],
      organizers: [{ email: "local@bilbohammer.test", role: "Narrador principal" }],
      tags: ["narrativa", "tow"],
    },
    {
      title: "Proyecto Secreto Narrative Beta",
      bannerUrl: "/assets/img/events/secreto-beta.jpg",
      startsAt: setTime(addDays(baseDate, 60), 11),
      endsAt: setTime(addDays(baseDate, 60), 18),
      location: "Local Bilbohammer - Sala Beta",
      details: "Evento interno en preparacion para socios con plazas limitadas y feedback obligatorio.",
      status: EventStatus.DRAFT,
      type: EventType.WORKSHOP,
      game: Juego.OTROS,
      priceGeneral: 25,
      priceSocios: 10,
      isInternal: true,
      isMembersOnly: true,
      organizations: [{ organizationId: bilbohammerOrg.id, role: "Organiza" }],
      organizers: [
        { email: "julexpuru@gmail.com", role: "Coordinación" },
        { email: "oauth@bilbohammer.test", role: "Apoyo logístico" },
      ],
      tags: ["beta", "interno"],
    },
  ];

  const createdEvents: { title: string; status: EventStatus; startsAt: Date }[] = [];

  for (const blueprint of eventsBlueprint) {
    const organizersData = blueprint.organizers
      .map((entry) => {
        const user = usersByEmail.get(entry.email);
        if (!user) return null;
        return {
          role: entry.role ?? null,
          user: { connect: { id: user.id } },
        };
      })
      .filter((entry): entry is { role: string | null; user: { connect: { id: number } } } => entry !== null);

    const eventData: Prisma.EventCreateInput = {
      title: blueprint.title,
      bannerUrl: blueprint.bannerUrl ?? null,
      startsAt: blueprint.startsAt,
      endsAt: blueprint.endsAt,
      location: blueprint.location ?? null,
      latitude: blueprint.latitude ?? null,
      longitude: blueprint.longitude ?? null,
      mapsUrl: blueprint.mapsUrl ?? null,
      details: blueprint.details ?? null,
      status: blueprint.status,
      type: blueprint.type,
      game: blueprint.game ?? null,
      priceGeneral: decimalOrNull(blueprint.priceGeneral),
      priceSocios: decimalOrNull(blueprint.priceSocios),
      isInternal: blueprint.isInternal ?? false,
      isMembersOnly: blueprint.isMembersOnly ?? false,
      organizations: {
        create: blueprint.organizations.map((org) => ({
          role: org.role ?? null,
          organization: { connect: { id: org.organizationId } },
        })),
      },
    };

    if (blueprint.capacityMax !== undefined) {
      eventData.capacityMax = blueprint.capacityMax;
    }
    if (blueprint.capacityCurrent !== undefined) {
      eventData.capacityCurrent = blueprint.capacityCurrent;
    }
    if (organizersData.length > 0) {
      eventData.organizers = { create: organizersData };
    }
    if (blueprint.tags.length > 0) {
      eventData.tags = { create: blueprint.tags.map((label) => ({ label })) };
    }

    const event = await prisma.event.create({ data: eventData });
    createdEvents.push({ title: event.title, status: event.status, startsAt: event.startsAt });
  }

  await prisma.notification.create({
    data: {
      title: "Mantenimiento",
      content: "La web estará en mantenimiento el lunes de 02:00 a 03:00.",
      visible: true,
    },
  });

  console.log("Seed generado", {
    usuarios: seededEmails.length,
    eventos: createdEvents.map((event) => `${event.title} (${event.status})`),
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
