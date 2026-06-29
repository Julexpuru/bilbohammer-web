import Image from "next/image";
import { assetUrl } from "@/lib/assets";

export const metadata = {
  title: "Quienes somos | Bilbohammer",
  description:
    "Conoce el origen de Bilbohammer, nuestro proposito como club y como cuidamos a la comunidad de jugadores en Bizkaia.",
};

const values = [
  {
    title: "Espiritu de comunidad",
    description:
      "Buscamos que cualquier persona aficionada tenga un lugar seguro donde compartir mesa, aprender y proponer actividades.",
  },
  {
    title: "Organizacion y cuidado del espacio",
    description:
      "Mantenemos mesas, escenografía y material común para que cada quedada se sienta preparada y acogedora.",
  },
  {
    title: "Promocion de la aficion",
    description:
      "Visibilizamos eventos, demostraciones y talleres para acercar el hobby a gente nueva y apoyar a los grupos ya consolidados.",
  },
];

const milestones = [
  {
    year: "2018",
    title: "Primer local compartido",
    description: "Un pequeno almacen en el centro de Bilbao con dos mesas y muchas ganas de crecer.",
  },
  {
    year: "2021",
    title: "Constitucion como asociacion",
    description: "Formalizamos la junta, los estatutos y abrimos la puerta a nuevas altas de socios.",
  },
  {
    year: "2024",
    title: "Nuevo espacio para ligas",
    description: "Incorporamos mesas modulares, escenografía propia y calendario regular de ligas y talleres.",
  },
];

export default function QuienesSomosPage() {
  return (
    <div className="space-y-10">
      <section className="card grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] md:items-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold">Quienes somos</h1>
          <p>
            Bilbohammer nace del entusiasmo de un grupo de personas que queria compartir partidas, pintura y proyectos
            de wargames sin depender de tiendas ni eventos puntuales. Hoy somos una asociacion abierta donde conviven
            ligas competitivas, campanas narrativas y quedadas para juegos de mesa y rol.
          </p>
          <p className="text-sm text-[var(--muted)]">
            Somos un equipo totalmente voluntario que invierte tiempo en mantener el local, preparar escenografía,
            organizar eventos y acompanarte si es tu primera visita. Sin la comunidad no habria club.
          </p>
        </div>
        <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)]">
          <Image
            src={assetUrl("/assets/img/slide2.svg")}
            alt="Ilustracion del espacio de juego de Bilbohammer"
            fill
            className="object-cover"
            priority
          />
        </div>
      </section>

      <section className="card space-y-6">
        <header>
          <h2 className="text-2xl font-semibold">Nuestros valores</h2>
          <p className="text-sm text-[var(--muted)]">
            Todas las decisiones del club se orientan a mantener un espacio inclusivo, ordenado y con buen ambiente.
          </p>
        </header>
        <dl className="grid gap-6 md:grid-cols-3">
          {values.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5 shadow-sm"
            >
              <dt className="text-lg font-semibold">{item.title}</dt>
              <dd className="mt-2 text-sm text-[var(--muted)]">{item.description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card space-y-6">
        <header>
          <h2 className="text-2xl font-semibold">Hitos recientes</h2>
          <p className="text-sm text-[var(--muted)]">
            Seguimos creciendo paso a paso gracias a las cuotas de socios y a la implicacion constante de la junta.
          </p>
        </header>
        <ol className="space-y-4">
          {milestones.map((milestone) => (
            <li
              key={milestone.year}
              className="rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] px-5 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm uppercase tracking-wide text-[var(--accent-600)]">{milestone.year}</span>
                <span className="text-base font-semibold">{milestone.title}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{milestone.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
