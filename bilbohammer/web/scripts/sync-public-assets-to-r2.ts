import path from "path";
import { createReadStream } from "fs";
import { promises as fs } from "fs";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_SOURCE = path.join(process.cwd(), "public", "assets");
const DEFAULT_PREFIX = "assets";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const EXTENSION_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

type Options = {
  source: string;
  prefix: string;
  dryRun: boolean;
  overwrite: boolean;
};

function mustEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function resolveContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_MIME[ext] ?? null;
}

function normalizeKey(prefix: string, relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const normalizedPrefix = prefix.replace(/\/+$/, "");
  return `${normalizedPrefix}/${normalized}`.replace(/^\/+/, "");
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listFiles(absolute)));
    } else if (entry.isFile()) {
      results.push(absolute);
    }
  }
  return results;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    source: DEFAULT_SOURCE,
    prefix: DEFAULT_PREFIX,
    dryRun: false,
    overwrite: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") {
      options.source = args[index + 1] || options.source;
      index += 1;
    } else if (arg.startsWith("--source=")) {
      options.source = arg.split("=", 2)[1] || options.source;
    } else if (arg === "--prefix") {
      options.prefix = args[index + 1] || options.prefix;
      index += 1;
    } else if (arg.startsWith("--prefix=")) {
      options.prefix = arg.split("=", 2)[1] || options.prefix;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--overwrite") {
      options.overwrite = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: tsx scripts/sync-public-assets-to-r2.ts [options]

Options:
  --source <path>    Source directory (default: ${DEFAULT_SOURCE})
  --prefix <prefix>  Key prefix in R2 (default: ${DEFAULT_PREFIX})
  --dry-run          Do not upload, only report actions
  --overwrite        Upload even if the object already exists
`);
}

async function objectExists(client: S3Client, bucket: string, key: string) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error: any) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") {
      return false;
    }
    throw error;
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const sourceRoot = path.resolve(options.source);
  const stats = await fs.stat(sourceRoot).catch(() => null);
  if (!stats?.isDirectory()) {
    throw new Error(`Source directory not found: ${sourceRoot}`);
  }

  const bucket = mustEnv("STORAGE_BUCKET");
  const region = mustEnv("STORAGE_REGION");
  const endpoint = mustEnv("STORAGE_ENDPOINT");
  const accessKeyId = mustEnv("STORAGE_ACCESS_KEY");
  const secretAccessKey = mustEnv("STORAGE_SECRET_KEY");

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  const files = await listFiles(sourceRoot);
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`Found ${files.length} files under ${sourceRoot}`);

  for (const filePath of files) {
    const relative = path.relative(sourceRoot, filePath);
    const key = normalizeKey(options.prefix, relative);
    try {
      const exists = options.overwrite ? false : await objectExists(client, bucket, key);
      if (exists) {
        skipped += 1;
        console.log(`skip ${key}`);
        continue;
      }

      if (options.dryRun) {
        uploaded += 1;
        console.log(`dry-run upload ${key}`);
        continue;
      }

      const contentType = resolveContentType(filePath);
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: createReadStream(filePath),
        CacheControl: CACHE_CONTROL,
        ...(contentType ? { ContentType: contentType } : {}),
      });

      await client.send(command);
      uploaded += 1;
      console.log(`uploaded ${key}`);
    } catch (error) {
      errors += 1;
      console.error(`error ${key}`, error);
    }
  }

  console.log("----");
  console.log(`Total: ${files.length}`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

run().catch((error) => {
  console.error("Sync failed", error);
  process.exit(1);
});
