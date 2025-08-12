"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Cargar tema actual
  useEffect(() => {
    const doc = document.documentElement;
    const stored = localStorage.getItem("bh-theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
      doc.setAttribute("data-theme", stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const t: "light" | "dark" = prefersDark ? "dark" : "light";
      setTheme(t);
      doc.setAttribute("data-theme", t);
    }
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    const doc = document.documentElement;
    doc.setAttribute("data-theme", next);
    localStorage.setItem("bh-theme", next);
  }

  return (
    <button
      aria-label="Cambiar tema claro/oscuro"
      className="btn"
      onClick={toggle}
      title={theme === "light" ? "Cambiar a oscuro" : "Cambiar a claro"}
    >
      {theme === "light" ? (
        /* Luna */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        /* Sol */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )}
      <span className="text-sm">{theme === "light" ? "Claro" : "Oscuro"}</span>
    </button>
  );
}
