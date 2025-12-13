-- Añade un estado simple para noticias/crónicas
ALTER TABLE "NewsArticle" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'published';
