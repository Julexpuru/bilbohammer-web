export function Footer() {
  return (
    <footer className="footer-bar mt-20">
      <div className="container py-8 text-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p>&copy; {new Date().getFullYear()} Bilbohammer</p>
        <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:gap-6">
          <a href="/politica-de-cookies" className="underline hover:no-underline">
            Politica de cookies
          </a>
        </div>
      </div>
    </footer>
  );
}
