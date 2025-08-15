"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./UserAvatarMenu.module.css";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export type UserAvatarMenuProps = {
  size?: number; // px – tamaño del círculo
  profileHref?: string; // ruta a "Mi Perfil"
  className?: string;
};

export default function UserAvatarMenu({ size = 34, profileHref = "/mi-perfil", className }: UserAvatarMenuProps) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const user = session?.user as any | undefined;
  const avatarUrl = user?.avatarUrl || user?.image || null;
  const displayName: string | undefined = user?.nick || user?.name || user?.email || undefined;
  const initial = useMemo(() => (displayName ? displayName.trim()[0]?.toUpperCase() : "?"), [displayName]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (popRef.current && !popRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (status === "loading") {
    return (
      <div className={`${styles.skeleton} ${className ?? ""}`} style={{ width: size, height: size }} aria-hidden />
    );
  }

  if (!session?.user) {
    return (
      <button className={`${styles.loginBtn} ${className ?? ""}`} onClick={() => signIn()}>
        Iniciar sesión
      </button>
    );
  }

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <button
        ref={btnRef}
        type="button"
        className={styles.avatarBtn}
        style={{ width: size, height: size }}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={displayName}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName ?? "Usuario"} className={styles.avatarImg} />
        ) : (
          <span className={styles.initial}>{initial}</span>
        )}
      </button>

      {open && (
        <div ref={popRef} role="menu" className={styles.menu}>
          <div className={styles.menuHeader}>
            <div className={styles.headerAvatar} style={{ width: size, height: size }}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="avatar" className={styles.avatarImg} />
              ) : (
                <span className={styles.initial}>{initial}</span>
              )}
            </div>
            <div className={styles.headerInfo}>
              <div className={styles.headerName}>{displayName ?? "Usuario"}</div>
              {user?.email && <div className={styles.headerEmail}>{user.email}</div>}
            </div>
          </div>
          <div className={styles.menuList}>
            <Link href={profileHref} role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
              Mi Perfil
            </Link>
            <button
              type="button"
              role="menuitem"
              className={`${styles.menuItem} ${styles.danger}`}
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/" });
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}