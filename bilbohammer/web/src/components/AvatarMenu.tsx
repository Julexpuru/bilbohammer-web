// AvatarMenu.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

/**
 * Avatar circular + menú desplegable accesible.
 * Props: name (string), image (url | null), onLogout? (fn)
 * Uso: <AvatarMenu name={user?.name} image={user?.image} onLogout={miLogout} />
 * Si no pasas onLogout e instalaste next-auth/react, intentará usar signOut automáticamente.
 */
export default function AvatarMenu({
  name,
  image,
  size = 36,
  onLogout,
}: {
  name?: string | null;
  image?: string | null;
  size?: number; // px
  onLogout?: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Cerrar al hacer click fuera + ESC
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(t) &&
        btnRef.current && !btnRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const initial = (name?.trim()?.[0] || "?").toUpperCase();

  async function handleLogout() {
    try {
      if (onLogout) {
        await onLogout();
        return;
      }
      // Intento perezoso con next-auth si existe, sin forzar dependencia.
      const mod = await import("next-auth/react").catch(() => null);
      const signOut = (mod as any)?.signOut as undefined | ((args?: any) => Promise<void>);
      if (signOut) {
        await signOut({ callbackUrl: "/" });
      } else {
        // Último recurso: llamada a /api/logout si la tienes.
        await fetch("/api/logout", { method: "POST" });
        window.location.href = "/";
      }
    } catch {
      // Silencioso para no romper la UI.
    }
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={name ? `Cuenta de ${name}` : "Cuenta"}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition h-10 w-10 overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        style={{ width: size, height: size }}
      >
        {image ? (
          <Image
            src={image}
            alt={name || "Avatar"}
            width={size}
            height={size}
            className="object-cover"
          />
        ) : (
          <span className="font-medium text-sm text-zinc-700 dark:text-zinc-200">
            {initial}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Menú de usuario"
          className="absolute right-0 mt-2 w-56 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-1"
        >
          <div className="px-3 py-2 text-xs text-zinc-500">
            {name ? `Sesión como ${name}` : "Usuario"}
          </div>
          <Link
            href="/profile"
            role="menuitem"
            className="block w-full text-left rounded-xl px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm"
            onClick={() => setOpen(false)}
          >
            Mi Perfil
          </Link>
          <button
            role="menuitem"
            className="block w-full text-left rounded-xl px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm"
            onClick={async () => {
              setOpen(false);
              await handleLogout();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
