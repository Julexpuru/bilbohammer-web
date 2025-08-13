"use client";
import useSWR from "swr";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function EventsCalendar() {
  const { data } = useSWR("/api/events", fetcher);

  return (
    <section className="card mt-8">
      <h2 className="text-xl font-semibold mb-4">Calendario</h2>
      {!data ? (
        <p className="text-sm opacity-70">Cargando…</p>
      ) : data.length === 0 ? (
        <p className="text-sm opacity-70">No hay eventos programados.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((e: any) => (
            <li key={e.id} className="flex gap-3">
              <span className="badge">{new Date(e.startsAt).toLocaleDateString()}</span>
              <div>
                <p className="font-medium">{e.title}</p>
                {e.location && <p className="text-sm opacity-75">{e.location}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
