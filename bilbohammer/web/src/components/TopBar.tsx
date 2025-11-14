"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatarMenu from "@/components/UserAvatarMenu";
import LoginModal from "@/components/auth/LoginModal";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { extractRoles } from "@/lib/roles";

const primaryLinks = [
  { href: "/", label: "Inicio" },
  { href: "/novedades", label: "Novedades" },
  { href: "/eventos", label: "Eventos" },
  { href: "/galeria", label: "Galería" },
];

const aboutLinks = [
  { href: "/sobre-nosotros/quienes-somos", label: "¿Quiénes somos?" },
  { href: "/sobre-nosotros/juegos", label: "Juegos" },
  { href: "/sobre-nosotros/tablon-de-socios", label: "Tablón de socios" },
  { href: "/sobre-nosotros/contacto", label: "Contacto" },
];

const clubLinks = [
  { href: "/admin/gestion-usuarios", label: "Gestion de Usuarios" },
  { href: "/admin/gestion-documental", label: "Gestion Documental" },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className={clsx("transition-transform duration-150", open ? "rotate-180" : "rotate-0")}
      focusable="false"
    >
      <path
        d="M2 4.5 6 8l4-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useOutsideClick(ref: RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function handle(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target || !ref.current) return;
      if (!ref.current.contains(target)) handler();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, handler]);
}

export default function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const roles = extractRoles(session);
  const canManageClub = roles.includes("ADMIN") || roles.includes("JUNTA");

  const aboutRef = useRef<HTMLDivElement | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const clubRef = useRef<HTMLDivElement | null>(null);
  const clubHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clubOpen, setClubOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const cancelScheduledClose = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const closeAbout = useCallback(() => {
    cancelScheduledClose();
    setAboutOpen(false);
  }, [cancelScheduledClose]);

  const scheduleClose = useCallback(() => {
    cancelScheduledClose();
    hoverTimer.current = setTimeout(() => setAboutOpen(false), 180);
  }, [cancelScheduledClose]);

  const cancelScheduledClubClose = useCallback(() => {
    if (clubHoverTimer.current) {
      clearTimeout(clubHoverTimer.current);
      clubHoverTimer.current = null;
    }
  }, []);

  const closeClub = useCallback(() => {
    cancelScheduledClubClose();
    setClubOpen(false);
  }, [cancelScheduledClubClose]);

  const scheduleClubClose = useCallback(() => {
    cancelScheduledClubClose();
    clubHoverTimer.current = setTimeout(() => setClubOpen(false), 180);
  }, [cancelScheduledClubClose]);

  useOutsideClick(aboutRef, closeAbout);
  useEffect(() => closeAbout(), [pathname, closeAbout]);
  useEffect(() => () => cancelScheduledClose(), [cancelScheduledClose]);

  useOutsideClick(clubRef, closeClub);
  useEffect(() => closeClub(), [pathname, closeClub]);
  useEffect(() => () => cancelScheduledClubClose(), [cancelScheduledClubClose]);

  const activeMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const link of primaryLinks) {
      if (link.href === "/") {
        map.set(link.href, pathname === "/");
      } else {
        map.set(link.href, pathname === link.href || pathname.startsWith(`${link.href}/`));
      }
    }
    map.set("/sobre-nosotros", pathname === "/sobre-nosotros" || pathname.startsWith("/sobre-nosotros/"));
    return map;
  }, [pathname]);

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <>
      <div className="header-grid">
      <div className="justify-self-start brand-container">
        <Link href="/" aria-label="Ir a inicio · Bilbohammer" className="brand-link">
          <Image
            src="/assets/img/LogoBH_sinfondo_croppedtight.png"
            alt="Bilbohammer"
            width={100}
            height={40}
            className="brand-img"
            priority
          />
        </Link>
      </div>

      <nav className="center-nav hidden md:flex gap-8 justify-center font-medium">
        {primaryLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx("transition-opacity hover:opacity-90", activeMap.get(href) && "text-[var(--nav-active)]")}
            style={{ color: activeMap.get(href) ? undefined : "var(--nav-text)" }}
          >
            {label}
          </Link>
        ))}
        <div
          ref={aboutRef}
          className="relative"
          onMouseEnter={() => {
            cancelScheduledClose();
            setAboutOpen(true);
          }}
          onMouseLeave={scheduleClose}
        >
          <button
            type="button"
            onClick={() => {
              cancelScheduledClose();
              setAboutOpen((prev) => !prev);
            }}
            className={clsx(
              "flex items-center gap-1 transition-opacity hover:opacity-90",
              activeMap.get("/sobre-nosotros") && "text-[var(--nav-active)]"
            )}
            style={{ color: activeMap.get("/sobre-nosotros") ? undefined : "var(--nav-text)" }}
            aria-haspopup="menu"
            aria-expanded={aboutOpen}
          >
            Sobre Nosotros
            <ChevronIcon open={aboutOpen} />
          </button>
          {aboutOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 flex w-56 flex-col gap-1 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-2 shadow-xl z-50"
            >
              {aboutLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--accent-50)] hover:text-[var(--accent-600)]"
                  onClick={closeAbout}
                  role="menuitem"
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="justify-self-end flex items-center gap-3">
        {canManageClub && (
          <div
            ref={clubRef}
            className="relative"
            onMouseEnter={() => {
              cancelScheduledClubClose();
              setClubOpen(true);
            }}
            onMouseLeave={scheduleClubClose}
          >
            <button
              type="button"
              className={clsx(
                "manage-club-btn",
                (clubOpen || isAdminRoute) && "bg-[rgba(255,255,255,0.18)] border-[rgba(255,255,255,0.35)]"
              )}
              aria-haspopup="menu"
              aria-expanded={clubOpen}
              onClick={() => {
                cancelScheduledClubClose();
                setClubOpen((prev) => !prev);
              }}
            >
              Gestion del club
              <ChevronIcon open={clubOpen} />
            </button>
            {clubOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 flex w-60 flex-col gap-1 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-2 shadow-xl z-50"
              >
                {clubLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-xl px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--accent-50)] hover:text-[var(--accent-600)]"
                    onClick={closeClub}
                    role="menuitem"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        <ThemeToggle />
        {session?.user ? (
          <UserAvatarMenu profileHref="/mi-perfil" />
        ) : (
          <button className="btn btn-accent" onClick={() => setLoginOpen(true)}>
            Entrar
          </button>
        )}
      </div>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

