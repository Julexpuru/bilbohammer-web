export default function NotFoundPage() {
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "64px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ fontSize: "12px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#6b7280" }}>404</p>
      <h1 style={{ fontSize: "28px", fontWeight: 700 }}>Página no encontrada</h1>
      <p style={{ color: "#6b7280" }}>No hemos podido encontrar la página solicitada.</p>
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
          width: "fit-content",
        }}
      >
        Volver al inicio
      </a>
    </div>
  );
}
