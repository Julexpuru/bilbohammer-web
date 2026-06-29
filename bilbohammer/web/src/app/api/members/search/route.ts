import { NextResponse } from "next/server";
import { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserDisplayName } from "@/lib/user-display";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const roleFilter = (searchParams.get("role") ?? "").trim().toLowerCase();

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const roleCondition =
    roleFilter === "junta"
      ? { has: Rol.JUNTA }
      : { hasSome: [Rol.SOCIO, Rol.JUNTA, Rol.ADMIN] };

  try {
    const members = await prisma.user.findMany({
      where: {
        roles: roleCondition,
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { nombre: { contains: query, mode: "insensitive" } },
          { nick: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        nombre: true,
        nick: true,
        email: true,
      },
      orderBy: [{ nick: "asc" }, { name: "asc" }, { nombre: "asc" }],
      take: 10,
    });

    const results = members.map((member) => ({
      id: String(member.id),
      name: getUserDisplayName(member, `Socio ${member.id}`),
      nick: member.nick,
      email: member.email,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("/api/members/search", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

