"use server";

import { randomUUID } from "crypto";
import type { NewsArticle } from "@prisma/client";

import {
  CATEGORY_LABELS,
  type Article,
  type ArticleCategory,
  type ArticleStatus,
  type ArticlesByCategory,
} from "@/app/novedades/data";
import { prisma } from "@/lib/prisma";

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

function normalizeDateString(value?: string | null): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeArticle(article: Article): Article {
  const normalized: Article = ensureCategories({
    ...article,
    id: article.id ?? randomUUID(),
    slug: article.slug.trim(),
    title: article.title.trim(),
    author: article.author?.trim() ?? "",
    summary: article.summary.trim(),
    status: normalizeStatus(article.status),
    tags: article.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    comments: article.comments ?? [],
    date: normalizeDateString(article.date),
  });
  return normalized;
}

function normalizeStatus(status?: string | null): ArticleStatus {
  return status === "draft" ? "draft" : "published";
}

function sortArticles(articles: Article[]): Article[] {
  const toTimestamp = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };
  return [...articles].sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
}

function filterDrafts(articles: Article[], includeDrafts: boolean): Article[] {
  if (includeDrafts) return articles;
  return articles.filter((article) => article.status !== "draft");
}

function mapRecordToArticle(record: NewsArticle): Article {
  return ensureCategories({
    id: record.id,
    category: (record.primaryCategory as ArticleCategory) ?? "news",
    categories: (record.categories?.length
      ? record.categories
      : [record.primaryCategory]) as ArticleCategory[],
    status: normalizeStatus((record as NewsArticle & { status?: string }).status),
    slug: record.slug,
    title: record.title,
    author: record.author ?? "",
    date: normalizeDateString(record.date.toISOString()),
    banner: record.banner ?? "",
    tags: record.tags ?? [],
    summary: record.summary,
    body: (record.body ?? []) as Article["body"],
    comments: (record.comments ?? []) as Article["comments"],
  });
}

function mapArticleToPersistence(article: Article) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    banner: article.banner,
    author: article.author,
    date: new Date(article.date),
    tags: article.tags,
    primaryCategory: article.category,
    categories: article.categories,
    status: article.status,
    body: article.body,
    comments: article.comments,
  };
}

export async function saveArticle(article: Article): Promise<Article> {
  let normalized = normalizeArticle(article);
  let record: NewsArticle | null = null;

  if (normalized.id) {
    const existingById = await prisma.newsArticle.findUnique({ where: { id: normalized.id } });
    if (existingById) {
      record = await prisma.newsArticle.update({
        where: { id: existingById.id },
        data: mapArticleToPersistence(normalized),
      });
      return mapRecordToArticle(record);
    }
  }

  const existingBySlug = await prisma.newsArticle.findUnique({
    where: { slug: normalized.slug },
  });
  if (existingBySlug) {
    normalized = { ...normalized, id: existingBySlug.id };
    record = await prisma.newsArticle.update({
      where: { slug: normalized.slug },
      data: mapArticleToPersistence(normalized),
    });
    return mapRecordToArticle(record);
  }

  record = await prisma.newsArticle.create({
    data: mapArticleToPersistence(normalized),
  });
  return mapRecordToArticle(record);
}

export async function getAllArticles(includeDrafts = false): Promise<Article[]> {
  const records = await prisma.newsArticle.findMany({
    where: includeDrafts ? {} : { status: "published" },
    orderBy: { date: "desc" },
  });
  return filterDrafts(records.map(mapRecordToArticle), includeDrafts);
}

export async function getArticlesByCategory(
  category: ArticleCategory,
  includeDrafts = false,
): Promise<Article[]> {
  const records = await prisma.newsArticle.findMany({
    where: {
      categories: {
        has: category,
      },
      ...(includeDrafts ? {} : { status: "published" }),
    },
    orderBy: { date: "desc" },
  });
  return filterDrafts(records.map(mapRecordToArticle), includeDrafts);
}

export async function getArticlesGrouped(includeDrafts = false): Promise<ArticlesByCategory> {
  const grouped: ArticlesByCategory = {
    news: [],
    chronicles: [],
    members: [],
  };
  const records = await prisma.newsArticle.findMany({
    where: includeDrafts ? {} : { status: "published" },
    orderBy: { date: "desc" },
  });
  for (const record of records) {
    const article = mapRecordToArticle(record);
    if (!includeDrafts && article.status === "draft") continue;
    const uniqueCategories = Array.from(
      new Set(article.categories.length > 0 ? article.categories : [article.category]),
    );
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
  includeDrafts = false,
): Promise<Article | null> {
  const record = await prisma.newsArticle.findFirst({
    where: {
      slug,
      categories: { has: category },
      ...(includeDrafts ? {} : { status: "published" }),
    },
  });
  if (!record) return null;
  const article = mapRecordToArticle(record);
  if (!includeDrafts && article.status === "draft") return null;
  return article;
}

export async function findArticleById(articleId: string): Promise<Article | null> {
  if (!articleId) return null;
  const record = await prisma.newsArticle.findUnique({
    where: { id: articleId },
  });
  return record ? mapRecordToArticle(record) : null;
}

export async function searchChronicles(
  query: string,
  limit = 25,
  includeDrafts = false,
): Promise<Article[]> {
  const normalized = query.trim();
  const records = await prisma.newsArticle.findMany({
    where: {
      categories: { has: "chronicles" },
      ...(includeDrafts ? {} : { status: "published" }),
      ...(normalized
        ? {
            OR: [
              { title: { contains: normalized, mode: "insensitive" } },
              { summary: { contains: normalized, mode: "insensitive" } },
              { author: { contains: normalized, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: limit,
  });
  return records.map(mapRecordToArticle);
}
