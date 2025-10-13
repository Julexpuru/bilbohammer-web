'use client';

import * as React from "react";

type Props = React.PropsWithChildren<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onSubmit?: (event: React.FormEvent) => void;
}>;

export default function EditProfileModal({ isOpen, onClose, title = "Editar perfil", onSubmit, children }: Props) {
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="bh-modal__overlay" role="dialog" aria-modal="true">
      <div className="bh-modal">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="bh-chip" aria-label="Cerrar modal">
            Cerrar
          </button>
        </header>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">{children}</div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bh-chip">
              Cancelar
            </button>
            <button type="submit" className="bh-chip" style={{ fontWeight: 600 }}>
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
