// Simple SessionProvider wrapper (optional if using hooks only in client components)
"use client";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
