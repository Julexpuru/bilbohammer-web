import path from "path";
import { promises as fs } from "fs";
import prisma from "../src/lib/prisma";
import {
  joinUploadRelativePath,
  saveUploadFile,
  toPublicPath,
} from "../src/lib/uploads/storage";
import { LEGACY_GAME_META } from "../src/lib/games";

type GameRecord = {
  id: string;
  slug: string;
  iconImagePath: string | null;
  heroImagePath: string | null;
};

function hasRemoteOrUploadsPath(value?: string | null) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  const normalized = trimmed.replace(/^\/+/, "");
  return normalized.startsWith("uploads/");
}

function guessContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".bmp":
      return "image/bmp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function fileExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readSourceBuffer(sourcePath: string) {
  const buffer = await fs.readFile(sourcePath);
  return buffer;
}

async function resolveLegacyFile(slug: string, options: { currentPath?: string | null; kind: "icon" | "hero" }) {
  const candidates: string[] = [];
  const normalizedFromDb = normalizeAssetPath(options.currentPath);
  if (normalizedFromDb) {
    candidates.push(normalizedFromDb);
  }

  const legacyMeta = LEGACY_GAME_META[slug];
  const metaPath =
    options.kind === "icon" ? legacyMeta?.iconImagePath ?? null : legacyMeta?.heroImagePath ?? null;
  if (metaPath) {
    const normalized = normalizeAssetPath(metaPath);
    if (normalized) {
      candidates.push(normalized);
    }
  }

  // Default fallback location.
  if (options.kind === "icon") {
    candidates.push(path.join("public", "assets", "icons", "games", `${slug}.png`));
    candidates.push(path.join("public", "assets", "icons", "games", `${slug}.jpg`));
  } else {
    candidates.push(path.join("public", "assets", "heroes", "games", `${slug}.jpg`));
    candidates.push(path.join("public", "assets", "heroes", "games", `${slug}.png`));
  }

  for (const candidate of candidates) {
    const absolute = path.isAbsolute(candidate)
      ? candidate
      : path.join(process.cwd(), candidate.replace(/^public[\\/]/, "public/"));
    if (await fileExists(absolute)) {
      return absolute;
    }
  }
  return null;
}

function normalizeAssetPath(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return null;
  }
  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");
  if (withoutLeadingSlash.startsWith("uploads/")) {
    // Already in uploads storage.
    return null;
  }
  if (withoutLeadingSlash.startsWith("public/")) {
    return path.join(process.cwd(), withoutLeadingSlash);
  }
  return path.join(process.cwd(), "public", withoutLeadingSlash);
}

async function migrateFile(slug: string, kind: "icon" | "hero", sourcePath: string) {
  const buffer = await readSourceBuffer(sourcePath);
  const extension = path.extname(sourcePath) || ".png";
  const baseName = `${slug}-${kind}-${Date.now()}${extension}`;
  const relativePath = joinUploadRelativePath("games", kind === "icon" ? "icons" : "hero", baseName);
  await saveUploadFile(relativePath, buffer, { contentType: guessContentType(sourcePath) });
  return toPublicPath(relativePath);
}

async function migrateGame(game: GameRecord) {
  const updates: Partial<Pick<GameRecord, "iconImagePath" | "heroImagePath">> = {};

  if (!game.iconImagePath || !hasRemoteOrUploadsPath(game.iconImagePath)) {
    const source = await resolveLegacyFile(game.slug, {
      currentPath: game.iconImagePath,
      kind: "icon",
    });
    if (source) {
      updates.iconImagePath = await migrateFile(game.slug, "icon", source);
      console.log(`Icono migrado para ${game.slug}: ${updates.iconImagePath}`);
    } else {
      console.warn(`No se encontró icono legacy para ${game.slug}`);
    }
  }

  if (!game.heroImagePath || !hasRemoteOrUploadsPath(game.heroImagePath)) {
    const source = await resolveLegacyFile(game.slug, {
      currentPath: game.heroImagePath,
      kind: "hero",
    });
    if (source) {
      updates.heroImagePath = await migrateFile(game.slug, "hero", source);
      console.log(`Banner migrado para ${game.slug}: ${updates.heroImagePath}`);
    } else {
      console.warn(`No se encontró banner legacy para ${game.slug}`);
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.game.update({
      where: { id: game.id },
      data: updates,
    });
  }
}

async function run() {
  const games = await prisma.game.findMany({
    select: {
      id: true,
      slug: true,
      iconImagePath: true,
      heroImagePath: true,
    },
  });

  for (const game of games) {
    await migrateGame(game);
  }

  await prisma.$disconnect();
  console.log("Migración completada.");
}

run().catch((error) => {
  console.error("Fallo en la migración de medios legacy", error);
  prisma.$disconnect().catch(() => {
    // ignore
  });
  process.exit(1);
});
