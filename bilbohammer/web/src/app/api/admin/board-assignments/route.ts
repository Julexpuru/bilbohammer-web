import { NextResponse } from "next/server";
import { Rol } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractRoles } from "@/lib/roles";
import {
  BOARD_SLOT_IDS,
  applyBoardAssignmentUpdate,
  toMemberCard,
  type BoardAssignmentUpdate,
  type BoardSlotId,
  type RawMember,
} from "@/lib/member-directory";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const roles = extractRoles(session);
  const canManage = roles.includes("ADMIN") || roles.includes("JUNTA");

  if (!canManage) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const slotRaw = String(payload?.slot ?? "").toUpperCase();

  if (!BOARD_SLOT_IDS.has(slotRaw as BoardSlotId)) {
    return NextResponse.json({ error: "INVALID_SLOT" }, { status: 400 });
  }

  const slot = slotRaw as BoardSlotId;
  const modeRaw = typeof payload?.mode === "string" ? payload.mode.toLowerCase() : undefined;

  if (slot === "VOCAL") {
    const targetId =
      typeof payload?.targetId === "number"
        ? payload.targetId
        : typeof payload?.targetId === "string" && payload.targetId.trim().length > 0
        ? Number(payload.targetId)
        : null;

    if (modeRaw === "remove") {
      if (!Number.isInteger(targetId)) {
        return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 });
      }
      await applyBoardAssignmentUpdate({ slot: "VOCAL", userId: null, mode: "remove", targetId });
      return NextResponse.json({ slot, member: null });
    }

    const userIdRaw = payload?.userId;
    const numericId = Number(userIdRaw);
    if (!Number.isInteger(numericId)) {
      return NextResponse.json({ error: "INVALID_USER" }, { status: 400 });
    }

    const member = await prisma.user.findFirst({
      where: { id: numericId, isActive: true, roles: { has: Rol.JUNTA } },
      select: {
        id: true,
        name: true,
        nick: true,
        avatarUrl: true,
        oauthAvatarUrl: true,
        facePhotoUrl: true,
        image: true,
        roles: true,
        descripcion: true,
        membershipSince: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "NOT_ELIGIBLE" }, { status: 404 });
    }

    const update: BoardAssignmentUpdate =
      modeRaw === "replace"
        ? { slot: "VOCAL", userId: numericId, mode: "replace", targetId }
        : { slot: "VOCAL", userId: numericId, mode: "append" };

    await applyBoardAssignmentUpdate(update);

    return NextResponse.json({ slot, member: toMemberCard(member as RawMember) });
  }

  const userIdRaw = payload?.userId;

  if (userIdRaw == null) {
    await applyBoardAssignmentUpdate({ slot, userId: null });
    return NextResponse.json({ slot, member: null });
  }

  const numericId = Number(userIdRaw);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "INVALID_USER" }, { status: 400 });
  }

  const member = await prisma.user.findFirst({
    where: { id: numericId, isActive: true, roles: { has: Rol.JUNTA } },
    select: {
      id: true,
      name: true,
      nick: true,
      avatarUrl: true,
      oauthAvatarUrl: true,
      facePhotoUrl: true,
      image: true,
      roles: true,
      descripcion: true,
      membershipSince: true,
    },
  });

  if (!member) {
    return NextResponse.json({ error: "NOT_ELIGIBLE" }, { status: 404 });
  }

  await applyBoardAssignmentUpdate({ slot, userId: numericId });

  return NextResponse.json({ slot, member: toMemberCard(member as RawMember) });
}
