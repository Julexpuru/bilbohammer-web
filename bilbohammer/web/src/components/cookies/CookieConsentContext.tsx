"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ConsentState = {
  analytics: boolean | null;
  updatedAt?: string | null;
};

type CookieConsentContextValue = {
  consent: ConsentState;
  setAnalyticsConsent: (value: boolean) => void;
  resetConsent: () => void;
};

const STORAGE_KEY = "bh-cookie-consent";

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

const readStoredConsent = (): ConsentState => {
  if (typeof window === "undefined") {
    return { analytics: null, updatedAt: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { analytics: null, updatedAt: null };
    const parsed = JSON.parse(raw) as ConsentState;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      ("analytics" in parsed || "updatedAt" in parsed)
    ) {
      const analyticsValue =
        typeof parsed.analytics === "boolean" ? parsed.analytics : null;
      const updatedAtValue =
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : null;
      return { analytics: analyticsValue, updatedAt: updatedAtValue };
    }
    return { analytics: null, updatedAt: null };
  } catch {
    return { analytics: null, updatedAt: null };
  }
};

const persistConsent = (value: ConsentState) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignoramos errores de almacenamiento (modo incógnito, etc.)
  }
};

export function CookieConsentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [consent, setConsent] = useState<ConsentState>(() => readStoredConsent());

  useEffect(() => {
    setConsent(readStoredConsent());
  }, []);

  const setAnalyticsConsent = useCallback((value: boolean) => {
    const next: ConsentState = {
      analytics: value,
      updatedAt: new Date().toISOString(),
    };
    setConsent(next);
    persistConsent(next);
  }, []);

  const resetConsent = useCallback(() => {
    const next: ConsentState = { analytics: null, updatedAt: null };
    setConsent(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, []);

  const value = useMemo(
    () => ({
      consent,
      setAnalyticsConsent,
      resetConsent,
    }),
    [consent, resetConsent, setAnalyticsConsent],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export const useCookieConsent = () => {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
};
