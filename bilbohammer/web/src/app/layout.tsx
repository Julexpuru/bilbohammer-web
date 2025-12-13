import "./globals.css";
import Providers from "@/providers";
import TopBar from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { CookieConsentProvider } from "@/components/cookies/CookieConsentContext";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { GtmLoader } from "@/components/cookies/GtmLoader";

const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

export const metadata = {
  title: "Bilbohammer",
  description: "Club de juegos de mesa y wargames",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
  var t=s||'dark';
  document.documentElement.setAttribute('data-theme', t);
  if(!s){localStorage.setItem('bh-theme', t);}
}catch(e){}})();
`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <CookieConsentProvider>
          <GtmLoader gtmId={gtmId} />
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
          <CookieConsentBanner />
        </CookieConsentProvider>
      </body>
    </html>
  );
}
