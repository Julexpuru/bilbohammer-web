# Uploads And R2 Rules

- New upload flows must use presigned URLs and Cloudflare R2.
- Do not add new local disk upload paths.
- Keep public rendering based on `STORAGE_PUBLIC_BASE`, `NEXT_PUBLIC_UPLOAD_BASE` or `NEXT_PUBLIC_ASSETS_BASE` as appropriate.
- Validate content type and expected file purpose before issuing upload permissions.
- Avoid base64 storage in the database.

## References

- `docs/r2-uploads.md`
- `src/app/api/uploads/presign/route.ts`
- `src/lib/uploads`
