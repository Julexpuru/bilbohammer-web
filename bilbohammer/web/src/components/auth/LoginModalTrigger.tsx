"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import LoginModal from "@/components/auth/LoginModal";

type Props = {
  children?: ReactNode;
  className?: string;
};

export default function LoginModalTrigger({ children = "Inicia sesion", className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={clsx("inline font-semibold text-[var(--text)] underline-offset-4 hover:underline", className)}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <LoginModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
