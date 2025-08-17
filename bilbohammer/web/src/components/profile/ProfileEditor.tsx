"use client";

import { useState } from "react";
import GamesSelector, { GamesState } from "./GamesSelector";
import { AvatarEditor } from "./AvatarEditor";

export default function ProfileEditor({
  initial,
  onSaved,
}: {
  initial: {
    email: string;
    name?: string | null;
    nick?: string | null;
    membershipSince?: string | null;
    description?: string | null;
    avatarUrl?: string | null;
    juegos?: string[];
    factions?: Record<string, string[]>;
  };
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [nick, setNick] = useState(initial.nick ?? "");
  const [since, setSince] = useState<string>(initial.membershipSince ?? "");
  const [desc, setDesc] = useState(initial.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);

  const initGameSet = new Set(initial.juegos || []);
  const initFactions: Record<string, Set<string>> = {};
  for (const [gid, list] of Object.entries(initial.factions || {})) {
    initFactions[gid] = new Set(list);
  }
  const [games, setGames] = useState<GamesState>({ selected: initGameSet, factions: initFactions });

  async function save() {
    setBusy(true);
    const payload = {
      name,
      nick,
      membershipSince: since || null,
      description: desc,
      juegos: Array.from(games.selected),
      factions: Object.fromEntries(Object.entries(games.factions).map(([k,v]) => [k, Array.from(v)])),
      avatarUrl,
    };
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      alert("Error guardando perfil");
      return;
    }
    onSaved();
  }

  return (
    <form id="profile-edit-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6">
      <div className="flex items-center gap-4">
        <AvatarEditor url={avatarUrl} name={nick || name || initial.email} onUploaded={setAvatarUrl} editing={true} />
        <div className="flex-1 grid grid-cols-1 gap-2">
          <div className="text-xs opacity-70">{initial.email}</div>
          <div className="flex gap-2">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-white/15 text-sm flex-1"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-white/15 text-sm flex-1"
              placeholder="Nick"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
            />
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
        <h2 className="text-lg font-semibold mb-2">Descripción</h2>
        <div className="text-sm mb-2">Socio desde:</div>
        <input
          type="date"
          className="px-2 py-1 rounded bg-slate-800 border border-white/15 text-sm"
          value={since ? since.slice(0,10) : ""}
          onChange={(e) => setSince(e.target.value)}
        />
        <div className="mt-3 text-sm">Descripción (Markdown básico soportado):</div>
        <textarea
          rows={5}
          className="w-full mt-1 px-2 py-1 rounded bg-slate-800 border border-white/15 text-sm"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
        <h2 className="text-lg font-semibold mb-2">Juegos</h2>
        <GamesSelector state={games} onChange={setGames} />
      </section>

      <div className="opacity-70 text-xs">
        * El recorte del avatar es automático a cuadrado 512×512. Podemos añadir zoom/arrastre después.
      </div>
    </form>
  );
}
