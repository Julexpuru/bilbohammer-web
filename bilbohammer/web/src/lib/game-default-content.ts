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
      "<p>Warhammer 40,000 es el motor principal del club: combinamos ligas, campanas narrativas y torneos puntuables. Si empiezas desde cero siempre encontraras a alguien dispuesto a ensenarte.</p>",
      "<ul>",
      "  <li>Calendario trimestral con noches fijas entre semana y torneos puntuables.</li>",
      "  <li>Escenografia propia y tapetes listos para formatos de 2000, 1500 y 1000 puntos.</li>",
      "  <li>Grupo de aprendizaje con partidas dirigidas para nuevos jugadores.</li>",
      "</ul>",
    ]),
    investment: "Desde 150 EUR",
    playtime: "2.5 - 3 h",
    learning: "Alta",
    contactDisplay: "Julen · Junta",
    contactNote: "Coordinacion principal del sistema.",
  },
  aos: {
    summary: "Age of Sigmar reune a todos los perfiles de juego.",
    contentHtml: block([
      "<p>Alternamos ligas cortas con campanas narrativas para mantener la escena variada. Viajamos juntos a eventos del norte y cuidamos cada mesa para representar los Reinos Mortales.</p>",
      "<ul>",
      "  <li>Mini ligas de cuatro semanas para no saturar agendas.</li>",
      "  <li>Escenografia tematizada y tapetes de 44x60 y 60x44.</li>",
      "  <li>Coordinamos desplazamientos a torneos cercanos.</li>",
      "</ul>",
    ]),
    investment: "Desde 140 EUR",
    playtime: "2 - 2.5 h",
    learning: "Media",
    contactDisplay: "Kimetz · Junta",
  },
  tow: {
    summary: "El regreso del Old World con campanas de mapa.",
    contentHtml: block([
      "<p>Recuperamos el espiritu clasico con campanas por territorios, partidas narrativas y quedadas especiales para grandes batallas. Restauramos minis antiguas y compartimos recursos de trasfondo.</p>",
      "<ul>",
      "  <li>Campanas de mapa con seguimiento digital de resultados.</li>",
      "  <li>Quedadas mensuales para partidas epicas.</li>",
      "  <li>Talleres de restauracion y pintura clasica.</li>",
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
      "<p>Ofrecemos escenarios competitivos y campanas cooperativas inspiradas en los libros. La escenografia recrea ruinas, bosques y minas emblematicas para cada mision.</p>",
      "<ul>",
      "  <li>Narrativas basadas en los libros y peliculas.</li>",
      "  <li>Escenografia tematica propia y compartida con otros clubs.</li>",
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
      "<p>La liga anual incluye draft de franquicias, playoffs y cronicas semanales. Cada jornada se juega en estadios tematizados con escenografia modular para ambientar el campo.</p>",
      "<ul>",
      "  <li>Liga anual con clasificacion y premios tematicos.</li>",
      "  <li>Gestor online para fichajes y cronicas.</li>",
      "  <li>Escenografia modular para personalizar cada estadio.</li>",
      "</ul>",
    ]),
    investment: "Desde 95 EUR",
    playtime: "2 - 2.5 h",
    learning: "Media",
    contactDisplay: "Kimetz · Junta",
  },
  marvel: {
    summary: "Partidas dinamicas y eventos tematicos de comic.",
    contentHtml: block([
      "<p>Marvel Crisis Protocol es ideal si buscas dinamismo. Organizamos ligas cortas, escenarios caseros y talleres de escenografia urbana para ambientar las mesas.</p>",
      "<ul>",
      "  <li>Ligas rapidas de seis jornadas.</li>",
      "  <li>Talleres de escenografia urbana y pintura de minis.</li>",
      "  <li>Eventos tematicos con reglas caseras inspiradas en sagas del comic.</li>",
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
      "<p>Coordinamos campanas trimestrales de rol y mesas abiertas para partidas de una sesion. Si eres director, te ayudamos con material y reservas.</p>",
      "<ul>",
      "  <li>Calendario de campanas con plazas rotativas.</li>",
      "  <li>Partidas one-shot en fines de semana alternos.</li>",
      "  <li>Biblioteca de manuales basicos disponible en el local.</li>",
      "</ul>",
    ]),
    investment: "Desde 35 EUR",
    playtime: "2 - 4 h",
    learning: "Baja",
    contactDisplay: "Ariane · Junta",
  },
  magic: {
    summary: "Paupers, commander y quedadas de iniciacion.",
    contentHtml: block([
      "<p>La comunidad de Magic organiza ligas de formato Pauper y Commander social. Compartimos mazos de inicio para introducir a gente nueva.</p>",
      "<ul>",
      "  <li>Liga Pauper con resultados en linea.</li>",
      "  <li>Quedadas de Commander casual con mesas equilibradas.</li>",
      "  <li>Mazos de demostracion disponibles para principiantes.</li>",
      "</ul>",
    ]),
    investment: "Desde 60 EUR",
    playtime: "60 - 90 min",
    learning: "Media",
    contactDisplay: "Iker · Socio",
  },
  boardgames: {
    summary: "Modernos, clasicos y noches tematicas.",
    contentHtml: block([
      "<p>Cada mes organizamos una noche de juegos de mesa con tematicas cambiantes. Tambien tenemos biblioteca con clasicos y euros modernos.</p>",
      "<ul>",
      "  <li>Noches tematicas (cooperativos, fillers, euros).</li>",
      "  <li>Biblioteca con mas de 80 juegos disponibles.</li>",
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
      "<p>Si quieres impulsar un juego distinto, podemos reservar mesas, ayudarte con la difusion y buscar gente interesada.</p>",
      "<ul>",
      "  <li>Reserva de mesas y escenografia segun necesidad.</li>",
      "  <li>Difusion en redes y canal interno de Discord.</li>",
      "  <li>Apoyo de la junta para primeras jornadas de demo.</li>",
      "</ul>",
    ]),
    investment: "Variable",
    playtime: "Segun juego",
    learning: "Variable",
    contactDisplay: "Junta · Coordinacion",
    contactNote: "Escribe a hola@bilbohammer.eus para proponer tu sistema.",
  },
};

