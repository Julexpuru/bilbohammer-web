import EventsExplore from "@/components/events/EventsExplore";
import { auth } from "@/auth";
import { userCanManageEvents } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await auth();
  const canCreate = userCanManageEvents(session);

  return <EventsExplore canCreate={canCreate} />;
}
