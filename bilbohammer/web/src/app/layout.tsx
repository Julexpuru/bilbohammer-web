import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import Providers from "@/providers";

export const metadata = {
  title: "Bilbohammer",
  description: "Club de juegos de mesa y wargames",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
                    (function() {
                      try {
                        var stored = localStorage.getItem('bh-theme');
                        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        var theme = stored || (prefersDark ? 'dark' : 'light');
                        document.documentElement.setAttribute('data-theme', theme);
                      } catch (e) {}
                    })();
                    `
          }}
        />
      </head>
      <body>
        <Providers>
          <Nav />
          <main className="container py-10">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
