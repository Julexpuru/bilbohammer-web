"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function PonmeCaraButton({
  memberId,
  displayName,
  photoUrl: initialPhotoUrl,
  isCurrentUser,
}: {
  memberId: number;
  displayName: string;
  photoUrl: string | null;
  isCurrentUser: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPhotoUrl(initialPhotoUrl ?? null);
  }, [initialPhotoUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo supera los 10 MB permitidos.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const uploadResponse = await fetch("/api/upload/avatar", { method: "POST", body: uploadData });
      if (!uploadResponse.ok) throw new Error("UPLOAD_FAILED");
      const uploadJson = await uploadResponse.json();
      const newUrl = uploadJson?.url;
      if (!newUrl) throw new Error("INVALID_URL");

      const patchResponse = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facePhotoUrl: newUrl }),
      });
      if (!patchResponse.ok) throw new Error("PATCH_FAILED");

      setPhotoUrl(newUrl);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("No se pudo subir la foto. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        data-member-id={memberId}
        className="rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text)] transition hover:border-[var(--border)] hover:text-[var(--accent)]"
        onClick={() => setOpen(true)}
      >
        Ponme cara
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-2xl">
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Foto de perfil</p>
              <h3 className="text-2xl font-semibold text-[var(--text)]">{displayName}</h3>
            </header>

            <div className="mt-4 min-h-[260px] rounded-2xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] p-4 flex items-center justify-center">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={`Foto de ${displayName}`} className="max-h-72 rounded-xl object-contain" />
              ) : (
                <p className="text-sm text-[var(--muted)] text-center">
                  Todavía no hay ninguna foto subida para este perfil.
                </p>
              )}
            </div>

            {isCurrentUser && (
              <div className="mt-4 space-y-2 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-4">
                <p className="text-sm font-semibold text-[var(--text)]">Actualiza tu foto</p>
                <p className="text-xs text-[var(--muted)]">Máximo 10 MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0b1216] disabled:opacity-60"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Subiendo..." : "Subir nueva foto"}
                  </button>
                </div>
                {error && <p className="text-xs text-rose-400">{error}</p>}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-full border border-[var(--hairline)] bg-transparent px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--border)]"
                onClick={() => setOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
