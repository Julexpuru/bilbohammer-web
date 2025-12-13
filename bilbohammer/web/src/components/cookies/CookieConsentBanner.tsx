"use client";

import Link from "next/link";
import { useCookieConsent } from "./CookieConsentContext";
import { useEffect, useState } from "react";

export function CookieConsentBanner() {
  const { consent, setAnalyticsConsent } = useCookieConsent();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(consent.analytics === null);
  }, [consent.analytics]);

  if (!isVisible) return null;

  const handleChoice = (value: boolean) => () => setAnalyticsConsent(value);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-6 sm:px-6">
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900/95 p-5 text-sm text-white shadow-2xl backdrop-blur">
        <p className="text-base font-semibold text-white">Controla tus cookies</p>
        <p className="mt-2 text-slate-200">
          Utilizamos cookies necesarias para que puedas navegar, iniciar sesión y mantener tu cuenta
          segura. También nos gustaría usar cookies de analítica (Google Tag Manager/Analytics) para
          mejorar el servicio. Si continúas sin aceptarlas, se mantendrán desactivadas. Consulta la{" "}
          <Link href="/politica-de-cookies" className="underline">
            política de cookies
          </Link>{" "}
          para saber más.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleChoice(false)}
            className="rounded-lg border border-white/30 px-4 py-2 font-medium text-white transition hover:border-white/60"
          >
            Rechazar analíticas
          </button>
          <button
            type="button"
            onClick={handleChoice(true)}
            className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-400"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
}
