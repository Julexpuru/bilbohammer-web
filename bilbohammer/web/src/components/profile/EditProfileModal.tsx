// src/components/profile/EditProfileModal.tsx
// Drop-in modal container with theme-aware styles.
// You can keep your current logic to open/close; just mount this when isOpen=true.
"use client";
import * as React from "react";

type Props = React.PropsWithChildren<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onSubmit?: (e: React.FormEvent) => void;
}>;

export default function EditProfileModal({ isOpen, onClose, title = "Editar perfil", onSubmit, children }: Props) {
  if (!isOpen) return null;
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="bh-modal__overlay" role="dialog" aria-modal="true">
      <div className="bh-modal">
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="bh-chip" aria-label="Cerrar">✕</button>
        </header>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">{children}</div>
          <div className="mt-6 flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="bh-chip">Cancelar</button>
            <button type="submit" className="bh-chip" style={{fontWeight:600}}>Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}
