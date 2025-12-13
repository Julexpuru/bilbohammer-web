export const metadata = {
  title: "Política de cookies | Bilbohammer",
  description:
    "Detalle de las cookies y almacenamiento local que utiliza la web de Bilbohammer y cómo puedes gestionarlos.",
};

type StorageEntry = {
  name: string;
  scope: string;
  duration: string;
  purpose: string;
  notes?: string;
};

const essentialCookies: StorageEntry[] = [
  {
    name: "next-auth.session-token / __Secure-next-auth.session-token",
    scope: "Cookie propia (NextAuth)",
    duration: "30 días",
    purpose: "Mantener tu sesión iniciada y mostrar el contenido que corresponde a tu rol dentro del club.",
    notes: "En HTTPS el navegador la marca cómo __Secure y solo se transmite cifrada.",
  },
  {
    name: "next-auth.csrf-token",
    scope: "Cookie propia (NextAuth)",
    duration: "24 horas",
    purpose: "Proteger los formularios de acceso frente a ataques CSRF.",
  },
  {
    name: "next-auth.callback-url",
    scope: "Cookie propia (NextAuth)",
    duration: "Sesión del navegador",
    purpose: "Recordar a que página volver después de iniciar sesión o cerrar sesión.",
  },
  {
    name: "next-auth.pkce.code_verifier / next-auth.pkce.state",
    scope: "Cookie propia (NextAuth + OAuth Google)",
    duration: "15 minutos",
    purpose: "Finalizar de forma segura el inicio de sesión con Google cuando usas el botón de OAuth.",
  },
];

const preferenceStorage: StorageEntry[] = [
  {
    name: "bh-cookie-consent",
    scope: "Almacén local (propio)",
    duration: "Hasta que lo borres",
    purpose: "Guardar si aceptaste o rechazaste las cookies de analítica y la fecha del último cambio.",
    notes: "Es un JSON con los campos analytics (true/false) y updatedAt. No contiene identificadores personales.",
  },
  {
    name: "bh-theme",
    scope: "Almacén local (propio)",
    duration: "Hasta que lo borres",
    purpose: "Recordar si prefieres el modo claro u oscuro para evitar parpadeos al cargar la página.",
  },
];

const analyticsStorage: StorageEntry[] = [
  {
    name: "Google Tag Manager (GTM-WBXCJ8QS)",
    scope: "Carga condicional",
    duration: "Solo si aceptas analíticas",
    purpose:
      "Gestionar las etiquetas de medición (Google Analytics) que usamos para entender el tráfico y mejorar la web.",
    notes: "Sin consentimiento no se carga ningún script de Google ni se crea la capa de datos dataLayer.",
  },
  {
    name: "_ga, _gid, _gat y derivados",
    scope: "Cookies de Google Analytics",
    duration: "_gid: 24 h | _ga: 14 meses | _gat: 1 min",
    purpose:
      "Asignar un identificador anónimo al dispositivo para obtener estadísticas agregadas (visitas, clicks, origen del tráfico).",
    notes: "Solo aparecen después de aceptar analíticas. Google es el responsable de estos identificadores.",
  },
];

