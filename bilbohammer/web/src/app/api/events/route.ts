// src/app/api/events/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
    take: 100,
  });
  return NextResponse.json(events);
}
