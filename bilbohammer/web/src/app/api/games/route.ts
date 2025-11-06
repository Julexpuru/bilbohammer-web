import { NextResponse } from "next/server";
import { loadActiveGames } from "@/lib/game-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const games = await loadActiveGames();
  return NextResponse.json({ games });
}
