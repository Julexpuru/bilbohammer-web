import "./globals.css";
import Providers from "@/providers";
import TopBar from "@/components/TopBar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Bilbohammer",
  description: "Club de juegos de mesa y wargames",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Evitar flash de tema: aplica tema antes de hidratar */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){try{
  var s=localStorage.getItem('bh-theme');
  var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', s || (d ? 'dark' : 'light'));
}catch(e){}})();
`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          {/* Header azul fijo */}
          <header className="nav-bar" style={{ height: "var(--nav-h)" }}>
            <div className="container h-full">
              <TopBar />
            </div>
          </header>

          {/* Contenido */}
          <main className="container py-10 flex-1">{children}</main>

          {/* Footer oscuro */}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
