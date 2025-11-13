import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const PUBLIC_PREFIX = "/uploads/oauth-cache";
const CACHE_DIR = path.join(process.cwd(), "public", PUBLIC_PREFIX.replace(/^\//, ""));

type CacheParams = {
  userId: number | null;
  remoteUrl: string;
  currentLocalPath?: string | null;
};

export const isHttpUrl = (value: string | null | undefined) =>
  typeof value === "string" && /^https?:\/\//i.test(value);

const extensionFromMime = (mime: string | null): string => {
  if (!mime) return ".jpg";
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("bmp")) return ".bmp";
  return ".jpg";
};

const deleteLocalIfNeeded = async (localPath?: string | null) => {
  if (!localPath || !localPath.startsWith(`${PUBLIC_PREFIX}/`)) return;
  const absPath = path.join(process.cwd(), "public", localPath.replace(/^\//, ""));
  try {
    await fs.unlink(absPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
      throw err;
    }
  }
};

export async function cacheRemoteAvatar({ userId, remoteUrl, currentLocalPath }: CacheParams) {
  if (!isHttpUrl(remoteUrl)) return null;
  try {
    const res = await fetch(remoteUrl, {
      headers: {
        Accept: "image/*",
        "User-Agent": "BilbohammerAvatarFetcher/1.0",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 10);
    const safeUser = Number.isFinite(userId) && userId != null ? userId : "anon";
    const filename = `oauth_${safeUser}_${Date.now()}_${hash}${extensionFromMime(contentType)}`;
    const absDest = path.join(CACHE_DIR, filename);
    await fs.writeFile(absDest, buffer);
    await deleteLocalIfNeeded(currentLocalPath ?? null);
    return `${PUBLIC_PREFIX}/${filename}`;
  } catch {
    return null;
  }
}
