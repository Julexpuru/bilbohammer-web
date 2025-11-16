export const metadata = {
  title: "Politica de cookies | Bilbohammer",
  description:
    "Detalle de las cookies y almacenamiento local que utiliza la web de Bilbohammer y como puedes gestionarlos.",
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
    duration: "30 dias",
    purpose: "Mantener tu sesion iniciada y mostrar el contenido que corresponde a tu rol dentro del club.",
    notes: "En HTTPS el navegador la marca como __Secure y solo se transmite cifrada.",
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
    duration: "Sesion del navegador",
    purpose: "Recordar a que pagina volver despues de iniciar sesion o cerrar sesion.",
  },
  {
    name: "next-auth.pkce.code_verifier / next-auth.pkce.state",
    scope: "Cookie propia (NextAuth + OAuth Google)",
    duration: "15 minutos",
    purpose: "Finalizar de forma segura el inicio de sesion con Google cuando usas el boton de OAuth.",
  },
];

const preferenceStorage: StorageEntry[] = [
  {
    name: "bh-cookie-consent",
    scope: "Almacen local (propio)",
    duration: "Hasta que lo borres",
    purpose: "Guardar si aceptaste o rechazaste las cookies de analitica y la fecha del ultimo cambio.",
    notes: "Es un JSON con los campos analytics (true/false) y updatedAt. No contiene identificadores personales.",
  },
  {
    name: "bh-theme",
    scope: "Almacen local (propio)",
    duration: "Hasta que lo borres",
    purpose: "Recordar si prefieres el modo claro u oscuro para evitar parpadeos al cargar la pagina.",
  },
];

const analyticsStorage: StorageEntry[] = [
  {
    name: "Google Tag Manager (GTM-WBXCJ8QS)",
    scope: "Carga condicional",
    duration: "Solo si aceptas analiticas",
    purpose:
      "Gestionar las etiquetas de medicion (Google Analytics) que usamos para entender el trafico y mejorar la web.",
    notes: "Sin consentimiento no se carga ningun script de Google ni se crea la capa de datos dataLayer.",
  },
  {
    name: "_ga, _gid, _gat y derivados",
    scope: "Cookies de Google Analytics",
    duration: "_gid: 24 h | _ga: 14 meses | _gat: 1 min",
    purpose:
      "Asignar un identificador anonimo al dispositivo para obtener estadisticas agregadas (visitas, clicks, origen del trafico).",
    notes: "Solo aparecen despues de aceptar analiticas. Google es el responsable de estos identificadores.",
  },
];

export default function CookiePolicyPage() {
  const lastUpdatedLabel = "16 de noviembre de 2025";

  return (
    <div className="space-y-10">
      <section className="card space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-600)]">Privacidad</p>
        <h1 className="text-3xl font-semibold text-[var(--text)]">Politica de cookies</h1>
        <p>
          En Bilbohammer usamos cookies tecnicas y un minimo de almacenamiento local para poder iniciar sesion con
          seguridad, aplicar tus preferencias y, solo si nos das permiso explicito, medir el uso de la web mediante
          Google Tag Manager (GTM) y Google Analytics.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Responsable del tratamiento: Junta directiva de Bilbohammer. Puedes escribirnos a{" "}
          <a href="mailto:hola@bilbohammer.eus" className="underline hover:no-underline">
            hola@bilbohammer.eus
          </a>{" "}
          para ejercer tus derechos de acceso, rectificacion, supresion, oposicion o limitacion. Ultima actualizacion:
          {` ${lastUpdatedLabel}`}.
        </p>
      </section>

      <section className="card space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--text)]">1. Cookies tecnicas necesarias</h2>
          <p className="text-sm text-[var(--muted)]">
            Estas cookies las crea automaticamente NextAuth (sistema de acceso de la web). No almacenan contenido
            comercial ni se usan para publicidad. Si las bloqueas no podras iniciar sesion ni mantener tu rol activo.
          </p>
        </header>
        <StorageTable entries={essentialCookies} />
      </section>

      <section className="card space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--text)]">2. Preferencias guardadas en tu navegador</h2>
          <p className="text-sm text-[var(--muted)]">
            Usamos el almacenamiento local del navegador para recordar ajustes que dependen de tu dispositivo, como el
            consentimiento dado o el tema visual. No salen de tu equipo ni se sincronizan con terceros.
          </p>
        </header>
        <StorageTable entries={preferenceStorage} />
      </section>

      <section className="card space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--text)]">3. Analitica opcional</h2>
          <p className="text-sm text-[var(--muted)]">
            Google Tag Manager con el identificador GTM-WBXCJ8QS solo se ejecuta cuando eliges &ldquo;Aceptar todas&rdquo;
            en el banner de cookies. Mientras no aceptes (o pulses &ldquo;Rechazar analiticas&rdquo;) los scripts de
            Google no se cargan y no se envia ningun dato a servidores de terceros.
          </p>
        </header>
        <StorageTable entries={analyticsStorage} />
      </section>

      <section className="card space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--text)]">4. Como puedes gestionar o retirar tu consentimiento</h2>
        </header>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-[var(--text)]">
          <li>
            El banner de cookies aparece hasta que eliges una opcion. Mientras no aceptes, las analiticas permaneceran
            desactivadas.
          </li>
          <li>
            Si ya aceptaste y quieres cambiar de idea, elimina la entrada{" "}
            <code className="rounded bg-[var(--card-muted)] px-1 py-0.5 text-xs">bh-cookie-consent</code> desde los
            ajustes de cookies de tu navegador o borra los datos del sitio. La proxima vez que visites la web volveras a
            ver el banner para decidir de nuevo.
          </li>
          <li>
            Puedes borrar las cookies de Google Analytics desde la configuracion de cookies del navegador o instalar la{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              className="underline hover:no-underline"
              target="_blank"
              rel="noreferrer"
            >
              extension de inhabilitacion de Google Analytics
            </a>
            .
          </li>
          <li>
            Si necesitas ayuda, escribenos a{" "}
            <a href="mailto:hola@bilbohammer.eus" className="underline hover:no-underline">
              hola@bilbohammer.eus
            </a>{" "}
            indicando el dispositivo y navegador para que podamos guiarte.
          </li>
        </ol>
        <p className="text-sm text-[var(--muted)]">
          No utilizamos cookies de publicidad comportamental ni vendemos ningun tipo de dato a terceros. Las
          estadisticas de Google se usan unicamente para mejorar horarios, contenidos y carga de la web del club.
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
            <th className="px-4 py-3 text-left font-semibold">Duracion</th>
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
