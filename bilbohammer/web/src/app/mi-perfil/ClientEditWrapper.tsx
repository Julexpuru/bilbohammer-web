"use client";

import * as React from "react";
import { useState, useCallback, memo } from "react";
import { useSession } from "next-auth/react";
import {
  GAMES,
  FACTIONS,
  gameIconPath,
  factionIconPath,
} from "@/lib/games";

import EditToolbar from "@/components/profile/EditToolbar";

type GameId =
  | "w40k"
  | "aos"
  | "tow"
  | "esdla"
  | "bb"
  | "marvel"
  | "rol"
  | "magic"
  | "boardgames"
  | "otros";

type Profile = {
  email?: string | null;
  name?: string | null;
  nick?: string | null;
  memberSince?: string | null; // ISO
  description?: string | null;
  avatarUrl?: string | null;
  games?: string[]; // UI ids
  factions?: Record<string, string[]>; // { w40k: [...], aos: [...], tow: [...] }
};

const ALL_GAMES = GAMES.map((g) => g.id) as GameId[];
const gameName = (id: string) => GAMES.find((g) => g.id === id)?.name ?? id;

// ============ Tiny image that never shows placeholder text ============
type ImgProps = { cacheKey: string; src?: string | null; className?: string };
const resolvedSrcCache = new Map<string, string>();
const Img = memo(
  function Img({ cacheKey, src, className }: ImgProps) {
    const candidates = React.useMemo(() => (src ? [src] : []), [src]);
    const cached = resolvedSrcCache.get(cacheKey) || null;
    const [idx, setIdx] = useState(cached ? Math.max(0, candidates.indexOf(cached)) : 0);
    const [failed, setFailed] = useState(false);
    const finalSrc = cached ?? candidates[idx] ?? null;

    React.useEffect(() => {
      if (finalSrc && !resolvedSrcCache.get(cacheKey)) resolvedSrcCache.set(cacheKey, finalSrc);
    }, [finalSrc, cacheKey]);

    if (!finalSrc || failed) return null;

    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={finalSrc}
        alt=""
        decoding="async"
        loading="lazy"
        draggable={false}
        className={className}
        onError={() => {
          if (!cached && idx + 1 < candidates.length) setIdx(idx + 1);
          else setFailed(true);
        }}
      />
    );
  },
  (a, b) => a.cacheKey === b.cacheKey && a.src === b.src && a.className === b.className
);

