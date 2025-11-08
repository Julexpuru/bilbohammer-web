"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { CSSProperties } from "react";

const INSTAGRAM_PROFILE =
  process.env.NEXT_PUBLIC_INSTAGRAM_PROFILE ?? "https://www.instagram.com/bilbohammerclub/";
const YOUTUBE_PLAYLIST_ID = process.env.NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID ?? "";
const YOUTUBE_VIDEO_ID = process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_ID ?? "";

const youtubeEmbedUrl = YOUTUBE_PLAYLIST_ID
  ? `https://www.youtube.com/embed/videoseries?list=${YOUTUBE_PLAYLIST_ID}`
  : YOUTUBE_VIDEO_ID
    ? `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}`
    : "";

const INSTAGRAM_STYLE: CSSProperties = {
  background: "#fff",
  borderRadius: "24px",
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
  margin: "0 auto",
  maxWidth: "540px",
  width: "100%",
};

export default function InstagramFeed() {
  useEffect(() => {
    const existingScript = document.getElementById("instagram-embed-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "instagram-embed-script";
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        (window as typeof window & { instgrm?: any }).instgrm?.Embeds?.process();
      };
      document.body.appendChild(script);
    } else {
      (window as typeof window & { instgrm?: any }).instgrm?.Embeds?.process();
    }
  }, []);

  return (
    <section className="mt-16 rounded-[32px] border border-[var(--hairline)] bg-[var(--card)] p-6 shadow">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text)]">Desde nuestras redes sociales</h2>
          <p className="text-sm text-[var(--muted)]">
            Actualizamos Instagram con fotos de partidas y compartimos vídeos y directos desde YouTube.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={INSTAGRAM_PROFILE}
            target="_blank"
            rel="noopener noreferrer"
            className="btn border-[var(--hairline)] bg-[var(--card)] text-[var(--text)] hover:border-[var(--border)]"
          >
            Seguir en Instagram
          </Link>
          <Link
            href="https://www.youtube.com/@Bilbohammer"
            target="_blank"
            rel="noopener noreferrer"
            className="btn border-[var(--hairline)] bg-[var(--card)] text-[var(--text)] hover:border-[var(--border)]"
          >
            Suscribirse en YouTube
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <article className="rounded-[28px] border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">Instagram</h3>
              <p className="text-sm text-[var(--muted)]">Historias y fotos desde Bilbao.</p>
            </div>
            <Link
              href={INSTAGRAM_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--accent-600)] hover:text-[var(--accent)]"
            >
              Ver perfil
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-[24px]">
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={INSTAGRAM_PROFILE}
              data-instgrm-version="14"
              style={INSTAGRAM_STYLE}
            />
          </div>
        </article>

        <article className="rounded-[28px] border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">YouTube</h3>
              <p className="text-sm text-[var(--muted)]">Directos, informes de batalla y eventos del club.</p>
            </div>
            <Link
              href="https://www.youtube.com/@Bilbohammer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--accent-600)] hover:text-[var(--accent)]"
            >
              Abrir canal
            </Link>
          </div>
          {youtubeEmbedUrl ? (
            <div className="mt-4 overflow-hidden rounded-[24px] border border-[var(--hairline)]">
              <div className="aspect-video">
                <iframe
                  src={youtubeEmbedUrl}
                  title="Últimos vídeos de Bilbohammer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  className="h-full w-full"
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-dashed border-[var(--hairline)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
              Añade <code>NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID</code> o <code>NEXT_PUBLIC_YOUTUBE_VIDEO_ID</code> a tu
              entorno para mostrar un vídeo o playlist del canal.
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
