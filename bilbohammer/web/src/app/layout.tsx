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