export default function CookiePolicyPage() {
  const lastUpdatedLabel = "16 de noviembre de 2025";

  return (
    <div className="space-y-10">
      <section className="card space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-600)]">Privacidad</p>
        <h1 className="text-3xl font-semibold text-[var(--text)]">Política de cookies</h1>
        <p>
          En Bilbohammer usamos cookies técnicas y un mínimo de almacenamiento local para poder iniciar sesión con
          seguridad, aplicar tus preferencias y, solo si nos das permiso explícito, medir el uso de la web mediante
          Google Tag Manager (GTM) y Google Analytics.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Responsable del tratamiento: Junta directiva de Bilbohammer. Puedes escribirnos a{" "}
          <a href="mailto:hola@bilbohammer.eus" className="underline hover:no-underline">
            hola@bilbohammer.eus
          </a>{" "}
          para ejercer tus derechos de acceso, rectificación, supresión, oposición o limitación. Última actualización:
          {` ${lastUpdatedLabel}`}.
        </p>
      </section>

      <section className="card space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--text)]">1. Cookies técnicas necesarias</h2>
          <p className="text-sm text-[var(--muted)]">
            Estas cookies las crea automáticamente NextAuth (sistema de acceso de la web). No almacenan contenido
            comercial ni se usan para publicidad. Si las bloqueas no podrás iniciar sesión ni mantener tu rol activo.
          </p>
        </header>
        <StorageTable entries={essentialCookies} />
      </section>

      <section className="card space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--text)]">2. Preferencias guardadas en tu navegador</h2>
          <p className="text-sm text-[var(--muted)]">
            Usamos el almacenamiento local del navegador para recordar ajustes que dependen de tu dispositivo, cómo el
            consentimiento dado o el tema visual. No salen de tu equipo ni se sincronizan con terceros.
          </p>
        </header>
        <StorageTable entries={preferenceStorage} />
      </section>

      <section className="card space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--text)]">3. Analítica opcional</h2>
          <p className="text-sm text-[var(--muted)]">
            Google Tag Manager con el identificador GTM-WBXCJ8QS solo se ejecuta cuando eliges &ldquo;Aceptar todas&rdquo;
            en el banner de cookies. Mientras no aceptes (o pulses &ldquo;Rechazar analíticas&rdquo;) los scripts de
            Google no se cargan y no se envía ningún dato a servidores de terceros.
          </p>
        </header>
        <StorageTable entries={analyticsStorage} />
      </section>

      <section className="card space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--text)]">4. Cómo puedes gestionar o retirar tu consentimiento</h2>
        </header>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-[var(--text)]">
          <li>
            El banner de cookies aparece hasta que eliges una opción. Mientras no aceptes, las analíticas permanecerán
            desactivadas.
          </li>
          <li>
            Si ya aceptaste y quieres cambiar de idea, elimina la entrada{" "}
            <code className="rounded bg-[var(--card-muted)] px-1 py-0.5 text-xs">bh-cookie-consent</code> desde los
            ajustes de cookies de tu navegador o borra los datos del sitio. La próxima vez que visites la web volverás a
            ver el banner para decidir de nuevo.
          </li>
          <li>
            Puedes borrar las cookies de Google Analytics desde la configuración de cookies del navegador o instalar la{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              className="underline hover:no-underline"
              target="_blank"
              rel="noreferrer"
            >
              extensión de inhabilitación de Google Analytics
            </a>
            .
          </li>
          <li>
            Si necesitas ayuda, escríbenos a{" "}
            <a href="mailto:hola@bilbohammer.eus" className="underline hover:no-underline">
              hola@bilbohammer.eus
            </a>{" "}
            indicando el dispositivo y navegador para que podamos guiarte.
          </li>
        </ol>
        <p className="text-sm text-[var(--muted)]">
          No utilizamos cookies de publicidad comportamental ni vendemos ningún tipo de dato a terceros. Las
          estadísticas de Google se usan únicamente para mejorar horarios, contenidos y carga de la web del club.
        </p>
      </section>
    </div>
  );
}

function StorageTable({ entries }: { entries: StorageEntry[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)]">
      <table className="w-full text-sm text-[var(--text)]">
        <thead className="bg-[var(--card)] text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Nombre</th>
            <th className="px-4 py-3 text-left font-semibold">Tipo / alcance</th>
            <th className="px-4 py-3 text-left font-semibold">Duración</th>
            <th className="px-4 py-3 text-left font-semibold">Finalidad</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.name} className="border-t border-[var(--hairline)]">
              <td className="align-top px-4 py-3 font-semibold">{entry.name}</td>
              <td className="align-top px-4 py-3 text-sm text-[var(--muted)]">{entry.scope}</td>
              <td className="align-top px-4 py-3 text-sm">{entry.duration}</td>
              <td className="align-top px-4 py-3 text-sm">
                <p>{entry.purpose}</p>
                {entry.notes ? <p className="mt-2 text-[var(--muted)]">{entry.notes}</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
