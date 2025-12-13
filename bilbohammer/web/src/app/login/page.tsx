"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");

  return (
    <div className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-semibold text-[var(--text)]">Inicia sesión</h1>

      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full rounded border border-[var(--hairline)] px-4 py-2 text-sm font-semibold"
      >
        Continuar con Google
      </button>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await signIn("credentials", { email, contrasena, callbackUrl: "/" });
        }}
        className="space-y-2"
      >
        <input
          className="w-full rounded border border-[var(--hairline)] p-2 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          className="w-full rounded border border-[var(--hairline)] p-2 text-sm"
          placeholder="Contraseña"
          type="password"
          value={contrasena}
          onChange={(event) => setContrasena(event.target.value)}
        />
        <button className="w-full rounded bg-[var(--text)] p-2 text-sm font-semibold text-[var(--background)]">
          Entrar
        </button>
      </form>

      <p className="text-center text-sm text-[var(--muted)]">
        ¿Todavía no tienes cuenta?{" "}
        <Link href="/register" className="font-semibold text-[var(--text)] underline-offset-4 hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
