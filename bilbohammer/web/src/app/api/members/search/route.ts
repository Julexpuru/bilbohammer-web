import { NextResponse } from "next/server";
import { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const members = await prisma.user.findMany({
      where: {
        roles: { hasSome: [Rol.SOCIO, Rol.JUNTA, Rol.ADMIN] },
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
      orderBy: [{ name: "asc" }, { nombre: "asc" }],
      take: 10,
    });

    const results = members.map((member) => ({
      id: String(member.id),
      name:
        member.name ??
        member.nombre ??
        member.nick ??
        member.email ??
        `Socio ${member.id}`,
      nick: member.nick,
      email: member.email,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("/api/members/search", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

