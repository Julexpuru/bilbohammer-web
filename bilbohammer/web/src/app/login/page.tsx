"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");

  return (
    <div className="max-w-sm mx-auto space-y-4 p-6">
      <h1 className="text-xl font-semibold">Inicia sesión</h1>

      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full border p-2 rounded"
      >
        Continuar con Google
      </button>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await signIn("credentials", { email, password: contrasena, callbackUrl: "/" });
        }}
        className="space-y-2"
      >
        <input
          className="w-full border p-2 rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Contraseña"
          type="password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        <button className="w-full bg-black text-white p-2 rounded">Entrar</button>
      </form>
    </div>
  );
}
