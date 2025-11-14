"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Props = {
  defaultEmail?: string;
  inviteToken?: string | null;
  emailReadOnly?: boolean;
  submitLabel?: string;
};

type Status =
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export function RegistrationForm({
  defaultEmail,
  inviteToken,
  emailReadOnly = false,
  submitLabel = "Crear cuenta",
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [contrasena, setContrasena] = useState("");
  const [nombre, setNombre] = useState("");
  const [nick, setNick] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setEmail(defaultEmail ?? "");
  }, [defaultEmail]);

  const emailProps = useMemo(() => {
    const base = {
      readOnly: emailReadOnly,
      disabled: emailReadOnly || completed,
    };
    return base;
  }, [emailReadOnly, completed]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || completed) return;

    setStatus(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          contrasena,
          nombre,
          nick,
          inviteToken: inviteToken ?? undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const baseError = typeof data?.error === "string" ? data.error : "No se pudo crear la cuenta.";
        const details = typeof data?.details === "string" ? ` (${data.details})` : "";
        throw new Error(`${baseError}${details}`);
      }
      setCompleted(true);
      const signInResult = await signIn("credentials", {
        email,
        contrasena,
        redirect: false,
        callbackUrl: "/",
      });
      if (signInResult?.error) {
        throw new Error(signInResult.error);
      }
      const targetUrl = signInResult?.url ?? "/";
      await router.push(targetUrl);
      return;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "No se pudo crear la cuenta.";
      setStatus({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--text)]">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-[var(--hairline)] bg-transparent p-3 text-sm outline-none focus:border-[var(--accent)]"
          autoComplete="email"
          {...emailProps}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--text)]">Contraseña</label>
        <input
          type="password"
          required
          value={contrasena}
          onChange={(event) => setContrasena(event.target.value)}
          className="w-full rounded-xl border border-[var(--hairline)] bg-transparent p-3 text-sm outline-none focus:border-[var(--accent)]"
          autoComplete="new-password"
          disabled={completed}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--text)]">Nombre (opcional)</label>
        <input
          type="text"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          className="w-full rounded-xl border border-[var(--hairline)] bg-transparent p-3 text-sm outline-none focus:border-[var(--accent)]"
          autoComplete="name"
          disabled={completed}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--text)]">Nick (opcional)</label>
        <input
          type="text"
          value={nick}
          onChange={(event) => setNick(event.target.value)}
          className="w-full rounded-xl border border-[var(--hairline)] bg-transparent p-3 text-sm outline-none focus:border-[var(--accent)]"
          autoComplete="nickname"
          disabled={completed}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || completed}
        className="w-full rounded-xl bg-[#0f62ff] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0d54d4] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Creando cuenta..." : completed ? "Cuenta creada" : submitLabel}
      </button>

      {status && (
        <p
          className={`text-sm ${status.type === "success" ? "text-green-400" : "text-red-400"}`}
          role="status"
        >
          {status.message}
        </p>
      )}
    </form>
  );
}
