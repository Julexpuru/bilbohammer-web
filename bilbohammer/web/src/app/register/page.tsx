import Link from "next/link";
import { RegistrationForm } from "@/components/auth/RegistrationForm";

export const metadata = {
  title: "Registro abierto - Bilbohammer",
};

export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold text-[var(--text)]">Create tu cuenta</h1>
        <p className="text-sm text-[var(--muted)]">
          Hasta que sea promocionado por un administrador, los usuarios registrados sin invitacion no tendran permisos
          de socio.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
        <RegistrationForm />
      </div>

      <p className="text-center text-sm text-[var(--muted)]">
        Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-[var(--text)] underline-offset-4 hover:underline">
          Inicia sesion
        </Link>
      </p>
    </section>
  );
}
