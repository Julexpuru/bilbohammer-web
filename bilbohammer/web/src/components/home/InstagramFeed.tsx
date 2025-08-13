// web/src/components/InstagramFeed.tsx
"use client";

import { useEffect } from "react";

export default function InstagramFeed() {
  useEffect(() => {
    // Carga el script oficial de Instagram para formatear embeds
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <section style={{ padding: "2rem 0" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        Últimas publicaciones en Instagram
      </h2>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <blockquote
          className="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/bilbohammerclub/"
          data-instgrm-version="14"
          style={{
            background: "#FFF",
            border: 0,
            borderRadius: "3px",
            boxShadow:
              "0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)",
            margin: "1px",
            maxWidth: "540px",
            minWidth: "326px",
            padding: 0,
            width: "99.375%",
          }}
        ></blockquote>
      </div>
    </section>
  );
}
