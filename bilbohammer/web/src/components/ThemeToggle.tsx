"use client";

import { useEffect, useState } from "react";

type ThemeToggleProps = {
  variant?: "nav" | "surface";
  compactDesktop?: boolean;
};

export default function ThemeToggle({ variant = "nav", compactDesktop = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const doc = document.documentElement;
    const stored = localStorage.getItem("bh-theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
      doc.setAttribute("data-theme", stored);
    } else {
      setTheme("dark");
      doc.setAttribute("data-theme", "dark");
      localStorage.setItem("bh-theme", "dark");
    }
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("bh-theme", next);
  }

  const isDark = theme === "dark";

  const palette =
    variant === "nav"
      ? { color: "var(--nav-text)", borderColor: "var(--nav-hairline)", backgroundColor: "transparent" }
      : { color: "var(--text)", borderColor: "var(--hairline)", backgroundColor: "var(--card)" };

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn"
      title={isDark ? "Cambiar a claro" : "Cambiar a oscuro"}
      aria-label="Cambiar tema claro/oscuro"
      style={palette}
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
      <span className={compactDesktop ? "text-sm lg:hidden 2xl:inline" : "text-sm"}>
        {isDark ? "Oscuro" : "Claro"}
      </span>
    </button>
  );
}
