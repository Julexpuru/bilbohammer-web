import prisma from "../src/lib/prisma";

type NormalizeResult = {
  normalized: string;
  changed: boolean;
  skipped: boolean;
};

const KNOWN_PREFIXES = [
  "uploads/",
  "gallery/",
  "event-banners/",
  "event-attachments/",
  "avatars/",
  "games/",
  "tables/",
];

function mustBase() {
  const base = process.env.STORAGE_PUBLIC_BASE ?? process.env.NEXT_PUBLIC_UPLOAD_BASE;
  if (!base) {
    throw new Error("Missing STORAGE_PUBLIC_BASE or NEXT_PUBLIC_UPLOAD_BASE.");
  }
  return base;
}

function normalizePublicBase(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function buildPublicUrl(base: string, key: string) {
  const normalizedBase = normalizePublicBase(base);
  const normalizedKey = key.replace(/^\/+/, "");
  if (normalizedBase.endsWith("/uploads") && normalizedKey.startsWith("uploads/")) {
    return `${normalizedBase}/${normalizedKey.slice("uploads/".length)}`;
  }
  return `${normalizedBase}/${normalizedKey}`;
}

function extractKey(value: string) {
  const cleaned = value.replace(/\\/g, "/").trim();
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  const idx = lower.indexOf("uploads/");
  if (idx >= 0) {
    return cleaned.slice(idx).replace(/^\/+/, "");
  }
  const withoutSlash = cleaned.replace(/^\/+/, "");
  if (KNOWN_PREFIXES.some((prefix) => withoutSlash.startsWith(prefix))) {
    return withoutSlash;
  }
  return null;
}

function normalizeUploadUrl(raw: string | null | undefined, base: string): NormalizeResult | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) {
    return { normalized: trimmed, changed: false, skipped: true };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const hostname = parsed.hostname.toLowerCase();
      const cdnHost = new URL(base).hostname.toLowerCase();
      if (hostname === cdnHost) {
        return { normalized: trimmed, changed: false, skipped: false };
      }

      const keyFromPath = extractKey(parsed.pathname);
      if (!keyFromPath) {
        return { normalized: trimmed, changed: false, skipped: true };
      }

      const normalized = buildPublicUrl(base, keyFromPath);
      return { normalized, changed: normalized !== trimmed, skipped: false };
    } catch {
      return { normalized: trimmed, changed: false, skipped: true };
    }
  }

  const key = extractKey(trimmed);
  if (!key) {
    return { normalized: trimmed, changed: false, skipped: true };
  }

  const normalized = buildPublicUrl(base, key);
  return { normalized, changed: normalized !== trimmed, skipped: false };
}

function parseArgs(args: string[]) {
  return {
    apply: args.includes("--apply"),
    verbose: args.includes("--verbose"),
  };
}

async function updateField<T extends { id: string | number }>(options: {
  label: string;
  rows: T[];
  getValue: (row: T) => string | null | undefined;
  update: (row: T, value: string) => Promise<unknown>;
  base: string;
  verbose: boolean;
  apply: boolean;
}) {
  let touched = 0;
  let skipped = 0;
  for (const row of options.rows) {
    const current = options.getValue(row);
    const result = normalizeUploadUrl(current, options.base);
    if (!result) {
      skipped += 1;
      continue;
    }
    if (result.skipped || !result.changed) {
      skipped += 1;
      continue;
    }
    touched += 1;
    if (options.verbose) {
      console.log(`[${options.label}] ${row.id}: ${current} -> ${result.normalized}`);
    }
    if (options.apply) {
      await options.update(row, result.normalized);
    }
  }
  return { touched, skipped };
}

