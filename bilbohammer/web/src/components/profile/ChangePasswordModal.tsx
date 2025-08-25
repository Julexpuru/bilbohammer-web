"use client";
import * as React from "react";

export default function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void; }) {
  const [nueva, setNueva] = React.useState("");
  const [confirmar, setConfirmar] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const disabled = loading || !nueva || !confirmar;

  const submit = async () => {
    setMsg(null);
    if (nueva !== confirmar) { setMsg("Las contraseñas no coinciden."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nueva, confirmar }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data?.error ?? "Error al cambiar la contraseña.");
      else { setMsg("Contraseña actualizada correctamente."); setNueva(""); setConfirmar(""); setTimeout(() => onClose(), 900); }
    } catch { setMsg("Error de red. Inténtalo de nuevo."); }
    finally { setLoading(false); }
  };

  if (!open) return null;
  return (<div className="fixed inset-0 z-50 bg-black/60">
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 shadow-xl p-4" style={{ background: "var(--card, #0f172a)" }}>
        <h3 className="text-lg font-semibold mb-3">Cambiar contraseña</h3>
        <label className="block text-sm mb-1">Nueva contraseña</label>
        <input type="password" className="w-full mb-3 px-3 py-2 rounded border border-white/15 bg-slate-900/40 outline-none" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Introduce la nueva contraseña" />
        <label className="block text-sm mb-1">Confirmar contraseña</label>
        <input type="password" className="w-full mb-3 px-3 py-2 rounded border border-white/15 bg-slate-900/40 outline-none" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repite la contraseña" />
        {msg && (<div className="text-sm mb-3" style={{ color: msg.includes("correctamente") ? "#22c55e" : "#f87171" }}>{msg}</div>)}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-white/15 bg-slate-800 hover:bg-slate-700 text-sm">Cancelar</button>
          <button disabled={disabled} onClick={submit} className="px-3 py-1.5 rounded-md border border-emerald-400/30 bg-emerald-500/20 hover:bg-emerald-500/30 text-sm disabled:opacity-50">{loading ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  </div>);
}
