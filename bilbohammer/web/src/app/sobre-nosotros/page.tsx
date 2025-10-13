export default function AboutPage() {
  const sectionStyle = { scrollMarginTop: "calc(var(--nav-h) + 24px)" } as const;

  return (
    <div className="space-y-10">
      <section className="card space-y-3">
        <h1 className="text-3xl font-semibold">Sobre Bilbohammer</h1>
        <p className="text-[var(--muted)]">
          Bilbohammer es una asociación sin ánimo de lucro que reúne a personas apasionadas por los wargames,
          los juegos de mesa y las buenas historias compartidas alrededor de una mesa. Nuestro objetivo es crear
          un punto de encuentro amable, organizado y lleno de actividades para la afición en Bizkaia.
        </p>
      </section>

      <section id="quienes-somos" className="card space-y-4" style={sectionStyle}>
        <header>
          <h2 className="text-2xl font-semibold">¿Quiénes somos?</h2>
        </header>
        <p>
          Somos jugadores y jugadoras de todas las edades con ganas de aprender, enseñar y compartir. La junta
          del club coordina el calendario y los recursos del local, mientras que las comisiones de juego se
          encargan de organizar ligas, campañas narrativas o jornadas de puertas abiertas. Siempre hay un hueco
          para nuevas personas socias y amistades del club.
        </p>
        <ul className="list-disc space-y-1 pl-6 text-sm opacity-90">
          <li>Local equipado con mesas modulares, escenografía y biblioteca de reglas.</li>
          <li>Calendario anual de ligas y torneos oficiales de los principales sistemas.</li>
          <li>Actividades sociales: jornadas temáticas, talleres de pintura y eventos solidarios.</li>
        </ul>
      </section>

      <section id="juegos" className="card space-y-4" style={sectionStyle}>
        <header>
          <h2 className="text-2xl font-semibold">Juegos</h2>
        </header>
        <p>
          El catálogo de mesas del club está pensado para que puedas alternar entre sistemas competitivos y
          campañas narrativas sin cambiar de espacio. Mantenemos colecciones de escenografía y tapetes para los
          juegos más demandados y registramos qué grupos están activos para ayudarte a encontrar rival.
        </p>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
            <h3 className="text-base font-semibold">Wargames principales</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 opacity-90">
              <li>Warhammer 40,000 y The Old World</li>
              <li>Age of Sigmar y Middle-Earth SBG</li>
              <li>MCP, Kill Team y otros formatos escaramuza</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
            <h3 className="text-base font-semibold">Juegos de mesa y rol</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 opacity-90">
              <li>Noches de juegos de mesa modernos y clásicos</li>
              <li>Campañas de rol dirigidas y espacios para one-shots</li>
              <li>Sesiones de pintura y montaje compartidas</li>
            </ul>
          </div>
        </div>
        <p className="text-sm opacity-90">
          Si quieres proponer un sistema nuevo, coordínalo con la junta: podremos reservar mesas, difundir la
          convocatoria y ayudarte con la logística inicial.
        </p>
      </section>

      <section id="tablon-de-socios" className="card space-y-4" style={sectionStyle}>
        <header>
          <h2 className="text-2xl font-semibold">Tablón de socios</h2>
        </header>
        <p>
          El tablón es el lugar donde centralizamos la comunicación interna: anuncios importantes, actas de
          asambleas y encuestas para decidir las próximas campañas. Estamos trabajando en enlazar esta sección
          con el área privada de la web para que el acceso sea automático una vez inicies sesión.
        </p>
        <p className="text-sm opacity-90">
          Mientras tanto, seguimos utilizando nuestros canales habituales de Discord y correo electrónico para
          convocar votaciones rápidas e informar de cualquier novedad relevante.
        </p>
      </section>

      <section id="contacto" className="card space-y-4" style={sectionStyle}>
        <header>
          <h2 className="text-2xl font-semibold">Contacto</h2>
        </header>
        <p>
          ¿Quieres venir a probar una partida o necesitas más información? Escríbenos y te responderemos lo antes
          posible. También puedes seguir nuestras redes sociales para no perderte los anuncios públicos.
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-semibold">Email:</span> <a className="link" href="mailto:hola@bilbohammer.eus">hola@bilbohammer.eus</a>
          </li>
          <li>
            <span className="font-semibold">Instagram:</span> <a className="link" href="https://instagram.com/bilbohammer" target="_blank" rel="noreferrer">@bilbohammer</a>
          </li>
          <li>
            <span className="font-semibold">Dirección del local:</span> Bilbao (confirmamos ubicación exacta al reservar mesa).
          </li>
        </ul>
      </section>
    </div>
  );
}
