import { redirect } from "next/navigation";
import EventForm from "@/components/events/EventForm";
import { auth } from "@/auth";
import { userCanManageEvents } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const session = await auth();
  if (!userCanManageEvents(session)) {
    redirect("/eventos");
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Eventos</p>
        <h1 className="text-3xl font-semibold">Crear nuevo evento</h1>
        <p className="text-sm text-[var(--muted)]">
          Completa la informacion basica. Podras editarlo en cualquier momento.
        </p>
      </header>
      <EventForm mode="create" />
    </div>
  );
}
