export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// src/app/api/auth/[...nextauth]/route.ts — NextAuth v5
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
