import { EventStatus } from "@prisma/client";

type EventStatusInput = {
  status: EventStatus;
  startsAt: Date;
  endsAt: Date;
  registrationClosesAt?: Date | null;
};

export function getComputedEventStatus(event: EventStatusInput, now = new Date()): EventStatus {
  if (
    event.status === EventStatus.DRAFT ||
    event.status === EventStatus.FINALIZED ||
    event.status === EventStatus.CANCELLED ||
    event.status === EventStatus.POSTPONED
  ) {
    return event.status;
  }

  const nowTime = now.getTime();
  if (event.endsAt.getTime() < nowTime) {
    return EventStatus.FINALIZED;
  }
  if (event.startsAt.getTime() <= nowTime && event.endsAt.getTime() >= nowTime) {
    return EventStatus.IN_PROGRESS;
  }
  if (
    event.registrationClosesAt &&
    event.registrationClosesAt.getTime() <= nowTime &&
    event.registrationClosesAt.getTime() < event.startsAt.getTime()
  ) {
    return EventStatus.PREPARATION;
  }

  return event.status;
}
