'use client';

import { useCallback, useEffect, useId, useMemo, useState } from "react";

type Props = {
  slug: string;
  title: string;
  summary?: string | null;
  className?: string;
  appearance?: "light" | "muted";
};

const BUTTON_BASE =
  "flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const APPEARANCE_STYLES: Record<NonNullable<Props["appearance"]>, string> = {
  light:
    "border-[var(--hairline)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)] focus-visible:outline-[var(--accent-400)]",
  muted:
    "border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white",
};

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

export function GalleryShareButtons({ slug, title, summary, className, appearance = "light" }: Props) {
  const [shareUrl, setShareUrl] = useState(`/galeria/${slug}`);
  const [copied, setCopied] = useState(false);
  const rawGradientId = useId();
  const gradientId = useMemo(() => rawGradientId.replace(/:/g, ""), [rawGradientId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShareUrl(`${window.location.origin}/galeria/${slug}`);
  }, [slug]);

  const shareText = useMemo(() => {
    const pieces = [title];
    if (summary) pieces.push(summary);
    if (shareUrl) pieces.push(shareUrl);
    return pieces.join("\n\n");
  }, [title, summary, shareUrl]);

  const whatsappUrl = useMemo(() => {
    if (!shareUrl) return "#";
    const parts = [title];
    if (summary) parts.push(summary);
    parts.push(shareUrl);
    return `https://wa.me/?text=${encodeURIComponent(parts.join("\n\n"))}`;
  }, [title, summary, shareUrl]);

  const handleInstagramShare = useCallback(async () => {
    if (!shareUrl) return;
    const payload = {
      title,
      text: summary ? `${title}\n\n${summary}` : title,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // cancelado o no soportado
      }
    }
    const fallback = `https://www.instagram.com/direct/new/?text=${encodeURIComponent(shareText)}`;
    window.open(fallback, "_blank", "noopener,noreferrer");
  }, [shareUrl, shareText, summary, title]);

  const handleCopy = useCallback(async () => {
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

  const appearanceStyles = APPEARANCE_STYLES[appearance];

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className={`${BUTTON_BASE} ${appearanceStyles}`}
        aria-label="Compartir por WhatsApp"
      >
        <WhatsappIcon />
      </a>
      <button
        type="button"
        onClick={handleInstagramShare}
        className={`${BUTTON_BASE} ${appearanceStyles}`}
        aria-label="Compartir por Instagram"
      >
        <InstagramIcon gradientId={gradientId} />
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className={`${BUTTON_BASE} ${appearanceStyles}`}
        aria-label={copied ? "Enlace copiado" : "Copiar enlace"}
        title={copied ? "Enlace copiado" : "Copiar enlace"}
      >
        <LinkIcon />
      </button>
    </div>
  );
}

export default GalleryShareButtons;
