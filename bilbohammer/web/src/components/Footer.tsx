export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10">
      <div className="container py-8 text-sm text-[var(--muted)] flex items-center justify-between">
        <p>© {new Date().getFullYear()} Bilbohammer</p>
        <p>
          Hecho con ❤️ en Bilbao
        </p>
      </div>
    </footer>
  );
}
