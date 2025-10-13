-- Normalize legacy spelling for exhibition format
UPDATE "GalleryAlbum"
SET "facetFormat" = 'Exposición'
WHERE "facetFormat" = 'Exposicion';

-- Ensure existing albums use the new format taxonomy
UPDATE "GalleryAlbum"
SET "facetFormat" = 'Otros'
WHERE "facetFormat" NOT IN ('Exposición', 'Liga', 'Otros', 'Social', 'Taller', 'Torneo');
