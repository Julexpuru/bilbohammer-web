import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { cloneContactContent, type ContactPageContent, type WhatsappEntry } from "@/lib/contact-content-data";

export type { ContactPageContent, WhatsappEntry } from "@/lib/contact-content-data";

function cloneDefaultContent(): ContactPageContent {
  return cloneContactContent();
}

export function contactDefaultContent(): ContactPageContent {
  return cloneDefaultContent();
}

export async function loadContactContent(): Promise<ContactPageContent> {
  try {
    const entry = await prisma.siteContent.findUnique({
      where: { key: "contact-page" },
    });
    if (!entry) return cloneDefaultContent();
    const parsed = entry.content as Partial<ContactPageContent> | null;
    return mergeWithDefaults(parsed);
  } catch (error) {
    console.warn("[contact-content] No se pudo cargar siteContent.contact-page", error);
    return cloneDefaultContent();
  }
}

export function mergeWithDefaults(partial: Partial<ContactPageContent> | null | undefined): ContactPageContent {
  if (!partial) return cloneDefaultContent();
  const base = cloneDefaultContent();
  return {
    intro: partial.intro ?? base.intro,
    whatsapp: {
      description: partial.whatsapp?.description ?? base.whatsapp.description,
      entries: Array.isArray(partial.whatsapp?.entries)
        ? partial.whatsapp.entries.map(normalizeWhatsappEntry)
        : base.whatsapp.entries,
      community: partial.whatsapp && "community" in partial.whatsapp
        ? normalizeCommunity(partial.whatsapp.community)
        : normalizeCommunity(base.whatsapp.community),
    },
    instagram: {
      description: partial.instagram?.description ?? base.instagram.description,
      handle: partial.instagram?.handle ?? base.instagram.handle,
      url: partial.instagram?.url ?? base.instagram.url,
    },
    email: {
      description: partial.email?.description ?? base.email.description,
      address: partial.email?.address ?? base.email.address,
    },
    discord: {
      description: partial.discord?.description ?? base.discord.description,
      inviteUrl: partial.discord?.inviteUrl ?? base.discord.inviteUrl,
    },
    visit: {
      description: partial.visit?.description ?? base.visit.description,
      schedule: {
        title: base.visit.schedule.title,
        lines: Array.isArray(partial.visit?.schedule?.lines)
          ? partial.visit.schedule.lines
          : base.visit.schedule.lines,
      },
      access: {
        title: base.visit.access.title,
        lines: Array.isArray(partial.visit?.access?.lines)
          ? partial.visit.access.lines
          : base.visit.access.lines,
      },
    },
    membership: {
      intro: partial.membership?.intro ?? base.membership.intro,
      requirements: partial.membership?.requirements ?? base.membership.requirements,
      pricing: partial.membership?.pricing ?? base.membership.pricing,
      benefits: partial.membership?.benefits ?? base.membership.benefits,
    },
  };
}

function normalizeWhatsappEntry(entry: WhatsappEntry | undefined): WhatsappEntry {
  if (!entry) {
    return cloneDefaultContent().whatsapp.entries[0];
  }
  const role = typeof entry.role === "string" ? entry.role.trim() : "";
  const name = typeof entry.name === "string" ? entry.name.trim() : "";
  const phone = typeof entry.phone === "string" ? entry.phone.trim() : "";
  const note =
    typeof entry.note === "string"
      ? entry.note.trim() || null
      : entry.note ?? null;
  const whatsappUrl =
    typeof entry.whatsappUrl === "string"
      ? entry.whatsappUrl.trim() || null
      : entry.whatsappUrl ?? null;

  return {
    id: entry.id || randomUUID(),
    role: role || "Contacto",
    name: name || "Miembro del club",
    phone: phone || "",
    note,
    whatsappUrl,
  };
}

function normalizeCommunity(
  community: ContactPageContent["whatsapp"]["community"] | undefined | null,
): ContactPageContent["whatsapp"]["community"] {
  if (!community) return null;
  const label = community.label?.trim();
  const url = community.url?.trim();
  if (!label || !url) return null;
  return {
    label,
    url,
    description: community.description?.trim() || null,
  };
}

export async function saveContactContent(payload: ContactPageContent) {
  await prisma.siteContent.upsert({
    where: { key: "contact-page" },
    create: {
      key: "contact-page",
      content: payload,
    },
    update: {
      content: payload,
    },
  });
}
