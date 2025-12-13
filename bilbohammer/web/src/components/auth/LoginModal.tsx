"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function LoginModal({ open, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setSubmitting(false);
      setContrasena("");
      setEmail("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const callbackUrl =
    typeof window !== "undefined" && window.location.pathname
      ? window.location.pathname + window.location.search
      : pathname ?? "/";

  const handleCredentialsSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    const result = await signIn("credentials", {
      email,
      contrasena,
      redirect: false,
      callbackUrl: callbackUrl || "/",
    });
    if (result?.error) {
      setErrorMessage("No se pudo iniciar sesión. Revisa el email o la contraseña.");
      setSubmitting(false);
      return;
    }
    onClose();
    router.refresh();
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-2xl">
        <button
          type="button"
          className="absolute right-4 top-4 text-sm text-[var(--muted)] hover:text-[var(--text)]"
          onClick={onClose}
          aria-label="Cerrar ventana de acceso"
        >
          Cerrar
        </button>
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-[var(--text)]">Accede al club</h2>
            <p className="text-sm text-[var(--muted)]">
              Usa tu cuenta existente o crea una nueva si todavía no formas parte del club.
            </p>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--hairline)] bg-white px-4 py-3 text-sm font-semibold text-[#1f1f1f] shadow-sm transition hover:shadow-lg dark:bg-white"
            onClick={() => signIn("google", { callbackUrl })}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.18 2.56 12.72l7.96 6.19C12.3 13.02 17.62 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24c0-1.47-.13-2.89-.38-4.26H24v8.07h12.65c-.54 2.9-2.14 5.36-4.6 7.02l7.47 5.8C43.83 36.77 46.5 30.85 46.5 24z" />
              <path fill="#FBBC05" d="M10.52 28.91c-.48-1.45-.75-3-.75-4.91s.27-3.46.75-4.91l-7.96-6.19C.92 16.22 0 19.98 0 24s.92 7.78 2.56 11.1l7.96-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.14 15.91-5.81l-7.47-5.8c-2.07 1.39-4.74 2.21-8.44 2.21-6.38 0-11.7-3.53-14.48-8.64l-7.96 6.19C6.51 42.82 14.62 48 24 48z" />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            <span>Entrar con Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <span className="h-px w-full bg-[var(--hairline)]" />
            <span className="absolute bg-[var(--card)] px-3 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              o usa tu email
            </span>
          </div>

          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--text)]" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-[var(--hairline)] bg-transparent px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--text)]" htmlFor="login-password">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                className="w-full rounded-2xl border border-[var(--hairline)] bg-transparent px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-[#0f62ff] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0d54d4] hover:shadow-xl disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Iniciando sesión..." : "Entrar con email"}
            </button>
            {errorMessage && <p className="text-sm text-center text-red-400">{errorMessage}</p>}
          </form>

          <div className="grid gap-3 text-sm">
            <Link
              href="/register"
              className="rounded-2xl border border-dashed border-[var(--hairline)] px-4 py-2 text-center font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              onClick={onClose}
            >
              Crear una cuenta nueva
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
