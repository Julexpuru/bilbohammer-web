"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatarMenu from "@/components/UserAvatarMenu";
import clsx from "clsx";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/novedades", label: "Novedades" },
  { href: "/galeria", label: "Galería" },
  { href: "/sobre-nosotros", label: "Sobre Nosotros" },
];

export default function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    // Grid 3 zonas: [izquierda=logo] [centro=enlaces] [derecha=acciones]
    <div className="header-grid">
      {/* IZQUIERDA — logo (no altera la altura del header) */}
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

      {/* CENTRO — enlaces (ajusta tamaño aquí si quieres) */}
      <nav className="center-nav hidden md:flex gap-8 justify-center font-medium">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx("transition-opacity hover:opacity-90", active && "text-[var(--nav-active)]")}
              style={{ color: active ? undefined : "var(--nav-text)" }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* DERECHA — acciones */}
      <div className="justify-self-end flex items-center gap-3">
        <ThemeToggle />
        {session?.user ? (
          <UserAvatarMenu profileHref="/mi-perfil" />
        ) : (
          <button className="btn btn-accent" onClick={() => signIn()}>Entrar</button>
        )}
      </div>
    </div>
  );
}
