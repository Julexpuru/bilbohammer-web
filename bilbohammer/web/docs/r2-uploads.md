# R2 uploads (presigned)

## Required environment variables
- `STORAGE_BUCKET`
- `STORAGE_REGION` (use `auto` for R2)
- `STORAGE_ENDPOINT` (R2 S3 endpoint, not the custom CDN domain)
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_PUBLIC_BASE` (CDN base, e.g. `https://cdn.bilbohammer.es` or `https://cdn.bilbohammer.es/uploads`)

## Test presign + PUT with curl
1) Request a presigned URL:
```bash
curl -X POST "http://localhost:3000/api/uploads/presign" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg"}'
```
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

## What changed vs base64 uploads
- Game admin images now use `/api/uploads/presign` + direct PUT to R2.
- The backend only receives/stores the final `publicUrl` (no base64, no disk writes).
- Other legacy base64 or multipart flows can follow the same pattern when updated.
