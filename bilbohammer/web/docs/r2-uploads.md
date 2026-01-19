# R2 uploads (presigned)

## Required environment variables
- `STORAGE_BUCKET`
- `STORAGE_REGION` (use `auto` for R2)
- `STORAGE_ENDPOINT` (R2 S3 endpoint, not the custom CDN domain)
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_PUBLIC_BASE` (CDN base, e.g. `https://cdn.bilbohammer.es` or `https://cdn.bilbohammer.es/uploads`)
- `NEXT_PUBLIC_UPLOAD_BASE` (same CDN base for client rendering, e.g. `https://cdn.bilbohammer.es/uploads`)

## Test presign + PUT with curl
1) Request a presigned URL:
```bash
curl -X POST "http://localhost:3000/api/uploads/presign" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg"}'
```
Note: Ensure your R2 CORS allows `Content-Type` and `Cache-Control` headers for PUT uploads.
2) Upload the file directly to R2:
```bash
curl -X PUT \
  -H "Content-Type: image/jpeg" \
  --data-binary @"./test.jpg" \
  "<uploadUrl>"
```
3) Open `publicUrl` in a browser (should load via the CDN domain).

## Migrate legacy uploads to R2
Dry-run:
```bash
npm run migrate:uploads-r2 -- --source /opt/render/project/src/storage/uploads --dry-run
```
Upload (skip existing objects by default):
```bash
npm run migrate:uploads-r2 -- --source /opt/render/project/src/storage/uploads
```
Overwrite existing objects:
```bash
npm run migrate:uploads-r2 -- --source /opt/render/project/src/storage/uploads --overwrite
```

## Normalize DB upload URLs to CDN
Dry-run (no writes, prints counts):
```bash
npm run normalize:upload-urls
```
Apply changes:
```bash
npm run normalize:upload-urls -- --apply
```

## What changed vs base64 uploads
- Game admin images now use `/api/uploads/presign` + direct PUT to R2.
- The backend only receives/stores the final `publicUrl` (no base64, no disk writes).
- Gallery uploads now send URLs (`imageUrl`) to `/api/gallery/upload` after direct PUT to R2.
- Avatars now upload directly to R2 and only send the final URL to `/api/me/profile`.
- Events banners/attachments use `/api/uploads/event-banner` and `/api/uploads/event-attachment` for presign + PUT.
