export default function Error500Page() {
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "64px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ fontSize: "12px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#6b7280" }}>500</p>
      <h1 style={{ fontSize: "28px", fontWeight: 700 }}>Error interno</h1>
      <p style={{ color: "#6b7280" }}>Ha ocurrido un error. Intenta recargar o volver al inicio.</p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ padding: "10px 14px", borderRadius: "12px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer" }}
        >
          Recargar
        </button>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            borderRadius: "12px",
            padding: "10px 14px",
            background: "#0ea5e9",
            color: "#0b1216",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Ir al inicio
        </a>
      </div>
    </div>
  );
}
