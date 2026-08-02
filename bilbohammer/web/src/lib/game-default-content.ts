export type GameDefaultContent = {
  summary: string;
  contentHtml: string;
  investment: string;
  playtime: string;
  learning: string;
  contactDisplay: string;
  contactNote?: string;
};

function block(lines: string[]): string {
  return lines.join("\n");
}

export const GAME_DEFAULT_CONTENT: Record<string, GameDefaultContent> = {
  w40k: {
    summary: "Competitivo, narrativo y siempre con mesas llenas.",
    contentHtml: block([
      "<p>Warhammer 40,000 es el motor principal del club: combinamos ligas, campañas narrativas y torneos puntuables. Si empiezas desde cero siempre encontrarás a alguien dispuesto a enseñarte.</p>",
      "<ul>",
      "  <li>Calendario trimestral con noches fijas entre semana y torneos puntuables.</li>",
      "  <li>Escenografía propia y tapetes listos para formatos de 2000, 1500 y 1000 puntos.</li>",
      "  <li>Grupo de aprendizaje con partidas dirigidas para nuevos jugadores.</li>",
      "</ul>",
    ]),
    investment: "Desde 150 EUR",
    playtime: "2.5 - 3 h",
    learning: "Alta",
    contactDisplay: "Julen · Junta",
    contactNote: "Coordinación principal del sistema.",
  },
  aos: {
    summary: "Age of Sigmar reúne a todos los perfiles de juego.",
    contentHtml: block([
      "<p>Alternamos ligas cortas con campañas narrativas para mantener la escena variada. Viajamos juntos a eventos del norte y cuidamos cada mesa para representar los Reinos Mortales.</p>",
      "<ul>",
      "  <li>Mini ligas de cuatro semanas para no saturar agendas.</li>",
      "  <li>Escenografía tematizada y tapetes de 44x60 y 60x44.</li>",
      "  <li>Coordinamos desplazamientos a torneos cercanos.</li>",
      "</ul>",
    ]),
    investment: "Desde 140 EUR",
    playtime: "2 - 2.5 h",
    learning: "Media",
    contactDisplay: "Kimetz · Junta",
  },
  tow: {
    summary: "El regreso del Old World con campañas de mapa.",
    contentHtml: block([
      "<p>Recuperamos el espíritu clásico con campañas por territorios, partidas narrativas y quedadas especiales para grandes batallas. Restauramos minis antiguas y compartimos recursos de trasfondo.</p>",
      "<ul>",
      "  <li>Campañas de mapa con seguimiento digital de resultados.</li>",
      "  <li>Quedadas mensuales para partidas épicas.</li>",
      "  <li>Talleres de restauración y pintura clásica.</li>",
      "</ul>",
    ]),
    investment: "Desde 180 EUR",
    playtime: "3 - 4 h",
    learning: "Media",
    contactDisplay: "Andoni · Socio",
  },
  esdla: {
    summary: "Escenarios de la Tierra Media con mimo tematico.",
    contentHtml: block([
      "<p>Ofrecemos escenarios competitivos y campañas cooperativas inspiradas en los libros. La escenografía recrea ruinas, bosques y minas emblemáticas para cada misión.</p>",
      "<ul>",
      "  <li>Narrativas basadas en los libros y peliculas.</li>",
      "  <li>Escenografía temática propia y compartida con otros clubs.</li>",
      "  <li>Quedadas cruzadas con asociaciones vecinas.</li>",
      "</ul>",
    ]),
    investment: "Desde 120 EUR",
    playtime: "2 h",
    learning: "Media",
    contactDisplay: "Andoni · Socio",
  },
  bb: {
    summary: "Blood Bowl asegura risas, drama y ranking anual.",
    contentHtml: block([
      "<p>La liga anual incluye draft de franquicias, playoffs y crónicas semanales. Cada jornada se juega en estadios tematizados con escenografía modular para ambientar el campo.</p>",
      "<ul>",
      "  <li>Liga anual con clasificación y premios temáticos.</li>",
      "  <li>Gestor online para fichajes y crónicas.</li>",
      "  <li>Escenografía modular para personalizar cada estadio.</li>",
      "</ul>",
    ]),
    investment: "Desde 95 EUR",
    playtime: "2 - 2.5 h",
    learning: "Media",
    contactDisplay: "Kimetz · Junta",
  },
  marvel: {
    summary: "Partidas dinámicas y eventos temáticos de cómic.",
    contentHtml: block([
      "<p>Marvel Crisis Protocol es ideal si buscas dinamismo. Organizamos ligas cortas, escenarios caseros y talleres de escenografía urbana para ambientar las mesas.</p>",
      "<ul>",
      "  <li>Ligas rápidas de seis jornadas.</li>",
      "  <li>Talleres de escenografía urbana y pintura de minis.</li>",
      "  <li>Eventos temáticos con reglas caseras inspiradas en sagas del cómic.</li>",
      "</ul>",
    ]),
    investment: "Desde 110 EUR",
    playtime: "90 - 120 min",
    learning: "Media",
    contactDisplay: "Ariane · Junta",
  },
  rol: {
    summary: "Historias compartidas con plazas limitadas.",
    contentHtml: block([
      "<p>Coordinamos campañas trimestrales de rol y mesas abiertas para partidas de una sesión. Si eres director, te ayudamos con material y reservas.</p>",
      "<ul>",
      "  <li>Calendario de campañas con plazas rotativas.</li>",
      "  <li>Partidas one-shot en fines de semana alternos.</li>",
      "  <li>Biblioteca de manuales básicos disponible en el local.</li>",
      "</ul>",
    ]),
    investment: "Desde 35 EUR",
    playtime: "2 - 4 h",
    learning: "Baja",
    contactDisplay: "Ariane · Junta",
  },
  magic: {
    summary: "Paupers, commander y quedadas de iniciación.",
    contentHtml: block([
      "<p>La comunidad de Magic organiza ligas de formato Pauper y Commander social. Compartimos mazos de inicio para introducir a gente nueva.</p>",
      "<ul>",
      "  <li>Liga Pauper con resultados en línea.</li>",
      "  <li>Quedadas de Commander casual con mesas equilibradas.</li>",
      "  <li>Mazos de demostración disponibles para principiantes.</li>",
      "</ul>",
    ]),
    investment: "Desde 60 EUR",
    playtime: "60 - 90 min",
    learning: "Media",
    contactDisplay: "Iker · Socio",
  },
  boardgames: {
    summary: "Modernos, clásicos y noches temáticas.",
    contentHtml: block([
      "<p>Cada mes organizamos una noche de juegos de mesa con temáticas cambiantes. Tambien tenemos biblioteca con clásicos y euros modernos.</p>",
      "<ul>",
      "  <li>Noches temáticas (cooperativos, fillers, euros).</li>",
      "  <li>Biblioteca con más de 80 juegos disponibles.</li>",
      "  <li>Actividades abiertas para amistades del club.</li>",
      "</ul>",
    ]),
    investment: "Desde 45 EUR",
    playtime: "45 - 120 min",
    learning: "Baja",
    contactDisplay: "Miren · Socia",
  },
  otros: {
    summary: "Siempre hay hueco para nuevas propuestas.",
    contentHtml: block([
      "<p>Si quieres impulsar un juego distinto, podemos reservar mesas, ayudarte con la difusión y buscar gente interesada.</p>",
      "<ul>",
      "  <li>Reserva de mesas y escenografía según necesidad.</li>",
      "  <li>Difusión en redes y canal interno de Discord.</li>",
      "  <li>Apoyo de la junta para primeras jornadas de demo.</li>",
      "</ul>",
    ]),
    investment: "Variable",
    playtime: "Según juego",
    learning: "Variable",
    contactDisplay: "Junta · Coordinación",
    contactNote: "Escribe a bilbohammer@gmail.com para proponer tu sistema.",
  },
};

