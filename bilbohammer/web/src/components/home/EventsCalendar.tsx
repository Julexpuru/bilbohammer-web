"use client";

import Link from "next/link";
import useSWR from "swr";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type EventSummary = {
  id: string;
  title: string;
  startsAt: string;
  location?: string | null;
};

export default function EventsCalendar() {
  const { data } = useSWR<EventSummary[]>("/api/events", fetcher);

  return (
    <section className="card mt-8">
      <h2 className="mb-4 text-xl font-semibold">Calendario</h2>
      {!data ? (
        <p className="text-sm opacity-70">Cargando...</p>
      ) : data.length === 0 ? (
        <p className="text-sm opacity-70">No hay eventos programados.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span className="badge">
                {new Date(event.startsAt).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
              <div>
                <Link
                  href={`/eventos/${event.id}`}
                  className="font-medium text-white transition hover:underline"
                >
                  {event.title}
                </Link>
                {event.location && (
                  <p className="text-sm opacity-75">{event.location}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
