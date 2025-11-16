"use client";
import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import ChangePasswordModal from "./ChangePasswordModal";

export default function EditToolbar({
  editing,
  setEditing,
}: {
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const [providers, setProviders] = useState<string[] | null>(null);
  const [openPwd, setOpenPwd] = useState(false);
  const hasGoogle = useMemo(() => {
    if (!providers) return false;
    return providers.map((p) => p.toLowerCase()).includes("google");
  }, [providers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/providers", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setProviders(Array.isArray(data?.providers) ? data.providers : []);
      } catch {
        if (!cancelled) setProviders([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      {/* SIEMPRE rojo en claro y oscuro */}
      <button
        onClick={() => setOpenPwd(true)}
        disabled={editing}
        className="px-3 py-1.5 rounded-md text-sm font-medium w-full sm:w-auto text-center
                   border border-red-500/60
                   bg-red-600 hover:bg-red-700
                   text-white
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                   disabled:opacity-60 disabled:cursor-not-allowed
                   dark:bg-red-600 dark:hover:bg-red-700 dark:text-white dark:border-red-500/60"
      >
        Editar contraseña
      </button>

      {!hasGoogle ? (
        <button
          data-testid="google-oauth-btn"
          onClick={() => signIn("google", { callbackUrl: "/mi-perfil" })}
          disabled={editing}
          title="Conectar cuenta de Google"
          style={{ backgroundColor: "#fff" }}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-white dark:text-gray-900 w-full sm:w-auto"
        >
          <GoogleGlyph className="h-4 w-4" />
          <span className="whitespace-nowrap">Conectar con Google</span>
        </button>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Cuenta de Google conectada"
          style={{ backgroundColor: "#fff" }}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm dark:bg-white dark:text-gray-900 disabled:opacity-90 disabled:cursor-default w-full sm:w-auto"
        >
          <CheckGlyph className="h-4 w-4" />
          <span className="whitespace-nowrap">Conectada</span>
        </button>
      )}

      <ChangePasswordModal open={openPwd} onClose={() => setOpenPwd(false)} />
    </div>
  );
}

// Inline glyphs
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.826 32.91 29.29 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.84 1.155 7.957 3.043l5.657-5.657C34.676 6.053 29.63 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.818C14.655 16.041 18.94 12 24 12c3.059 0 5.84 1.155 7.957 3.043l5.657-5.657C34.676 6.053 29.63 4 24 4c-7.905 0-14.64 4.563-17.694 10.691z"/>
      <path fill="#4CAF50" d="M24 44c5.218 0 9.996-1.997 13.585-5.243l-6.265-5.3C29.29 36 24.754 32.91 24 32.91c-5.22 0-9.627-3.523-11.123-8.263l-6.57 5.054C9.32 38.445 16.012 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.044 3.064-4.53 6.265-11.303 6.265-.754 0 5.29 3.035 7.32 5.155l6.265 5.257C36.038 41.915 44 36.5 44 24c-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
