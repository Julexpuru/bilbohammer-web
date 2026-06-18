import {
  prisma,
} from "@/lib/prisma";
import {
  type Prisma,
  type AvailabilitySlot,
  type Match,
  type User,
  type UserNotificationPreference,
  Rol,
  UserNotificationChannel,
  UserNotificationDeliveryStatus,
  UserNotificationType,
} from "@prisma/client";
import webpush from "web-push";
import { formatClubDateTime } from "@/lib/date-format";
import { absoluteSiteUrl } from "@/lib/site-url";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { getSlotPreferenceGameIds } from "@/lib/organized-slot-metadata";
import { buildEventSlug } from "@/lib/events/slug";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCE_DEFINITIONS,
  type NotificationPreferenceDefinition,
  type NotificationPreferenceField,
} from "@/lib/notification-preference-definitions";

const DEFAULT_NOTIFICATION_LINK = "/juego-organizado/mis-partidas";
const DEFAULT_NOTIFICATION_LIMIT = 20;
const MAX_REMINDER_LOOKAHEAD_DAYS = 7;
const CLUB_TIMEZONE = "Europe/Madrid";

type DisplayUser = {
  email?: string | null;
  name?: string | null;
  nick?: string | null;
};

type CreateUserNotificationInput = {
  recipientUserId: number;
  type: UserNotificationType;
  title: string;
  body: string;
  actorUserId?: number | null;
  linkUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
  dedupeKey?: string | null;
};

type MarkNotificationsReadInput = {
  ids?: string[];
  all?: boolean;
};

type DeleteNotificationsInput = {
  ids?: string[];
  all?: boolean;
};

type ProposalNotificationInput = {
  recipientUserId: number;
  actorUserId?: number | null;
  actorName: string;
  gameName?: string | null;
  proposedStart: Date;
  proposedEnd: Date;
  slotId: string;
  proposalId: string;
  matchId?: string | null;
};

type ReminderMatch = Match & {
  game: { id: string; name: string } | null;
  participants: Array<{ userId: number; user: Pick<User, "id" | "email" | "name" | "nick"> }>;
};

type CompatibleSlot = AvailabilitySlot & {
  game: { id: string; name: string } | null;
  creator: Pick<User, "id" | "email" | "name" | "nick">;
};

type CompetitiveReportNotificationInput = {
  reportId: string;
  actorUserId?: number | null;
};

const BOOLEAN_PREFERENCE_FIELDS = NOTIFICATION_PREFERENCE_DEFINITIONS.flatMap((definition) => [
  definition.inAppField,
  definition.emailField,
  definition.pushField,
]) as NotificationPreferenceField[];

function getPreferenceDefinition(eventType: UserNotificationType): NotificationPreferenceDefinition {
  const definition = NOTIFICATION_PREFERENCE_DEFINITIONS.find((item) => item.eventType === eventType);
  if (!definition) {
    throw new Error(`No hay definicion de preferencias para ${eventType}.`);
  }
  return definition;
}

function isInAppEnabled(preferences: UserNotificationPreference, eventType: UserNotificationType) {
  const definition = getPreferenceDefinition(eventType);
  return preferences[definition.inAppField];
}

function isEmailEnabled(preferences: UserNotificationPreference, eventType: UserNotificationType) {
  const definition = getPreferenceDefinition(eventType);
  return preferences[definition.emailField];
}

function isPushEnabled(preferences: UserNotificationPreference, eventType: UserNotificationType) {
  const definition = getPreferenceDefinition(eventType);
  return preferences[definition.pushField];
}

function isPushConfigured() {
  return Boolean(
    (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) &&
      process.env.VAPID_PRIVATE_KEY
  );
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:no-reply@bilbohammer.local",
    publicKey,
    privateKey
  );
  return true;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getGamePhrase(gameName?: string | null) {
  return gameName ? ` de ${gameName}` : "";
}

