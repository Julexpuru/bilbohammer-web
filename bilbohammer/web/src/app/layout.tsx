import "./globals.css";
import Providers from "@/providers";
import TopBar from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import Script from "next/script";

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
        {gtmId && (
          <Script id="gtm-base" strategy="afterInteractive">
            {`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');
`}
          </Script>
        )}
      </head>
      <body className="min-h-screen flex flex-col">
        {gtmId && (
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
            }}
          />
        )}
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
