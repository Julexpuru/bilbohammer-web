import { RegistrationForm } from "@/components/auth/RegistrationForm";
import LoginModalTrigger from "@/components/auth/LoginModalTrigger";

export const metadata = {
  title: "Registro abierto - Bilbohammer",
};

export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold text-[var(--text)]">Créate tu cuenta</h1>
        <p className="text-sm text-[var(--muted)]">
          Hasta que sea promocionado por un administrador, los usuarios registrados sin invitación no tendrán permisos
          de socio.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
        <RegistrationForm />
      </div>

      <p className="text-center text-sm text-[var(--muted)]">
        ¿Ya tienes cuenta? <LoginModalTrigger />
      </p>
    </section>
  );
}
