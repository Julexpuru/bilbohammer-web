export function Footer() {
  return (
    <footer className="footer-bar mt-20">
      <div className="container py-8 text-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Bilbohammer</p>
        <p>Hecho con ❤️ en Bilbao</p>
      </div>
    </footer>
  );
}