export default function ClientEditWrapper({ profile }: { profile: Profile }) {
  const { update } = useSession();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollBarComp = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarComp > 0) document.body.style.paddingRight = `${scrollBarComp}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  // local draft – NO afecta al perfil fuera del modal
  const [name, setName] = useState(profile.name ?? "");
  const [nick, setNick] = useState(profile.nick ?? "");
  const [memberSince, setMemberSince] = useState(profile.memberSince ?? "");
  const [description, setDescription] = useState(profile.description ?? "");
  const [games, setGames] = useState<GameId[]>(
    (profile.games as GameId[] | undefined) ?? []
  );
  const [factions, setFactions] = useState<Record<string, string[]>>(
    profile.factions ?? { w40k: [], aos: [], tow: [] }
  );
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
 // solo preview + payload

  // Callbacks estables para que los hijos memoizados no se re-rendericen todos
  const toggleGameCb = useCallback((id: GameId) => {
    setGames((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((g) => g !== id) : [...prev, id];
      if (has && (id === "w40k" || id === "aos" || id === "tow")) {
        setFactions((f) => ({ ...f, [id]: [] }));
      }
      return next;
    });
  }, []);

  const toggleFactionCb = useCallback((game: "w40k" | "aos" | "tow", id: string) => {
    setFactions((prev) => {
      const list = new Set(prev[game] || []);
      if (list.has(id)) list.delete(id);
      else list.add(id);
      return { ...prev, [game]: Array.from(list) };
    });
  }, []);

  async function handleUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    setAvatarDraft(data.url); // preview (NO se aplica fuera)
  }

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        nick,
        membershipSince: memberSince ? memberSince : null,
        description,
        juegos: games, // el API debe mapear UI -> enum Prisma
        factions,      // el API debe mapear UI -> enum Prisma
        avatarUrl: avatarDraft ?? profile.avatarUrl ?? null,
      };
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Save failed");
      }
      try {
        await update();
      } catch {}
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  const GameCheckbox = memo(
    function GameCheckbox({ id, checked }: { id: GameId; checked: boolean }) {
      return (
        <label className="flex items-center justify-between gap-3 px-2 py-1 rounded hover:bg-slate-800/60 border border-white/5 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 grid place-items-center">
              <Img
                cacheKey={`game:${id}`}
                src={gameIconPath(id)}
                className="w-6 h-6 object-contain opacity-90"
              />
            </div>
            <span className="text-sm truncate">{gameName(id)}</span>
          </div>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleGameCb(id)}
            className="w-4 h-4 accent-blue-600"
          />
        </label>
      );
    },
    (a, b) => a.id === b.id && a.checked === b.checked
  );

  const FactionCheckbox = memo(
    function FactionCheckbox({
      game,
      id,
      name,
      checked,
    }: {
      game: "w40k" | "aos" | "tow";
      id: string;
      name: string;
      checked: boolean;
    }) {
      return (
        <label className="flex items-center justify-between gap-3 px-2 py-1 rounded hover:bg-slate-800/60 border border-white/5 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 grid place-items-center">
              <Img
                cacheKey={`faction:${game}:${id}`}
                src={factionIconPath(game, id)}
                className="w-6 h-6 object-contain opacity-90"
              />
            </div>
            <span className="text-sm truncate">{name}</span>
          </div>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleFactionCb(game, id)}
            className="w-4 h-4 accent-blue-600"
          />
        </label>
      );
    },
    (a, b) => a.game === b.game && a.id === b.id && a.checked === b.checked && a.name === b.name
  );

  const showW40K = games.includes("w40k");
  const showAoS = games.includes("aos");
  const showTOW = games.includes("tow");

  return (
    <div>
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700" onClick={() => setOpen(true)}>
          Editar mis datos
        </button>
                <EditToolbar editing={editing} setEditing={setEditing} />
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-3xl w-full rounded-xl border overflow-hidden" style={{ backgroundColor: "color-mix(in oklab, var(--card) 94%, var(--bg))", color: "var(--text)", borderColor: "var(--hairline)" }}>
              <div className="sticky top-0 z-10 px-4 py-3 border-b backdrop-blur" style={{ backgroundColor: "color-mix(in oklab, var(--card) 92%, var(--bg))", borderColor: "var(--hairline)" }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Editar perfil</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                      onClick={() => setOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      disabled={saving}
                      onClick={() => onSubmit()}
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              </div>

              {confirmRemove && (
  <div className="fixed inset-0 z-[60] bg-black/60 grid place-items-center">
    <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--card)", color: "var(--text)", borderColor: "var(--hairline)" }}>
      <p className="mb-3">¿Seguro que quieres quitar el avatar actual?</p>
      <div className="flex gap-2 justify-end">
        <button type="button" className="px-3 py-1 rounded bg-slate-600 text-white hover:bg-slate-700" onClick={() => setConfirmRemove(false)}>No</button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
          onClick={async () => {
            try {
              setSaving(true);
              await fetch("/api/me/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatarUrl: null }),
              });
            } finally {
              setSaving(false);
              setConfirmRemove(false);
              window.location.reload();
            }
          }}
        >
          Sí
        </button>
      </div>
    </div>
  </div>
)}<div className="px-4 py-4 max-h-[85vh] overflow-y-auto">
                {/* Avatar */}
<div className="mb-4">
  <div className="flex items-center gap-4">
    <div className="relative w-24 h-24 rounded-full overflow-hidden border border-white/10">
      {(avatarDraft || profile.avatarUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarDraft || profile.avatarUrl!}
          alt="avatar"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full grid place-items-center" style={{ background: "var(--card)", color: "var(--muted)" }}>
          <svg viewBox="0 0 24 24" width="64" height="64" aria-hidden="true">
            <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.35" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="currentColor" opacity="0.35"/>
            <circle cx="12" cy="8" r="3" fill="currentColor" />
            <path d="M6 20c.8-2.6 3.6-4 6-4s5.2 1.4 6 4" fill="currentColor"/>
          </svg>
        </div>
      )}
    </div>

    <div className="flex flex-col gap-2">
      <button type="button" className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700" onClick={() => fileInputRef.current?.click()}>
        Cambiar imagen
      </button>
      <button type="button" className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => setConfirmRemove(true)}>
        Quitar imagen
      </button>
    </div>
  </div>

  <input
    ref={fileInputRef}
    className="hidden"
    type="file"
    accept="image/*"
    onChange={(e) => {
      const f = e.target.files?.[0];
      if (f) handleUpload(f);
    }}
  />

  <p className="text-xs opacity-70 mt-1">Máx. 10 MB. Se aplica al guardar.</p>
</div>

                {/* Campos básicos */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <label className="text-sm">
                    Nombre
                    <input
                      className="w-full mt-1 px-2 py-1 rounded border" style={{ backgroundColor: "var(--card)", color: "var(--text)", borderColor: "var(--hairline)" }}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    Nick
                    <input
                      className="w-full mt-1 px-2 py-1 rounded border" style={{ backgroundColor: "var(--card)", color: "var(--text)", borderColor: "var(--hairline)" }}
                      value={nick}
                      onChange={(e) => setNick(e.target.value)}
                    />
                  </label>
                  <label className="text-sm col-span-2">
                    Socio desde
                    <input
                      type="date"
                      className="w-full mt-1 px-2 py-1 rounded border" style={{ backgroundColor: "var(--card)", color: "var(--text)", borderColor: "var(--hairline)" }}
                      value={memberSince ? `${memberSince}-01` : ""}
                      onChange={(e) => setMemberSince(e.target.value ? e.target.value.slice(0,7) : "")}
                    />
                  </label>
                  <label className="text-sm col-span-2">
                    Descripción
                    <textarea
                      className="w-full mt-1 px-2 py-1 rounded border min-h-[96px]" style={{ backgroundColor: "var(--card)", color: "var(--text)", borderColor: "var(--hairline)" }}
                      value={description ?? ""}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </label>
                </div>

                {/* Juegos */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Juegos</h4>
                    <span className="text-xs opacity-70">Selecciona uno o varios</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_GAMES.map((id) => (
                      <GameCheckbox key={id} id={id} checked={games.includes(id)} />
                    ))}
                  </div>
                </div>

                {/* Facciones por juego (scrollables) */}
                {showW40K && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Warhammer 40,000: Facciones </h4>
                      <span className="text-xs opacity-70">Scroll para ver todas</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {FACTIONS.w40k.map((f) => (
                        <FactionCheckbox
                          key={`w40k-${f.id}`}
                          game="w40k"
                          id={f.id}
                          name={f.name}
                          checked={(factions.w40k || []).includes(f.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showAoS && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Age of Sigmar: Facciones</h4>
                      <span className="text-xs opacity-70">Scroll para ver todas</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {FACTIONS.aos.map((f) => (
                        <FactionCheckbox
                          key={`aos-${f.id}`}
                          game="aos"
                          id={f.id}
                          name={f.name}
                          checked={(factions.aos || []).includes(f.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showTOW && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">The Old World: Facciones</h4>
                      <span className="text-xs opacity-70">Scroll para ver todas</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {FACTIONS.tow.map((f) => (
                        <FactionCheckbox
                          key={`tow-${f.id}`}
                          game="tow"
                          id={f.id}
                          name={f.name}
                          checked={(factions.tow || []).includes(f.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