function formatWindow(start: Date, end: Date) {
  const day = formatClubDateTime(start, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const startTime = formatClubDateTime(start, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const endTime = formatClubDateTime(end, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${day} de ${startTime} a ${endTime}`;
}

function getClubDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLUB_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const weekdayIndex = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday);

  return {
    weekday: weekdayIndex >= 0 ? weekdayIndex : 0,
    minutes: hour * 60 + minute,
  };
}

function overlapsMinutes(start: number, end: number, targetStart: number, targetEnd: number) {
  return start < targetEnd && end > targetStart;
}

export function getUserDisplayName(user: DisplayUser) {
  return user.nick?.trim() || user.name?.trim() || user.email?.trim() || "Un socio";
}

export async function getOrCreateNotificationPreferences(userId: number) {
  return prisma.userNotificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function listUserNotifications(userId: number, limit = DEFAULT_NOTIFICATION_LIMIT) {
  const take = Number.isFinite(limit) && limit > 0 ? Math.min(Math.trunc(limit), 50) : DEFAULT_NOTIFICATION_LIMIT;
  const [notifications, unreadCount, preferences] = await Promise.all([
    prisma.userNotification.findMany({
      where: {
        userId,
        visibleInApp: true,
      },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.userNotification.count({
      where: {
        userId,
        visibleInApp: true,
        readAt: null,
      },
    }),
    getOrCreateNotificationPreferences(userId),
  ]);

  return {
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      linkUrl: notification.linkUrl,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    })),
    unreadCount,
    preferences: serializeNotificationPreferences(preferences),
  };
}

export async function markUserNotificationsRead(userId: number, input: MarkNotificationsReadInput) {
  const ids = Array.isArray(input.ids)
    ? input.ids.map((value) => value.trim()).filter(Boolean)
    : [];

  const where = input.all
    ? {
        userId,
        visibleInApp: true,
        readAt: null,
      }
    : {
        userId,
        visibleInApp: true,
        readAt: null,
        id: { in: ids.length > 0 ? ids : ["__none__"] },
      };

  const result = await prisma.userNotification.updateMany({
    where,
    data: {
      readAt: new Date(),
    },
  });

  return result.count;
}

export async function deleteUserNotifications(userId: number, input: DeleteNotificationsInput) {
  const ids = Array.isArray(input.ids)
    ? input.ids.map((value) => value.trim()).filter(Boolean)
    : [];

  const where = input.all
    ? {
        userId,
        visibleInApp: true,
      }
    : {
        userId,
        visibleInApp: true,
        id: { in: ids.length > 0 ? ids : ["__none__"] },
      };

  const result = await prisma.userNotification.updateMany({
    where,
    data: {
      visibleInApp: false,
      readAt: new Date(),
    },
  });

  return result.count;
}

export async function updateUserNotificationPreferences(
  userId: number,
  patch: Partial<Record<NotificationPreferenceField, boolean>> & { matchReminderMinutes?: number }
) {
  const data: Partial<Record<NotificationPreferenceField, boolean>> = {};

  for (const field of BOOLEAN_PREFERENCE_FIELDS) {
    if (typeof patch[field] === "boolean") {
      data[field] = patch[field];
    }
  }

  const minutes = Number(patch.matchReminderMinutes);
  const matchReminderMinutes =
    Number.isFinite(minutes) && minutes >= 15 && minutes <= 7 * 24 * 60 ? Math.trunc(minutes) : null;

  return prisma.userNotificationPreference.upsert({
    where: { userId },
    update: {
      ...data,
      ...(matchReminderMinutes != null ? { matchReminderMinutes } : {}),
    },
    create: {
      userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...data,
      ...(matchReminderMinutes != null ? { matchReminderMinutes } : {}),
    },
  });
}

export function serializeNotificationPreferences(preferences: UserNotificationPreference) {
  return {
    proposalReceivedInApp: preferences.proposalReceivedInApp,
    proposalReceivedEmail: preferences.proposalReceivedEmail,
    proposalReceivedPush: preferences.proposalReceivedPush,
    proposalAcceptedInApp: preferences.proposalAcceptedInApp,
    proposalAcceptedEmail: preferences.proposalAcceptedEmail,
    proposalAcceptedPush: preferences.proposalAcceptedPush,
    proposalRejectedInApp: preferences.proposalRejectedInApp,
    proposalRejectedEmail: preferences.proposalRejectedEmail,
    proposalRejectedPush: preferences.proposalRejectedPush,
    proposalSupersededInApp: preferences.proposalSupersededInApp,
    proposalSupersededEmail: preferences.proposalSupersededEmail,
    proposalSupersededPush: preferences.proposalSupersededPush,
    matchReminderInApp: preferences.matchReminderInApp,
    matchReminderEmail: preferences.matchReminderEmail,
    matchReminderPush: preferences.matchReminderPush,
    matchReminderMinutes: preferences.matchReminderMinutes,
    matchCancelledInApp: preferences.matchCancelledInApp,
    matchCancelledEmail: preferences.matchCancelledEmail,
    matchCancelledPush: preferences.matchCancelledPush,
    compatibleSlotInApp: preferences.compatibleSlotInApp,
    compatibleSlotEmail: preferences.compatibleSlotEmail,
    compatibleSlotPush: preferences.compatibleSlotPush,
  };
}

async function recordNotificationDelivery(input: {
  notificationId: string;
  channel: UserNotificationChannel;
  status: UserNotificationDeliveryStatus;
  error?: string | null;
}) {
  await prisma.userNotificationDelivery.create({
    data: {
      notificationId: input.notificationId,
      channel: input.channel,
      status: input.status,
      error: input.error ?? null,
      sentAt: input.status === UserNotificationDeliveryStatus.SENT ? new Date() : null,
    },
  });
}

async function deliverNotificationEmail(input: {
  notificationId: string;
  to: string | null;
  title: string;
  body: string;
  linkUrl?: string | null;
}) {
  if (!input.to) {
    await recordNotificationDelivery({
      notificationId: input.notificationId,
      channel: UserNotificationChannel.EMAIL,
      status: UserNotificationDeliveryStatus.SKIPPED,
      error: "Usuario sin correo disponible.",
    });
    return;
  }

  if (!isMailConfigured()) {
    await recordNotificationDelivery({
      notificationId: input.notificationId,
      channel: UserNotificationChannel.EMAIL,
      status: UserNotificationDeliveryStatus.SKIPPED,
      error: "SMTP no configurado.",
    });
    return;
  }

  const linkUrl = absoluteSiteUrl(input.linkUrl ?? DEFAULT_NOTIFICATION_LINK);
  const subject = `Bilbohammer: ${input.title}`;
  const escapedTitle = escapeHtml(input.title);
  const escapedBody = escapeHtml(input.body);

  try {
    await sendMail({
      to: input.to,
      subject,
      text: `${input.title}\n\n${input.body}\n\n${linkUrl}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111827">
          <h2 style="margin-bottom:12px">${escapedTitle}</h2>
          <p style="margin-bottom:16px">${escapedBody}</p>
          <p style="margin-bottom:16px">
            <a href="${escapeHtml(linkUrl)}" style="color:#0f766e;font-weight:600">Abrir juego organizado</a>
          </p>
          <p style="font-size:12px;color:#6b7280">Puedes ajustar estas notificaciones desde el centro de notificaciones de la web.</p>
        </div>
      `,
    });

    await recordNotificationDelivery({
      notificationId: input.notificationId,
      channel: UserNotificationChannel.EMAIL,
      status: UserNotificationDeliveryStatus.SENT,
    });
  } catch (error) {
    await recordNotificationDelivery({
      notificationId: input.notificationId,
      channel: UserNotificationChannel.EMAIL,
      status: UserNotificationDeliveryStatus.FAILED,
      error: error instanceof Error ? error.message : "Fallo desconocido al enviar email.",
    });
  }
}

async function deliverNotificationPush(input: {
  notificationId: string;
  userId: number;
  title: string;
  body: string;
  linkUrl?: string | null;
}) {
  if (!isPushConfigured() || !configureWebPush()) {
    await recordNotificationDelivery({
      notificationId: input.notificationId,
      channel: UserNotificationChannel.PUSH,
      status: UserNotificationDeliveryStatus.SKIPPED,
      error: "VAPID no configurado.",
    });
    return;
  }

  const subscriptions = await prisma.userPushSubscription.findMany({
    where: {
      userId: input.userId,
      revokedAt: null,
    },
  });

  if (subscriptions.length === 0) {
    await recordNotificationDelivery({
      notificationId: input.notificationId,
      channel: UserNotificationChannel.PUSH,
      status: UserNotificationDeliveryStatus.SKIPPED,
      error: "Sin dispositivos suscritos.",
    });
    return;
  }

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.linkUrl ?? DEFAULT_NOTIFICATION_LINK,
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );
        await prisma.userPushSubscription.update({
          where: { id: subscription.id },
          data: { lastSeenAt: new Date() },
        });
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await prisma.userPushSubscription.update({
            where: { id: subscription.id },
            data: { revokedAt: new Date() },
          });
        }
        throw error;
      }
    })
  );

  const sent = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - sent;

  await recordNotificationDelivery({
    notificationId: input.notificationId,
    channel: UserNotificationChannel.PUSH,
    status: sent > 0 ? UserNotificationDeliveryStatus.SENT : UserNotificationDeliveryStatus.FAILED,
    error: failed > 0 ? `${failed} envio(s) push fallidos.` : null,
  });
}

export async function createUserNotification(input: CreateUserNotificationInput) {
  const [recipient, preferences] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.recipientUserId },
      select: { id: true, email: true },
    }),
    getOrCreateNotificationPreferences(input.recipientUserId),
  ]);

  if (!recipient) return null;

  const inAppEnabled = isInAppEnabled(preferences, input.type);
  const emailEnabled = isEmailEnabled(preferences, input.type);
  const pushEnabled = isPushEnabled(preferences, input.type);

  if (!inAppEnabled && !emailEnabled && !pushEnabled) {
    return null;
  }

  let notification;
  try {
    notification = await prisma.userNotification.create({
      data: {
        userId: input.recipientUserId,
        type: input.type,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl ?? DEFAULT_NOTIFICATION_LINK,
        metadata: input.metadata,
        dedupeKey: input.dedupeKey ?? null,
        actorUserId: input.actorUserId ?? null,
        visibleInApp: inAppEnabled,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002" && input.dedupeKey) {
      return null;
    }
    throw error;
  }

  if (emailEnabled) {
    await deliverNotificationEmail({
      notificationId: notification.id,
      to: recipient.email ?? null,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl ?? DEFAULT_NOTIFICATION_LINK,
    });
  }

  if (pushEnabled) {
    await deliverNotificationPush({
      notificationId: notification.id,
      userId: input.recipientUserId,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl ?? DEFAULT_NOTIFICATION_LINK,
    });
  }

  return notification;
}

export async function notifySlotProposalReceived(input: ProposalNotificationInput) {
  const when = formatWindow(input.proposedStart, input.proposedEnd);
  return createUserNotification({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId ?? null,
    type: UserNotificationType.SLOT_PROPOSAL_RECEIVED,
    title: "Nueva propuesta en tu oferta",
    body: `${input.actorName} te ha propuesto una partida${getGamePhrase(input.gameName)} para ${when}.`,
    metadata: {
      slotId: input.slotId,
      proposalId: input.proposalId,
    },
  });
}

export async function notifySlotProposalAccepted(input: ProposalNotificationInput) {
  const when = formatWindow(input.proposedStart, input.proposedEnd);
  return createUserNotification({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId ?? null,
    type: UserNotificationType.SLOT_PROPOSAL_ACCEPTED,
    title: "Han aceptado tu propuesta",
    body: `${input.actorName} ha aceptado tu propuesta${getGamePhrase(input.gameName)} para ${when}.`,
    metadata: {
      slotId: input.slotId,
      proposalId: input.proposalId,
      matchId: input.matchId ?? null,
    },
  });
}

export async function notifySlotProposalRejected(input: ProposalNotificationInput) {
  const when = formatWindow(input.proposedStart, input.proposedEnd);
  return createUserNotification({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId ?? null,
    type: UserNotificationType.SLOT_PROPOSAL_REJECTED,
    title: "Han rechazado tu propuesta",
    body: `${input.actorName} ha rechazado tu propuesta${getGamePhrase(input.gameName)} para ${when}.`,
    metadata: {
      slotId: input.slotId,
      proposalId: input.proposalId,
    },
  });
}

export async function notifySlotProposalSuperseded(input: ProposalNotificationInput) {
  const when = formatWindow(input.proposedStart, input.proposedEnd);
  return createUserNotification({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId ?? null,
    type: UserNotificationType.SLOT_PROPOSAL_SUPERSEDED,
    title: "Tu propuesta ya no sigue disponible",
    body: `${input.actorName} ha aceptado otra propuesta para la franja ${when}, asi que la tuya${getGamePhrase(input.gameName)} ha quedado descartada.`,
    metadata: {
      slotId: input.slotId,
      proposalId: input.proposalId,
    },
  });
}

export async function notifyMatchReminder(input: {
  recipientUserId: number;
  matchId: string;
  gameName?: string | null;
  startsAt: Date;
  endsAt: Date;
}) {
  const when = formatWindow(input.startsAt, input.endsAt);
  return createUserNotification({
    recipientUserId: input.recipientUserId,
    type: UserNotificationType.MATCH_REMINDER,
    title: "Tu partida empieza pronto",
    body: `Tienes una partida${getGamePhrase(input.gameName)} programada para ${when}.`,
    dedupeKey: `match-reminder:${input.matchId}:${input.recipientUserId}`,
    metadata: {
      matchId: input.matchId,
    },
  });
}

export async function notifyMatchCancelled(input: {
  recipientUserId: number;
  actorUserId?: number | null;
  actorName: string;
  matchId: string;
  gameName?: string | null;
  startsAt: Date;
  endsAt: Date;
}) {
  const when = formatWindow(input.startsAt, input.endsAt);
  return createUserNotification({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId ?? null,
    type: UserNotificationType.MATCH_CANCELLED,
    title: "Han cancelado tu partida",
    body: `${input.actorName} ha cancelado tu partida${getGamePhrase(input.gameName)} prevista para ${when}.`,
    dedupeKey: `match-cancelled:${input.matchId}:${input.recipientUserId}`,
    metadata: {
      matchId: input.matchId,
    },
  });
}

export async function dispatchDueMatchReminders(now = new Date()) {
  const maxUntil = new Date(now.getTime() + MAX_REMINDER_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  const matches = await prisma.match.findMany({
    where: {
      status: { in: ["CONFIRMED", "IN_PLAY"] },
      startsAt: {
        gt: now,
        lte: maxUntil,
      },
    },
    include: {
      game: { select: { id: true, name: true } },
      participants: {
        where: { status: "CONFIRMED" },
        include: {
          user: { select: { id: true, email: true, name: true, nick: true } },
        },
      },
    },
  });

  let created = 0;
  for (const match of matches as ReminderMatch[]) {
    for (const participant of match.participants) {
      const preferences = await getOrCreateNotificationPreferences(participant.userId);
      const notifyAt = new Date(match.startsAt.getTime() - preferences.matchReminderMinutes * 60 * 1000);
      if (notifyAt > now) continue;

      const notification = await notifyMatchReminder({
        recipientUserId: participant.userId,
        matchId: match.id,
        gameName: match.game?.name ?? null,
        startsAt: match.startsAt,
        endsAt: match.endsAt,
      });
      if (notification) created += 1;
    }
  }

  return { checkedMatches: matches.length, created };
}

export async function notifyCompatibleSlotCreated(slotId: string) {
  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: slotId },
    include: {
      game: { select: { id: true, name: true } },
      creator: { select: { id: true, email: true, name: true, nick: true } },
    },
  });

  if (!slot || slot.status !== "OPEN") return { created: 0, candidates: 0 };

  const slotGameIds = getSlotPreferenceGameIds(slot);
  if (slotGameIds.length === 0) return { created: 0, candidates: 0 };

  const startParts = getClubDateParts(slot.start);
  const endParts = getClubDateParts(slot.end);
  const slotEndMinutes = endParts.weekday === startParts.weekday ? endParts.minutes : 24 * 60;

  const recurring = await prisma.recurringAvailability.findMany({
    where: {
      userId: { not: slot.creatorId },
      weekday: startParts.weekday,
      preferredGames: { hasSome: slotGameIds },
    },
    include: {
      user: { select: { id: true, email: true, name: true, nick: true } },
    },
  });

  let created = 0;
  const notifiedUsers = new Set<number>();
  const when = formatWindow(slot.start, slot.end);
  const actorName = getUserDisplayName(slot.creator);

  for (const row of recurring) {
    if (notifiedUsers.has(row.userId)) continue;
    if (!overlapsMinutes(startParts.minutes, slotEndMinutes, row.startMinutes, row.endMinutes)) {
      continue;
    }

    const notification = await createUserNotification({
      recipientUserId: row.userId,
      actorUserId: slot.creatorId,
      type: UserNotificationType.COMPATIBLE_SLOT_CREATED,
      title: "Nueva oferta compatible",
      body: `${actorName} ha publicado una oferta compatible con tu horario habitual para ${when}.`,
      dedupeKey: `compatible-slot:${slot.id}:${row.userId}`,
      metadata: {
        slotId: slot.id,
        gameIds: slotGameIds,
      },
    });

    notifiedUsers.add(row.userId);
    if (notification) created += 1;
  }

  return { created, candidates: recurring.length };
}

export async function notifyCompetitiveReportPending(input: CompetitiveReportNotificationInput) {
  const report = await prisma.competitiveMatchReport.findUnique({
    where: { id: input.reportId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          organizers: { select: { userId: true } },
        },
      },
      players: { orderBy: { participantOrder: "asc" } },
      submittedBy: { select: { id: true, nick: true, name: true, email: true } },
    },
  });

  if (!report?.event) return { created: 0, recipients: 0 };

  const admins = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: { hasSome: [Rol.ADMIN, Rol.JUNTA] },
    },
    select: { id: true },
  });
  const recipients = new Set<number>([
    ...report.event.organizers.map((organizer) => organizer.userId),
    ...admins.map((admin) => admin.id),
  ]);
  if (input.actorUserId != null) recipients.delete(input.actorUserId);

  const eventSlug = buildEventSlug(report.event.id, report.event.title);
  const playerLabels = report.players.map((player) => player.displayName).filter(Boolean).join(" vs ");
  const actorName = report.submittedBy ? getUserDisplayName(report.submittedBy) : "Un jugador";
  let created = 0;

  for (const recipientUserId of recipients) {
    const notification = await createUserNotification({
      recipientUserId,
      actorUserId: input.actorUserId ?? report.submittedById,
      type: UserNotificationType.COMPETITIVE_REPORT_PENDING,
      title: "Reporte competitivo pendiente",
      body: `${actorName} ha enviado un resultado pendiente en ${report.event.title}${playerLabels ? `: ${playerLabels}` : "."}`,
      linkUrl: `/eventos/${eventSlug}/reportes`,
      dedupeKey: `competitive-report-pending:${report.id}:${recipientUserId}`,
      metadata: {
        reportId: report.id,
        eventId: report.event.id,
      },
    });
    if (notification) created += 1;
  }

  return { created, recipients: recipients.size };
}

export async function notifyCompetitiveReportReviewed(input: CompetitiveReportNotificationInput & { approved: boolean }) {
  const report = await prisma.competitiveMatchReport.findUnique({
    where: { id: input.reportId },
    include: {
      event: { select: { id: true, title: true } },
      players: { orderBy: { participantOrder: "asc" } },
      approvedMatch: { select: { id: true } },
    },
  });

  if (!report?.event || !report.submittedById) return null;

  const eventSlug = buildEventSlug(report.event.id, report.event.title);
  const playerLabels = report.players.map((player) => player.displayName).filter(Boolean).join(" vs ");
  const approved = input.approved;

  return createUserNotification({
    recipientUserId: report.submittedById,
    actorUserId: input.actorUserId ?? report.reviewedById,
    type: approved ? UserNotificationType.COMPETITIVE_REPORT_APPROVED : UserNotificationType.COMPETITIVE_REPORT_REJECTED,
    title: approved ? "Resultado aprobado" : "Resultado rechazado",
    body: approved
      ? `Tu resultado en ${report.event.title}${playerLabels ? ` (${playerLabels})` : ""} ha sido aprobado.`
      : `Tu resultado en ${report.event.title}${playerLabels ? ` (${playerLabels})` : ""} ha sido rechazado${report.rejectionReason ? `: ${report.rejectionReason}` : "."}`,
    linkUrl: approved && report.approvedMatch
      ? `/eventos/${eventSlug}/competitivo/partidas/${report.approvedMatch.id}`
      : `/eventos/${eventSlug}/competitivo`,
    dedupeKey: `competitive-report-${approved ? "approved" : "rejected"}:${report.id}:${report.submittedById}`,
    metadata: {
      reportId: report.id,
      eventId: report.event.id,
      approvedMatchId: report.approvedMatch?.id ?? null,
    },
  });
}
