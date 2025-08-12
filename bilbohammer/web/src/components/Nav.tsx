"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import clsx from "clsx";
import ThemeToggle from "@/components/ThemeToggle";


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
    <header className="border-b" style={{ borderColor: "var(--hairline)" }}>
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/assets/img/logoBH_sinfondo.png" alt="Bilbohammer" width={32} height={32} />
          <span className="text-lg font-bold">Bilbohammer</span>
        </Link>

        <nav className="flex gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "hover:opacity-90",
                pathname === l.href ? "text-[var(--accent)]" : "text-inherit"
              )}
            >
              {l.label}
            </Link>
          ))}
          {session?.user && (
            <Link href="/admin" className="hover:opacity-90">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session?.user ? (
            <>
              <span className="text-sm" style={{ color: "var(--muted)" }}>
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
