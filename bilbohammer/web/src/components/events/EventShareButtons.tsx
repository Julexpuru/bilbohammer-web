"use client";

import * as React from "react";
import { formatClubDateTime } from "@/lib/date-format";

type Props = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
};

const buttonBase =
  "h-9 w-9 rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white flex items-center justify-center";

function formatDateForGoogleCalendar(iso: string) {
  const date = new Date(iso);
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatDateForMessage(iso: string) {
  try {
    return formatClubDateTime(iso, {
      dateStyle: "full",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="18" rx="3" ry="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="8" y="12" width="3.5" height="3.5" rx="0.8" fill="currentColor" opacity={0.85} />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M12 2C6.48 2 2 6.12 2 11.2c0 2.03.72 3.9 1.94 5.42L2.5 21.5l4.05-1.28A10.05 10.05 0 0 0 12 20.4c5.52 0 10-4.12 10-9.2C22 6.12 17.52 2 12 2Z"
        fill="#25D366"
      />
      <path
        d="M16.49 14.88c-.24.68-1.18 1.26-1.9 1.42-.5.12-1.14.22-3.32-.72-2.78-1.15-4.55-3.94-4.69-4.12-.14-.18-1.12-1.49-1.12-2.85 0-1.36.71-2.02.96-2.3.24-.28.53-.35.71-.35.18 0 .36.01.52.01.16 0 .39-.07.62.47.24.56.82 2 0.89 2.15.07.15.11.33.02.51-.09.18-.14.33-.27.5-.13.17-.28.38-.4.51-.13.17-.27.35-.12.63.15.28.65 1.1 1.39 1.78.96.9 1.77 1.18 2.05 1.31.28.13.44.11.6-.06.16-.17.68-.79.86-1.06.18-.27.36-.23.6-.14.24.09 1.53.72 1.79.85.26.13.43.2.49.32.07.13.07.74-.17 1.42Z"
        fill="#fff"
      />
    </svg>
  );
}

function InstagramIcon({ gradientId }: { gradientId: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f58529" />
          <stop offset="25%" stopColor="#feda77" />
          <stop offset="50%" stopColor="#dd2a7b" />
          <stop offset="75%" stopColor="#8134af" />
          <stop offset="100%" stopColor="#515bd4" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5" fill={`url(#${gradientId})`} />
      <rect x="8.5" y="8.5" width="7" height="7" rx="3.5" fill="none" stroke="white" strokeWidth="1.4" />
      <circle cx="16.7" cy="7.3" r="1.1" fill="white" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M14.5 6.5a3.5 3.5 0 0 1 5 5l-2.1 2.1a3.5 3.5 0 0 1-5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9.5 17.5a3.5 3.5 0 0 1-5-5l2.1-2.1a3.5 3.5 0 0 1 5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M9 15l6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function EventShareButtons({ eventId, title, startsAt, endsAt, location }: Props) {
  const [shareUrl, setShareUrl] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const rawGradientId = React.useId();
  const gradientId = React.useMemo(() => rawGradientId.replace(/:/g, ""), [rawGradientId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    setShareUrl(`${origin}/eventos/${eventId}`);
  }, [eventId]);

  const formattedStart = React.useMemo(() => formatDateForMessage(startsAt), [startsAt]);

  const googleCalendarUrl = React.useMemo(() => {
    const start = formatDateForGoogleCalendar(startsAt);
    const end = formatDateForGoogleCalendar(endsAt);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${start}/${end}`,
    });
    if (location) params.set("location", location);
    if (shareUrl) params.set("details", `Más información: ${shareUrl}`);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [startsAt, endsAt, title, location, shareUrl]);

  const whatsappUrl = React.useMemo(() => {
    const lines = [title, formattedStart];
    if (location) lines.push(location);
    if (shareUrl) lines.push(shareUrl);
    const message = lines.filter(Boolean).join("\n");
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [title, formattedStart, location, shareUrl]);

  const shareText = React.useMemo(() => {
    const bits = [title, formattedStart];
    if (location) bits.push(location);
    if (shareUrl) bits.push(shareUrl);
    return bits.filter(Boolean).join("\n");
  }, [title, formattedStart, location, shareUrl]);

  const handleInstagramShare = React.useCallback(async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // usuario canceló u otro error; seguimos con fallback
      }
    }
    const directUrl = `https://www.instagram.com/direct/new/?text=${encodeURIComponent(shareText)}`;
    window.open(directUrl, "_blank", "noopener,noreferrer");
  }, [shareUrl, shareText, title]);

  const handleCopy = React.useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      if (typeof window !== "undefined") {
        window.prompt("Copia este enlace para compartirlo:", shareUrl);
      }
    }
  }, [shareUrl]);

  return (
    <div className="flex items-center gap-2">
      <a
        href={googleCalendarUrl}
        target="_blank"
        rel="noreferrer"
        className={buttonBase}
        aria-label="Añadir a Google Calendar"
      >
        <CalendarIcon />
      </a>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className={buttonBase}
        aria-label="Compartir por WhatsApp"
      >
        <WhatsappIcon />
      </a>
      <button type="button" onClick={handleInstagramShare} className={buttonBase} aria-label="Compartir por Instagram">
        <InstagramIcon gradientId={gradientId} />
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className={buttonBase}
        aria-label={copied ? "Enlace copiado" : "Copiar enlace"}
        title={copied ? "Enlace copiado" : "Copiar enlace"}
      >
        <LinkIcon />
      </button>
    </div>
  );
}

export default EventShareButtons;
