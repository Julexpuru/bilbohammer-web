import Link from "next/link";

export const metadata = {
  title: "Contacto | Bilbohammer",
  description:
    "Encuentra todas las formas de hablar con Bilbohammer: redes sociales, correo electronico y ubicacion del local.",
};

const contactChannels = [
  {
    label: "Correo electronico",
    value: "hola@bilbohammer.eus",
    href: "mailto:hola@bilbohammer.eus",
    description: "La via mas rapida para dudas generales, reservas de mesa y gestiones con la junta.",
  },
  {
    label: "Instagram",
    value: "@bilbohammer",
    href: "https://instagram.com/bilbohammer",
    description: "Publicamos anuncios de eventos, resultados de torneos y fotos de las quedadas semanales.",
  },
  {
    label: "Discord",
    value: "Servidor privado",
    href: "https://discord.gg/bilbohammer",
    description: "Espacio interno para coordinar partidas, compartir listas y charlar sobre pintura.",
  },
];

const visitInfo = [
  {
    title: "Direccion del local",
    lines: ["Barrio de Deusto, Bilbao", "Se comparte ubicacion exacta al reservar plaza."],
  },
  {
    title: "Horarios habituales",
    lines: ["Jueves y viernes de 18:30 a 22:30", "Sabados de 10:00 a 14:00 segun actividad"],
  },
  {
    title: "Acceso",
    lines: ["Edificio con ascensor y rampa en la entrada", "Aparcamiento libre en calles aledanas"],
  },
];

const supportNotes = [
  {
    title: "Reservas de mesa",
    text: "Indica juego, formato y si traes material propio. Asi asignamos mejor las mesas y escenografia.",
  },
  {
    title: "Visitas de prueba",
    text: "Escribe con antelacion para que alguien de la junta te reciba y te presente el local.",
  },
  {
    title: "Colaboraciones",
    text: "Si quieres organizar un evento conjunto o promocionar un proyecto, cuentanos los detalles por correo.",
  },
];

export default function ContactoPage() {
  return (
    <div className="space-y-10">
      <section className="card space-y-3">
        <h1 className="text-3xl font-semibold">Contacto</h1>
        <p>
          Aqui tienes todos nuestros canales de comunicacion. Elige el que mejor se ajuste a tu consulta y nos
          pondremos en contacto lo antes posible.
        </p>
      </section>

      <section className="card space-y-6">
        <header>
          <h2 className="text-2xl font-semibold">Canales principales</h2>
          <p className="text-sm text-[var(--muted)]">
            Escritos llegan a la junta en el mismo dia. Si no recibes respuesta en 48 horas, reenvia tu mensaje o
            revisa spam.
          </p>
        </header>
        <ul className="space-y-4">
          {contactChannels.map((channel) => (
            <li
              key={channel.label}
              className="rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-lg font-semibold text-[var(--text)]">{channel.label}</span>
                <Link
                  href={channel.href}
                  className="text-sm text-[var(--accent-600)] underline underline-offset-4"
                  target={channel.href.startsWith("http") ? "_blank" : undefined}
                  rel={channel.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  {channel.value}
                </Link>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{channel.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-6">
        <header>
          <h2 className="text-2xl font-semibold">Visitanos</h2>
          <p className="text-sm text-[var(--muted)]">
            Compartimos la ubicacion exacta cuando confirmamos tu reserva para proteger la privacidad del espacio.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {visitInfo.map((item) => (
            <div key={item.title} className="rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
              <h3 className="text-base font-semibold text-[var(--text)]">{item.title}</h3>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {item.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <header>
          <h2 className="text-2xl font-semibold">Antes de escribir</h2>
          <p className="text-sm text-[var(--muted)]">
            Cuanta mas informacion compartas, mas rapido podremos ayudarte o reservarte plaza.
          </p>
        </header>
        <ul className="grid gap-4 md:grid-cols-3">
          {supportNotes.map((note) => (
            <li key={note.title} className="rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
              <h3 className="text-base font-semibold text-[var(--text)]">{note.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{note.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
