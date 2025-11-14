import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractRoles } from "@/lib/roles";
import { loadContactContent } from "@/lib/contact-content";
import { SYSTEM_ACCOUNT_EMAILS } from "@/constants/system-users";
import { ContactContentView } from "./ContactContentView";

export const metadata = {
  title: "Contacto | Bilbohammer",
  description:
    "Encuentra todas las formas de hablar con Bilbohammer: redes sociales, correo electronico y ubicacion del local.",
};

const MAP_SOURCE_URL = "https://maps.app.goo.gl/wAzzzPmTJeoihVof8";
const MAP_FALLBACK_QUERY = "Bilbohammer Bilbao";

export default async function ContactoPage() {
  const session = await auth();
  const roles = extractRoles(session);
  const canEdit = roles.includes("ADMIN") || roles.includes("JUNTA");
  const isSocio = roles.includes("SOCIO");

  const [content, memberCount] = await Promise.all([
    loadContactContent(),
    prisma.user.count({
      where: {
        isActive: true,
        roles: { has: "SOCIO" },
        NOT: {
          email: { in: SYSTEM_ACCOUNT_EMAILS },
        },
      },
    }),
  ]);

  const mapEmbedUrl = deriveEmbedFromGoogleUrl(MAP_SOURCE_URL) ?? toEmbedUrl(MAP_FALLBACK_QUERY);

  return (
    <ContactContentView
      content={content}
      canEdit={canEdit}
      canSeeDiscord={isSocio}
      memberCount={memberCount}
      mapEmbedUrl={mapEmbedUrl}
      mapSourceUrl={MAP_SOURCE_URL}
    />
  );
}

function toEmbedUrl(query: string) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}

function deriveEmbedFromGoogleUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("google.") || host.includes("goo.gl") || host.includes("maps.app")) {
      const qParam = parsed.searchParams.get("q");
      if (qParam) {
        return toEmbedUrl(qParam);
      }
      const atIndex = parsed.pathname.indexOf("@");
      if (atIndex !== -1) {
        const coordsChunk = parsed.pathname.slice(atIndex + 1).split(/[,/]/);
        const lat = Number(coordsChunk[0]);
        const lng = Number(coordsChunk[1]);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          return toEmbedUrl(`${lat},${lng}`);
        }
      }
      return null;
    }
    return rawUrl.includes("output=embed")
      ? rawUrl
      : `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}output=embed`;
  } catch {
    return null;
  }
}
