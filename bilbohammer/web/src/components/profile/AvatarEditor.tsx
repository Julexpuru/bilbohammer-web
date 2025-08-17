"use client";

import { useRef, useState } from "react";

export function AvatarEditor({
  url,
  name,
  onUploaded,
  size = 84,
  editing,
}: {
  url?: string | null;
  name: string;
  onUploaded: (newUrl: string) => void;
  size?: number;
  editing: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openPicker() {
    inputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      alert("El archivo supera 10 MB.");
      return;
    }
    const blobUrl = URL.createObjectURL(f);
    const img = new Image();
    img.src = blobUrl;
    await new Promise((res) => (img.onload = res as any));
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;

    const cnv = document.createElement("canvas");
    cnv.width = 512;
    cnv.height = 512;
    const ctx = cnv.getContext("2d")!;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, 512, 512);
    const dataUrl = cnv.toDataURL("image/jpeg", 0.9);
    setPreview(dataUrl);
  }

  async function upload() {
    if (!preview) return;
    setBusy(true);
    const res = await fetch(preview);
    const blob = await res.blob();
    const fd = new FormData();
    fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    const up = await fetch("/api/upload/avatar", { method: "POST", body: fd });
    const json = await up.json();
    setBusy(false);
    if (json?.url) {
      onUploaded(json.url);
      setPreview(null);
    } else {
      alert("Error subiendo avatar");
    }
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="rounded-full border border-white/20 grid place-items-center overflow-hidden bg-gradient-to-br from-cyan-600 to-slate-800"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview || url || ""}
          alt={name}
          className={`w-full h-full object-cover ${(!preview && !url) ? "opacity-0" : ""}`}
        />
        {(!preview && !url) && <span className="font-bold text-2xl">{name?.[0]?.toUpperCase?.() ?? "?"}</span>}
      </div>

      {editing && (
        <button
          type="button"
          onClick={openPicker}
          className="absolute inset-0 rounded-full bg-black/30 hover:bg-black/40 grid place-items-center text-white"
          title="Cambiar avatar"
        >
          ✎
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {preview && (
        <div className="absolute z-10 mt-2 left-0">
          <div className="p-3 rounded-md border border-white/15 bg-slate-900 w-64">
            <div className="text-xs mb-2 opacity-80">Previsualización (recorte automático)</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="w-48 h-48 object-cover rounded-md" />
            <div className="mt-2 flex gap-2">
              <button onClick={() => setPreview(null)} className="px-2 py-1 text-sm bg-slate-700 rounded">Cancelar</button>
              <button onClick={upload} disabled={busy} className="px-2 py-1 text-sm bg-emerald-700 rounded disabled:opacity-50">
                {busy ? "Subiendo..." : "Guardar avatar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
