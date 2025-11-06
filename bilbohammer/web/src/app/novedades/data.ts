export type ArticleCategory = "news" | "chronicles" | "members";

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  news: "Noticias",
  chronicles: "Crónicas",
  members: "Solo Socios",
};

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "image"; src: string; alt: string; caption?: string; layout?: "full" | "float-left" | "float-right" }
  | { type: "quote"; text: string; attribution?: string };

export type ArticleComment = {
  id: string;
  author: string;
  avatarInitials: string;
  postedAt: string;
  message: string;
  replies?: ArticleComment[];
};

export type Article = {
  id: string;
  category: ArticleCategory;
  categories: ArticleCategory[];
  slug: string;
  title: string;
  author: string;
  date: string;
  banner: string;
  tags: string[];
  summary: string;
  body: ArticleBlock[];
  comments: ArticleComment[];
};

export type ArticlesByCategory = Record<ArticleCategory, Article[]>;

export const NOVEDADES_ARTICLES: ArticlesByCategory = {
  news: [
    {
      id: "noticia-1",
      category: "news",
      categories: ["news"],
      slug: "campana-iniciacion-otono-2025",
      title: "Nueva campaña de iniciación de otoño",
      author: "La Junta de Bilbohammer",
      date: "2025-10-01",
      banner: "/assets/img/slide1.svg",
      tags: ["comunidad", "eventos", "aprendizaje"],
      summary:
        "Este otoño lanzamos la campaña de iniciación más ambiciosa del club para acercar los wargames a quienes aún no los han probado. Habrá sesiones guiadas, partidas de demostración y talleres adaptados a todos los niveles.",
      body: [
        {
          type: "paragraph",
          text: "Tras escuchar las sugerencias de la comunidad hemos diseñado una campaña de iniciación pensada para derribar todas las barreras habituales. Durante seis semanas abriremos la sala principal para sesiones guiadas, partidas de demostración y talleres de pintura accesibles.",
        },
        {
          type: "image",
          src: "/assets/img/slide1.svg",
          alt: "Mesa temática preparada para la campaña de iniciación",
          caption: "Las mesas narrativas y de demostración estarán listas cada semana.",
          layout: "float-right",
        },
        {
          type: "paragraph",
          text: "Cada martes y jueves se ofrecerán partidas introductorias con ejércitos proporcionados por la organización, mientras que los sábados reservaremos la tarde para mesas narrativas que mezclan Age of Sigmar y Warhammer 40.000. El equipo de mentores contará con un cuaderno de bienvenida con reglas simplificadas, glosario y recomendaciones para escoger tu primer ejército sin romper la hucha.",
        },
        {
          type: "heading",
          level: 2,
          text: "Actividades para todos los perfiles",
        },
        {
          type: "paragraph",
          text: "Queremos que nadie se quede fuera, así que habrá plazas reservadas para jugadores jóvenes, descuentos especiales para estudiantes y actividades inclusivas pensando en quienes nunca han tocado un dado de seis caras.",
        },
        {
          type: "quote",
          text: "El objetivo es que todo el mundo se sienta con la confianza de desplegar su primer ejército sin miedo a equivocarse.",
          attribution: "Equipo de Mentoría",
        },
      ],
      comments: [
        {
          id: "comment-100",
          author: "Ane García",
          avatarInitials: "AG",
          postedAt: "2025-10-02T18:45:00.000Z",
          message: "¡Qué ganas de ver la campaña en marcha! Si alguien necesita miniaturas prestadas para las demos, tengo Stormcast de sobra.",
        },
        {
          id: "comment-101",
          author: "Jon Ander",
          avatarInitials: "JA",
          postedAt: "2025-10-03T09:12:00.000Z",
          message: "¡Gracias Ane! Lo coordinamos por el canal de mentores.",
        },
      ],
    },
    {
      id: "noticia-2",
      category: "news",
      categories: ["news"],
      slug: "bilbohammer-open-2025",
      title: "Bilbohammer Open regresa en abril",
      author: "Comisión de Eventos",
      date: "2025-09-12",
      banner: "/assets/img/slide2.svg",
      tags: ["torneo", "competitivo"],
      summary:
        "Tras el éxito del año pasado el Bilbohammer Open vuelve con un formato ampliado a tres días, nuevas mesas temáticas y streaming en directo para las partidas destacadas.",
      body: [
        {
          type: "paragraph",
          text: "El Bilbohammer Open regresa del 11 al 13 de abril con un formato renovado. Habrá mesas temáticas construidas por el equipo de escenografía, streaming en directo y plazas abiertas tanto para veteranos como para quienes quieran estrenarse en el circuito competitivo.",
        },
        {
          type: "image",
          src: "/assets/img/slide2.svg",
          alt: "Jugadores participando en el Bilbohammer Open",
          caption: "El Open contará con cobertura en directo de las partidas destacadas.",
          layout: "full",
        },
        {
          type: "paragraph",
          text: "Las inscripciones se abrirán el 1 de noviembre y los socios tendrán prioridad durante las primeras 48 horas. El viernes estará dedicado a partidas amistosas y el fin de semana al torneo principal con seis rondas suizas.",
        },
      ],
      comments: [
        {
          id: "comment-200",
          author: "Mikel López",
          avatarInitials: "ML",
          postedAt: "2025-09-13T08:30:00.000Z",
          message: "¿Se sabe si habrá pack de bienvenida? El del año pasado estuvo genial.",
        },
      ],
    },
    {
      id: "noticia-3",
      category: "news",
      categories: ["news"],
      slug: "mejoras-en-la-sede",
      title: "Renovamos iluminación y mesas de juego",
      author: "Equipo de Infraestructuras",
      date: "2025-08-28",
      banner: "/assets/img/slide3.svg",
      tags: ["infraestructura", "club"],
      summary:
        "Durante el verano hemos actualizado la iluminación, reforzado las mesas modulares y creado un espacio de pintura con extracción y luz neutra.",
      body: [
        {
          type: "paragraph",
          text: "Aprovechamos agosto para realizar mejoras en la sede. Ahora contamos con un sistema de iluminación regulable por zonas y mesas modulares reforzadas que aguantan mejor los despliegues pesados.",
        },
        {
          type: "paragraph",
          text: "Además, habilitamos un espacio específico para pintura con extracción y luz neutra, y reorganizamos la escenografía para agilizar el montaje antes de cada actividad.",
        },
      ],
      comments: [
        {
          id: "comment-300",
          author: "Irati Mendizabal",
          avatarInitials: "IM",
          postedAt: "2025-08-29T16:20:00.000Z",
          message: "La zona de pintura ha quedado espectacular. ¡Gracias por el curro!",
        },
      ],
    },
  ],
  chronicles: [
    {
      id: "cronica-1",
      category: "chronicles",
      categories: ["chronicles"],
      slug: "liga-aos-jornada-3",
      title: "Crónica de la tercera jornada de la liga de Age of Sigmar",
      author: "Ane García",
      date: "2025-09-30",
      banner: "/assets/img/slide1.svg",
      tags: ["age of sigmar", "liga", "crónica"],
      summary:
        "La tercera jornada de la liga nos dejó duelos igualados y una remontada espectacular de los Seraphon en mesa uno.",
      body: [
        {
          type: "paragraph",
          text: "Los Seraphon de Julen consiguieron imponerse a los Fyreslayers de Maialen en un final de infarto. En la mesa dos debutó el nuevo ejército pintado por Irati, que se llevó la victoria tras completar todos los objetivos secundarios.",
        },
        {
          type: "quote",
          text: "Me pasé la semana pintando Kroxigors y al final fueron los héroes de la partida.",
          attribution: "Irati",
        },
      ],
      comments: [
        {
          id: "comment-400",
          author: "Maialen Urkijo",
          avatarInitials: "MU",
          postedAt: "2025-10-01T08:10:00.000Z",
          message: "Gran crónica Ane, me toca repasar despliegues para la próxima ronda.",
        },
      ],
    },
    {
      id: "cronica-2",
      category: "chronicles",
      categories: ["chronicles"],
      slug: "campana-path-to-glory",
      title: "Path to Glory: el clímax de la campaña",
      author: "Mikel López",
      date: "2025-08-10",
      banner: "/assets/img/slide2.svg",
      tags: ["campaña", "narrativo"],
      summary:
        "Tras cinco meses de partidas encadenadas llegamos al gran enfrentamiento final con alianzas cambiantes y tormentas arcanas.",
      body: [
        {
          type: "paragraph",
          text: "La mesa narrativa recreó un templo en ruinas, con objetivos secretos para cada bando. El momento decisivo llegó cuando Teclis arriesgó una disfunción mágica que cambió el orden de turnos y abrió la puerta a la remontada orruk.",
        },
      ],
      comments: [
        {
          id: "comment-500",
          author: "Leire Alonso",
          avatarInitials: "LA",
          postedAt: "2025-08-10T21:45:00.000Z",
          message: "¡Fue épico! Tengo fotos extra para la galería, las subo mañana.",
        },
      ],
    },
    {
      id: "cronica-3",
      category: "chronicles",
      categories: ["chronicles"],
      slug: "torneo-bienvenida-primeros-pasos",
      title: "Primeros pasos en el torneo de bienvenida",
      author: "Jon Ander",
      date: "2025-07-22",
      banner: "/assets/img/slide3.svg",
      tags: ["torneo", "principiantes"],
      summary:
        "Diez jugadores se estrenaron en el competitivo en un ambiente distendido con mentores circulando entre mesas.",
      body: [
        {
          type: "paragraph",
          text: "Las partidas se mantuvieron igualadas hasta la ronda final, cuando un destacamento de Guardia Veterana aseguró la misión secundaria decisiva. Todos los participantes se llevaron un kit de accesorios y un vale de pintura.",
        },
      ],
      comments: [
        {
          id: "comment-600",
          author: "Ander Pérez",
          avatarInitials: "AP",
          postedAt: "2025-07-23T12:00:00.000Z",
          message: "Gracias por la acogida, ya estoy preparando lista para la próxima edición.",
        },
      ],
    },
  ],
  members: [
    {
      id: "socio-1",
      category: "members",
      categories: ["members"],
      slug: "plan-de-escenografia-otono",
      title: "Plan de escenografía para otoño",
      author: "Coordinación de Escenografía",
      date: "2025-09-25",
      banner: "/assets/img/slide1.svg",
      tags: ["socio", "escenografía", "voluntariado"],
      summary:
        "Abrimos las inscripciones para los turnos de escenografía de octubre y noviembre. Cada sesión tendrá un foco específico y materiales disponibles en la sede.",
      body: [
        {
          type: "paragraph",
          text: "Habrá talleres de reparación, sesiones de aerógrafo y construcción de piezas modulares. Anímate a participar indicando tu disponibilidad en el formulario interno.",
        },
      ],
      comments: [
        {
          id: "comment-700",
          author: "Equipo de Escenografía",
          avatarInitials: "EE",
          postedAt: "2025-09-26T07:30:00.000Z",
          message: "Recordad apuntaros con antelación para equilibrar los equipos según experiencia.",
        },
      ],
    },
    {
      id: "socio-2",
      category: "members",
      categories: ["members"],
      slug: "sesiones-de-mentoria",
      title: "Mentorías tácticas personalizadas",
      author: "Equipo de Mentoría",
      date: "2025-09-05",
      banner: "/assets/img/slide2.svg",
      tags: ["socio", "formación"],
      summary:
        "Estrenamos un formato de mentorías uno a uno para socios que quieran pulir listas, profundizar en mecánicas avanzadas o preparar torneos.",
      body: [
        {
          type: "paragraph",
          text: "Cada bloque incluye análisis de lista, simulación de despliegues y revisión posterior a partida. Las reservas se gestionan por el canal privado de Discord.",
        },
      ],
      comments: [
        {
          id: "comment-800",
          author: "Asier Rodríguez",
          avatarInitials: "AR",
          postedAt: "2025-09-06T15:10:00.000Z",
          message: "Me apunto a una sesión sobre Kill Team, ¡gracias por organizarlo!",
        },
      ],
    },
    {
      id: "socio-3",
      category: "members",
      categories: ["members"],
      slug: "material-exclusivo",
      title: "Biblioteca de material exclusivo",
      author: "Secretaría",
      date: "2025-08-18",
      banner: "/assets/img/slide3.svg",
      tags: ["socio", "recursos"],
      summary:
        "Ampliamos la biblioteca interna con reglamentos descatalogados, suplementos narrativos y guías de pintura en gran formato para préstamo quincenal.",
      body: [
        {
          type: "paragraph",
          text: "Estamos catalogando todos los ejemplares para que el inventario sea visible desde el área privada. Si tienes peticiones concretas, dejamos abierto un hilo en la intranet.",
        },
      ],
      comments: [
        {
          id: "comment-900",
          author: "Secretaría",
          avatarInitials: "SC",
          postedAt: "2025-08-19T09:55:00.000Z",
          message: "Agradecemos propuestas de material adicional para las compras de final de año.",
        },
      ],
    },
  ],
};

export function listStaticArticles(): Article[] {
  return Object.values(NOVEDADES_ARTICLES).flat();
}

export function getStaticArticlesByCategory(category: ArticleCategory): Article[] {
  return NOVEDADES_ARTICLES[category] ?? [];
}

export function findStaticArticle(category: ArticleCategory, slug: string): Article | null {
  const article = getStaticArticlesByCategory(category).find((entry) => entry.slug === slug);
  return article ?? null;
}

export function collectArticleImages(article: Article): string[] {
  const seen = new Set<string>();
  const images: string[] = [];

  if (article.banner) {
    seen.add(article.banner);
    images.push(article.banner);
  }

  for (const block of article.body) {
    if (block.type === "image" && !seen.has(block.src)) {
      seen.add(block.src);
      images.push(block.src);
    }
  }

  return images;
}

