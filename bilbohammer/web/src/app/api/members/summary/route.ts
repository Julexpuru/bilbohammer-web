import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const [notif, members] = await Promise.all([
    prisma.notification.findFirst({ where: { visible: true }, orderBy: { createdAt: "desc" } }),
    prisma.user.count(),
  ]);

  return NextResponse.json({ notification: notif, membersCount: members });
}
