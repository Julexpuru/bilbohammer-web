"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const doc = document.documentElement;
    const stored = localStorage.getItem("bh-theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
      doc.setAttribute("data-theme", stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = prefersDark ? "dark" : "light";
      setTheme(initial);
      doc.setAttribute("data-theme", initial);
    }
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("bh-theme", next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn"
      title={isDark ? "Cambiar a claro" : "Cambiar a oscuro"}
      aria-label="Cambiar tema claro/oscuro"
      style={{ color: "var(--nav-text)", borderColor: "var(--nav-hairline)" }}
    >
      {isDark ? (
        // Luna
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        // Sol
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )}
      <span className="text-sm">{isDark ? "Oscuro" : "Claro"}</span>
    </button>
  );
}
