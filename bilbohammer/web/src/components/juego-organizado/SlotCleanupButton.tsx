"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SlotCleanupButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCleanup() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/juego-organizado/slots/cleanup", {
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudo limpiar el historial.");
      }
      window.dispatchEvent(new Event("availability-slots:changed"));
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "No se pudo limpiar el historial.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn px-3 py-2 text-sm disabled:opacity-50"
        disabled={loading}
        onClick={handleCleanup}
      >
        {loading ? "Eliminando..." : "Eliminar partidas terminadas"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
