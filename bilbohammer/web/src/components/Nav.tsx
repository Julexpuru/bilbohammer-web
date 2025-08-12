"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import clsx from "clsx";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/novedades", label: "Novedades" },
  { href: "/galeria", label: "Galería" },
  { href: "/sobre-nosotros", label: "Sobre Nosotros" },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="nav-bar">
      <div className="container flex items-center justify-between py-3 md:py-3.5">
        {/* Logo + título */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/assets/img/logoBH_sinfondo.png"  // deja el logo en /web/public/assets/img/
            alt="Bilbohammer"
            width={36}
            height={36}
            className="h-8 w-auto md:h-9"
            priority
            sizes="(max-width: 768px) 120px, 160px"
          />
          <span className="text-lg md:text-xl font-bold leading-none" style={{ color: "var(--nav-text)" }}>
            Bilbohammer
          </span>
        </Link>

        {/* Links */}
        <nav className="hidden sm:flex gap-4">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx("transition-opacity hover:opacity-90")}
                style={{ color: active ? "var(--nav-active)" : "var(--nav-text)" }}
              >
                {l.label}
              </Link>
            );
          })}
          {session?.user && (
            <Link href="/admin" className="transition-opacity hover:opacity-90" style={{ color: "var(--nav-text)" }}>
              Admin
            </Link>
          )}
        </nav>

        {/* Login + Toggle */}
        <div className="flex items-center gap-2">
          {/* Ojo: mantén aquí tu ThemeToggle si ya lo añadiste */}
          {/* <ThemeToggle /> */}
          {session?.user ? (
            <>
              <span className="hidden md:inline text-sm" style={{ color: "var(--nav-text)", opacity: 0.85 }}>
                {session.user.name || session.user.email}
              </span>
              <button className="btn" onClick={() => signOut()}>Salir</button>
            </>
          ) : (
            <button className="btn btn-accent" onClick={() => signIn()}>
              Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
