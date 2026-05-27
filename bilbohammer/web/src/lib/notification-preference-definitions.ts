export const NOTIFICATION_PREFERENCE_DEFINITIONS = [
  {
    eventType: "SLOT_PROPOSAL_RECEIVED",
    label: "Nueva propuesta en una oferta mia",
    description: "Cuando alguien propone una partida sobre una oferta que he publicado.",
    inAppField: "proposalReceivedInApp",
    emailField: "proposalReceivedEmail",
    pushField: "proposalReceivedPush",
  },
  {
    eventType: "SLOT_PROPOSAL_ACCEPTED",
    label: "Propuesta aceptada",
    description: "Cuando aceptan una propuesta que yo he enviado.",
    inAppField: "proposalAcceptedInApp",
    emailField: "proposalAcceptedEmail",
    pushField: "proposalAcceptedPush",
  },
  {
    eventType: "SLOT_PROPOSAL_REJECTED",
    label: "Propuesta rechazada",
    description: "Cuando rechazan manualmente una propuesta que yo he enviado.",
    inAppField: "proposalRejectedInApp",
    emailField: "proposalRejectedEmail",
    pushField: "proposalRejectedPush",
  },
  {
    eventType: "SLOT_PROPOSAL_SUPERSEDED",
    label: "Propuesta descartada por otra aceptacion",
    description: "Cuando otra propuesta del mismo slot es aceptada y la mia queda fuera.",
    inAppField: "proposalSupersededInApp",
    emailField: "proposalSupersededEmail",
    pushField: "proposalSupersededPush",
  },
  {
    eventType: "MATCH_REMINDER",
    label: "Recordatorio de partida",
    description: "Antes de que empiece una partida confirmada en la que participo.",
    inAppField: "matchReminderInApp",
    emailField: "matchReminderEmail",
    pushField: "matchReminderPush",
  },
  {
    eventType: "COMPATIBLE_SLOT_CREATED",
    label: "Nueva oferta compatible",
    description: "Cuando alguien publica una oferta que encaja con mi horario habitual y mis juegos.",
    inAppField: "compatibleSlotInApp",
    emailField: "compatibleSlotEmail",
    pushField: "compatibleSlotPush",
  },
] as const;

export type NotificationPreferenceDefinition = (typeof NOTIFICATION_PREFERENCE_DEFINITIONS)[number];
export type NotificationPreferenceField =
  | NotificationPreferenceDefinition["inAppField"]
  | NotificationPreferenceDefinition["emailField"]
  | NotificationPreferenceDefinition["pushField"];

export type NotificationPreferenceState = Record<NotificationPreferenceField, boolean> & {
  matchReminderMinutes: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceState = {
  proposalReceivedInApp: true,
  proposalReceivedEmail: false,
  proposalReceivedPush: true,
  proposalAcceptedInApp: true,
  proposalAcceptedEmail: false,
  proposalAcceptedPush: true,
  proposalRejectedInApp: true,
  proposalRejectedEmail: false,
  proposalRejectedPush: true,
  proposalSupersededInApp: true,
  proposalSupersededEmail: false,
  proposalSupersededPush: true,
  matchReminderInApp: true,
  matchReminderEmail: false,
  matchReminderPush: true,
  matchReminderMinutes: 1440,
  compatibleSlotInApp: true,
  compatibleSlotEmail: false,
  compatibleSlotPush: true,
};
