import Link from "next/link";

export default function Page() {
  return (
    <section className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h1 className="text-3xl font-bold mb-2">Bienvenido a Bilbohammer</h1>
        <p className="text-[var(--muted)] mb-4">
          Club de juegos de mesa, wargames y buen ambiente. Aquí encontrarás
          nuestras últimas novedades, fotos de eventos y más información sobre el club.
        </p>
        <div className="flex gap-3">
          <Link href="/novedades" className="btn btn-accent">Ver Novedades</Link>
          <Link href="/sobre-nosotros" className="btn">Sobre Nosotros</Link>
        </div>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Próximos pasos</h2>
        <ul className="list-disc ml-6 space-y-2 text-[var(--muted)]">
          <li>Publicar noticias del club en <Link href="/novedades" className="link">Novedades</Link>.</li>
          <li>Subir fotos de partidas y torneos en <Link href="/galeria" className="link">Galería</Link>.</li>
          <li>Gestionar miembros y roles desde <span className="text-white">Admin</span> (privado).</li>
        </ul>
      </div>
    </section>
  );
}
