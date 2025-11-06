"use server";

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

import {
  CATEGORY_LABELS,
  type Article,
  type ArticleCategory,
  type ArticlesByCategory,
  listStaticArticles,
} from "@/app/novedades/data";

const STORAGE_PATH = path.join(process.cwd(), "data", "novedades.json");

type StorageSchema = {
  articles: Article[];
};

const ALLOWED_CATEGORIES: ArticleCategory[] = ["news", "chronicles", "members"];

function ensureCategories(article: Article): Article {
  const collected = [article.category, ...(article.categories ?? [])].filter(
    (value): value is ArticleCategory => ALLOWED_CATEGORIES.includes(value as ArticleCategory),
  );
  const uniqueCategories = Array.from(new Set(collected));
  const primary = uniqueCategories[0] ?? "news";
  return {
    ...article,
    category: primary,
    categories: uniqueCategories.length > 0 ? uniqueCategories : [primary],
  };
}

function normalizeArticle(article: Article): Article {
  const normalized: Article = ensureCategories({
    ...article,
    id: article.id ?? randomUUID(),
    slug: article.slug.trim(),
    title: article.title.trim(),
    author: article.author?.trim() ?? "",
    summary: article.summary.trim(),
    tags: article.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    comments: article.comments ?? [],
  });
  return normalized;
}

async function readStorage(): Promise<Article[]> {
  try {
    const raw = await fs.readFile(STORAGE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as StorageSchema;
    if (!parsed || !Array.isArray(parsed.articles)) {
      return [];
    }
    return parsed.articles.map((article) => ensureCategories(article));
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return [];
    }
    console.error("[novedades] No se pudo leer el almacen de noticias", error);
    return [];
  }
}

async function writeStorage(articles: Article[]) {
  const payload: StorageSchema = { articles };
  await fs.mkdir(path.dirname(STORAGE_PATH), { recursive: true });
  await fs.writeFile(STORAGE_PATH, JSON.stringify(payload, null, 2), "utf-8");
}

function sortArticles(articles: Article[]): Article[] {
  const toTimestamp = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };
  return [...articles].sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
}

export async function saveArticle(article: Article): Promise<Article> {
  const normalized = normalizeArticle(article);
  const stored = await readStorage();
  const indexById = stored.findIndex((item) => item.id === normalized.id);
  if (indexById !== -1) {
    stored[indexById] = normalized;
  } else {
    const indexBySlug = stored.findIndex((item) => item.slug === normalized.slug);
    if (indexBySlug !== -1) {
      stored[indexBySlug] = normalized;
    } else {
      stored.push(normalized);
    }
  }
  await writeStorage(stored);
  return normalized;
}

function mergeArticles(staticArticles: Article[], storedArticles: Article[]): Article[] {
  const map = new Map<string, Article>();
  for (const article of staticArticles) {
    const key = `${article.category}__${article.slug}`;
    map.set(key, ensureCategories(article));
  }
  for (const article of storedArticles) {
    const key = `${article.category}__${article.slug}`;
    map.set(key, ensureCategories(article));
  }
  return sortArticles(Array.from(map.values()));
}

export async function getAllArticles(): Promise<Article[]> {
  const staticArticles = listStaticArticles();
  const storedArticles = await readStorage();
  return mergeArticles(staticArticles, storedArticles);
}

export async function getArticlesByCategory(category: ArticleCategory): Promise<Article[]> {
  const all = await getAllArticles();
  return all.filter((article) => {
    const categories = article.categories?.length ? article.categories : [article.category];
    return categories.includes(category);
  });
}

export async function getArticlesGrouped(): Promise<ArticlesByCategory> {
  const grouped: ArticlesByCategory = {
    news: [],
    chronicles: [],
    members: [],
  };
  const articles = await getAllArticles();
  for (const article of articles) {
    const uniqueCategories = Array.from(new Set(article.categories.length > 0 ? article.categories : [article.category]));
    for (const category of uniqueCategories) {
      if (CATEGORY_LABELS[category]) {
        grouped[category].push(article);
      }
    }
  }
  (Object.keys(grouped) as ArticleCategory[]).forEach((category) => {
    grouped[category] = sortArticles(grouped[category]);
  });
  return grouped;
}

export async function findArticleByCategoryAndSlug(
  category: ArticleCategory,
  slug: string,
): Promise<Article | null> {
  const all = await getAllArticles();
  return (
    all.find((article) => article.slug === slug && article.categories.includes(category)) ?? null
  );
}

export async function findArticleById(articleId: string): Promise<Article | null> {
  if (!articleId) return null;
  const all = await getAllArticles();
  return all.find((article) => article.id === articleId) ?? null;
}

export async function searchChronicles(query: string, limit = 25): Promise<Article[]> {
  const normalized = query.trim().toLowerCase();
  const all = await getAllArticles();
  const chronicles = all.filter((article) => article.categories.includes("chronicles"));
  if (!normalized) {
    return chronicles.slice(0, limit);
  }
  return chronicles
    .filter((article) => {
      const haystack = [article.title, article.summary, article.author]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, limit);
}


