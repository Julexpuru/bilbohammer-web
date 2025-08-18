"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

export default function EditToolbar({
  editing,
  setEditing,
}: {
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const [providers, setProviders] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/me/providers")
      .then((r) => r.json())
      .then((data) => setProviders(data.providers || []))
      .catch(() => setProviders([]));
  }, [editing]);

  const hasGoogle = (providers || []).includes("google");

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1.5 rounded-md border border-white/15 bg-slate-800 hover:bg-slate-700 text-sm"
        >
          Editar mis datos
        </button>
      ) : (
        <>
          <button
            type="submit"
            form="profile-edit-form"
            className="px-3 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-700 hover:bg-emerald-600 text-sm"
          >
            Guardar cambios
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 rounded-md border border-white/15 bg-slate-800 hover:bg-slate-700 text-sm"
          >
            Cancelar
          </button>
        </>
      )}

      <button
        disabled={editing}
        className="px-3 py-1.5 rounded-md border border-white/15 bg-slate-800 hover:bg-slate-700 text-sm disabled:opacity-50"
      >
        Editar contraseña
      </button>

      {!hasGoogle ? (
        <button
          onClick={() => signIn("google", { callbackUrl: "/mi-perfil" })}
          className="px-3 py-1.5 rounded-md border border-white/15 bg-white text-slate-900 text-sm"
          disabled={editing}
          title="Conectar cuenta de Google"
        >
          Conectar cuenta de Google
        </button>
      ) : (
        <span className="px-3 py-1.5 rounded-md border border-green-600/30 bg-green-800 text-green-100 text-sm">
          Cuenta de Google conectada
        </span>
      )}
    </div>
  );
}
