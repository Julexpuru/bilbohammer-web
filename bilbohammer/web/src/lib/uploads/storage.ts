import path from "path";
import { promises as fs } from "fs";

const DEFAULT_STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");
const LEGACY_PUBLIC_ROOT = path.join(process.cwd(), "public", "uploads");
const PUBLIC_PREFIX = normalizePublicPrefix(process.env.UPLOADS_PUBLIC_PREFIX);

function normalizePublicPrefix(raw?: string | null) {
  const value = raw?.trim();
  if (!value) return "/uploads";
  const prefixed = value.startsWith("/") ? value : `/${value}`;
  return prefixed.replace(/\/+$/, "") || "/";
}

function resolveStorageRoot() {
  const raw = process.env.UPLOADS_ROOT?.trim();
  if (!raw) return DEFAULT_STORAGE_ROOT;
  if (path.isAbsolute(raw)) return raw;
  return path.join(process.cwd(), raw);
}

const STORAGE_ROOT = resolveStorageRoot();

function normalizeRelativePath(value: string) {
  const sanitized = value.replace(/\\/g, "/");
  const trimmed = sanitized.replace(/^\/+/, "");
  const parts = trimmed.split("/").filter((segment) => segment && segment !== "." && segment !== "..");
  return parts.join("/");
}

export function joinUploadRelativePath(...segments: string[]): string {
  return normalizeRelativePath(segments.join("/"));
}

export function getUploadsRoot() {
  return STORAGE_ROOT;
}

export function getLegacyPublicUploadsRoot() {
  return LEGACY_PUBLIC_ROOT;
}

export function getUploadsPublicPrefix() {
  return PUBLIC_PREFIX;
}

export function toPublicPath(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);
  return `${PUBLIC_PREFIX}/${normalized}`.replace(/\/{2,}/g, "/");
}

export function relativeFromPublicPath(publicPath: string | null | undefined) {
  if (!publicPath) return null;
  const trimmed = publicPath.trim();
  if (!trimmed) return null;
  const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, "");
  if (!withoutOrigin) return normalizeRelativePath(trimmed);
  if (withoutOrigin.startsWith(PUBLIC_PREFIX)) {
    return normalizeRelativePath(withoutOrigin.slice(PUBLIC_PREFIX.length));
  }
  return normalizeRelativePath(withoutOrigin);
}

export function resolveUploadAbsolute(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);
  return path.join(STORAGE_ROOT, normalized);
}

export async function saveUploadFile(relativePath: string, buffer: Buffer) {
  const absolute = resolveUploadAbsolute(relativePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer);
  return absolute;
}

export async function deleteUploadFile(publicOrRelative: string | null | undefined) {
  const relative = relativeFromPublicPath(publicOrRelative);
  if (!relative) return false;
  const absolute = resolveUploadAbsolute(relative);
  try {
    await fs.unlink(absolute);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function readUploadFile(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);
  const primary = path.join(STORAGE_ROOT, normalized);
  try {
    return await fs.readFile(primary);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  const legacy = path.join(LEGACY_PUBLIC_ROOT, normalized);
  return fs.readFile(legacy);
}

export async function statUploadFile(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);
  const primary = path.join(STORAGE_ROOT, normalized);
  try {
    const stats = await fs.stat(primary);
    return { absolute: primary, stats };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  const legacy = path.join(LEGACY_PUBLIC_ROOT, normalized);
  const stats = await fs.stat(legacy);
  return { absolute: legacy, stats };
}
