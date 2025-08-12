"use client";

import Link from "next/link";
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
    <header className="border-b border-white/10">
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="text-xl font-bold">Bilbohammer</Link>
        <nav className="flex gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "hover:opacity-90",
                pathname === l.href ? "text-[var(--accent)]" : "text-white"
              )}
            >
              {l.label}
            </Link>
          ))}
          {session?.user && (
            <Link href="/admin" className="text-white hover:opacity-90">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              <span className="text-sm text-[var(--muted)]">
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
