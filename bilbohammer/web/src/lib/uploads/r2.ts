import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { buildPublicUrl, ensureUploadsKey, getPublicBase } from "@/lib/uploads/public-url";

type R2Config = {
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

function getR2Config(): R2Config {
  return {
    bucket: mustEnv("STORAGE_BUCKET"),
    region: mustEnv("STORAGE_REGION"),
    endpoint: mustEnv("STORAGE_ENDPOINT"),
    accessKeyId: mustEnv("STORAGE_ACCESS_KEY"),
    secretAccessKey: mustEnv("STORAGE_SECRET_KEY"),
  };
}

let cachedClient: S3Client | null = null;

export function getR2Client() {
  if (cachedClient) return cachedClient;
  const { region, endpoint, accessKeyId, secretAccessKey } = getR2Config();
  cachedClient = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return cachedClient;
}

export function getR2Bucket() {
  return getR2Config().bucket;
}

function buildCopySource(bucket: string, key: string) {
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, "/");
  return `${bucket}/${encodedKey}`;
}

export async function uploadBufferToR2(options: {
  key: string;
  buffer: Buffer;
  contentType?: string | null;
  cacheControl?: string;
}) {
  const client = getR2Client();
  const { bucket } = getR2Config();
  const normalizedKey = ensureUploadsKey(options.key);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
      Body: options.buffer,
      ContentType: options.contentType ?? undefined,
      CacheControl: options.cacheControl ?? "public, max-age=31536000, immutable",
    })
  );
  const publicUrl = buildPublicUrl(getPublicBase(), normalizedKey);
  return { key: normalizedKey, publicUrl };
}

export async function deleteUploadObject(key: string) {
  const client = getR2Client();
  const { bucket } = getR2Config();
  const normalizedKey = ensureUploadsKey(key);
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
    })
  );
  return normalizedKey;
}

export async function copyUploadObject(sourceKey: string, destinationKey: string) {
  const client = getR2Client();
  const { bucket } = getR2Config();
  const normalizedSource = ensureUploadsKey(sourceKey);
  const normalizedDestination = ensureUploadsKey(destinationKey);
  if (normalizedSource === normalizedDestination) {
    return normalizedDestination;
  }
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: buildCopySource(bucket, normalizedSource),
      Key: normalizedDestination,
    })
  );
  return normalizedDestination;
}