async function run() {
  const { apply, verbose } = parseArgs(process.argv.slice(2));
  const base = mustBase();
  console.log(`Using base: ${normalizePublicBase(base)}`);
  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);

  const users = await prisma.user.findMany({
    select: { id: true, avatarUrl: true, facePhotoUrl: true },
  });
  const games = await prisma.game.findMany({
    select: { id: true, iconImagePath: true, heroImagePath: true },
  });
  const events = await prisma.event.findMany({
    select: { id: true, bannerUrl: true },
  });
  const attachments = await prisma.eventAttachment.findMany({
    select: { id: true, fileUrl: true },
  });
  const galleryAlbums = await prisma.galleryAlbum.findMany({
    select: { id: true, coverImagePath: true },
  });
  const galleryImages = await prisma.galleryImage.findMany({
    select: { id: true, storagePath: true },
  });
  const tables = await prisma.clubTable.findMany({
    select: { id: true, layoutImagePath: true, sceneryImagePath: true },
  });

  const summary = {
    users: await updateField({
      label: "user.avatarUrl",
      rows: users,
      getValue: (row) => row.avatarUrl,
      update: (row, value) =>
        prisma.user.update({ where: { id: row.id }, data: { avatarUrl: value } }),
      base,
      verbose,
      apply,
    }),
    usersFace: await updateField({
      label: "user.facePhotoUrl",
      rows: users,
      getValue: (row) => row.facePhotoUrl,
      update: (row, value) =>
        prisma.user.update({ where: { id: row.id }, data: { facePhotoUrl: value } }),
      base,
      verbose,
      apply,
    }),
    gamesIcon: await updateField({
      label: "game.iconImagePath",
      rows: games,
      getValue: (row) => row.iconImagePath,
      update: (row, value) =>
        prisma.game.update({ where: { id: row.id }, data: { iconImagePath: value } }),
      base,
      verbose,
      apply,
    }),
    gamesHero: await updateField({
      label: "game.heroImagePath",
      rows: games,
      getValue: (row) => row.heroImagePath,
      update: (row, value) =>
        prisma.game.update({ where: { id: row.id }, data: { heroImagePath: value } }),
      base,
      verbose,
      apply,
    }),
    eventsBanner: await updateField({
      label: "event.bannerUrl",
      rows: events,
      getValue: (row) => row.bannerUrl,
      update: (row, value) =>
        prisma.event.update({ where: { id: row.id }, data: { bannerUrl: value } }),
      base,
      verbose,
      apply,
    }),
    attachments: await updateField({
      label: "eventAttachment.fileUrl",
      rows: attachments,
      getValue: (row) => row.fileUrl,
      update: (row, value) =>
        prisma.eventAttachment.update({ where: { id: row.id }, data: { fileUrl: value } }),
      base,
      verbose,
      apply,
    }),
    galleryCover: await updateField({
      label: "galleryAlbum.coverImagePath",
      rows: galleryAlbums,
      getValue: (row) => row.coverImagePath,
      update: (row, value) =>
        prisma.galleryAlbum.update({ where: { id: row.id }, data: { coverImagePath: value } }),
      base,
      verbose,
      apply,
    }),
    galleryImage: await updateField({
      label: "galleryImage.storagePath",
      rows: galleryImages,
      getValue: (row) => row.storagePath,
      update: (row, value) =>
        prisma.galleryImage.update({ where: { id: row.id }, data: { storagePath: value } }),
      base,
      verbose,
      apply,
    }),
    tablesLayout: await updateField({
      label: "clubTable.layoutImagePath",
      rows: tables,
      getValue: (row) => row.layoutImagePath,
      update: (row, value) =>
        prisma.clubTable.update({ where: { id: row.id }, data: { layoutImagePath: value } }),
      base,
      verbose,
      apply,
    }),
    tablesScenery: await updateField({
      label: "clubTable.sceneryImagePath",
      rows: tables,
      getValue: (row) => row.sceneryImagePath,
      update: (row, value) =>
        prisma.clubTable.update({ where: { id: row.id }, data: { sceneryImagePath: value } }),
      base,
      verbose,
      apply,
    }),
  };

  console.log("----");
  console.log("Summary (touched/skipped):");
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`${key}: ${value.touched}/${value.skipped}`);
  });
}

run()
  .catch((error) => {
    console.error("Normalization failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
