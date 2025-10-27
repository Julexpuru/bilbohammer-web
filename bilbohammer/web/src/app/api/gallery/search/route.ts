'use server';

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCanManageEvents, userCanManageGallery } from "@/lib/roles";
import { slugify } from "@/lib/slugify";

export async function GET(request: Request) {
  const session = await auth();
  if (!userCanManageEvents(session) && !userCanManageGallery(session)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (id) {
    const album = await prisma.galleryAlbum.findUnique({
      where: { id },
      select: { id: true, slug: true, title: true },
    });
    return NextResponse.json({ results: album ? [album] : [] });
  }

  const query = url.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const slugCandidate = slugify(query, "album");

  const results = await prisma.galleryAlbum.findMany({
    where: {
      OR: [
        { slug: { equals: slugCandidate } },
        { slug: { startsWith: slugCandidate } },
        { title: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
    take: 10,
    orderBy: [{ title: "asc" }],
  });

  return NextResponse.json({ results });
}
