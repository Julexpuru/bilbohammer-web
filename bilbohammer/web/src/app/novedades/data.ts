export type ArticleCategory = "news" | "chronicles" | "members";

export const ARTICLE_CATEGORIES: ArticleCategory[] = ["news", "chronicles", "members"];

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  news: "Noticias",
  chronicles: "Crónicas",
  members: "Solo Socios",
};

export type ArticleStatus = "draft" | "published";

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
      layout?: "full" | "float-left" | "float-right";
    }
  | { type: "quote"; text: string; attribution?: string };

export type ArticleComment = {
  id: string;
  author: string;
  avatarInitials: string;
  postedAt: string;
  message: string;
  replies?: ArticleComment[];
};

export type Article = {
  id: string;
  category: ArticleCategory;
  categories: ArticleCategory[];
  status: ArticleStatus;
  slug: string;
  title: string;
  author: string;
  date: string;
  banner: string;
  tags: string[];
  summary: string;
  body: ArticleBlock[];
  comments: ArticleComment[];
};

export type ArticlesByCategory = Record<ArticleCategory, Article[]>;

export function collectArticleImages(article: Article): string[] {
  const seen = new Set<string>();
  const images: string[] = [];

  if (article.banner) {
    seen.add(article.banner);
    images.push(article.banner);
  }

  for (const block of article.body) {
    if (block.type === "image" && !seen.has(block.src)) {
      seen.add(block.src);
      images.push(block.src);
    }
  }

  return images;
}
