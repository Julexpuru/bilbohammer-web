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
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState<{
    command: string;
    deepLink: string | null;
    expiresAt: string;
  } | null>(null);

  const normalizedProviders = useMemo(() => providers?.map((provider) => provider.toLowerCase()) ?? [], [providers]);
  const hasGoogle = normalizedProviders.includes("google");
  const hasTelegram = normalizedProviders.includes("telegram");

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
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTelegramConnect() {
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      const response = await fetch("/api/me/telegram-link-token", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo generar el enlace de Telegram.");
      }
      setTelegramLink({
        command: data.command,
        deepLink: data.deepLink ?? null,
        expiresAt: data.expiresAt,
      });
    } catch (error) {
      setTelegramError(error instanceof Error ? error.message : "No se pudo generar el enlace de Telegram.");
    } finally {
      setTelegramBusy(false);
    }
  }

  async function copyTelegramCommand() {
    if (!telegramLink?.command) return;
    try {
      await navigator.clipboard.writeText(telegramLink.command);
    } catch {
      setTelegramError("No se pudo copiar el comando. Selecciónalo manualmente.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <button
          onClick={() => setOpenPwd(true)}
          disabled={editing}
          className="w-full rounded-md border border-red-500/60 bg-red-600 px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:border-red-500/60 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-white dark:text-gray-900"
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm disabled:cursor-default disabled:opacity-90 sm:w-auto dark:bg-white dark:text-gray-900"
          >
            <CheckGlyph className="h-4 w-4" />
            <span className="whitespace-nowrap">Google conectada</span>
          </button>
        )}

        {!hasTelegram ? (
          <button
            type="button"
            onClick={handleTelegramConnect}
            disabled={editing || telegramBusy}
            title="Conectar cuenta de Telegram"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-sky-400/50 bg-sky-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <TelegramGlyph className="h-4 w-4" />
            <span className="whitespace-nowrap">{telegramBusy ? "Generando..." : "Conectar Telegram"}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Cuenta de Telegram conectada"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-sky-400/50 bg-sky-500/20 px-3 py-1.5 text-sm font-medium text-sky-100 shadow-sm disabled:cursor-default disabled:opacity-90 sm:w-auto"
          >
            <CheckGlyph className="h-4 w-4" />
            <span className="whitespace-nowrap">Telegram conectado</span>
          </button>
        )}
      </div>

      {telegramLink && !hasTelegram && (
        <div className="max-w-xl rounded-xl border border-sky-400/30 bg-sky-950/40 p-3 text-sm text-sky-50 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {telegramLink.deepLink && (
              <a
                href={telegramLink.deepLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-sky-500 px-3 py-1.5 font-medium text-white hover:bg-sky-600"
              >
                Abrir Telegram
              </a>
            )}
            <button
              type="button"
              onClick={copyTelegramCommand}
              className="inline-flex items-center justify-center rounded-md border border-sky-300/40 px-3 py-1.5 font-medium text-sky-50 hover:bg-sky-400/10"
            >
              Copiar comando
            </button>
          </div>
          <code className="mt-2 block rounded-md bg-black/30 px-2 py-1 text-xs text-sky-100">{telegramLink.command}</code>
          <p className="mt-2 text-xs text-sky-100/80">
            El enlace caduca a las{" "}
            {new Date(telegramLink.expiresAt).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </p>
        </div>
      )}

      {telegramError && <p className="text-sm text-red-300">{telegramError}</p>}

      <ChangePasswordModal open={openPwd} onClose={() => setOpenPwd(false)} />
    </div>
  );
}

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

function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.9 4.6 18.7 19.5c-.2 1-.8 1.2-1.6.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.6 13.3 1.9 11.8c-1-.3-1-1 .2-1.5L20.4 3.3c.8-.3 1.6.2 1.5 1.3Z" />
    </svg>
  );
}
