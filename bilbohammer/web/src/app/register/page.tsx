"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nombre, setNombre] = useState("");
  const [nick, setNick] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="max-w-sm mx-auto space-y-4 p-6">
      <h1 className="text-xl font-semibold">Crear cuenta</h1>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, contrasena, nombre, nick }),
          });
          const data = await res.json();
          if (res.ok) setMsg("Cuenta creada. Ya puedes iniciar sesión.");
          else setMsg(data.error || "Error al crear la cuenta");
        }}
        className="space-y-2"
      >
        <input className="w-full border p-2 rounded" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Contraseña" type="password" value={contrasena} onChange={(e)=>setContrasena(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Nombre (opcional)" value={nombre} onChange={(e)=>setNombre(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Nick (opcional)" value={nick} onChange={(e)=>setNick(e.target.value)} />
        <button className="w-full bg-black text-white p-2 rounded">Crear cuenta</button>
      </form>

      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
