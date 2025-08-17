"use client";

import * as React from "react";

/**
 * Render básico de Markdown:
 * - **negrita**, *cursiva*, [enlaces](url), saltos de línea
 */
export function MarkdownSafe({ text }: { text?: string | null }) {
  if (!text) return <p className="text-sm opacity-70">Sin descripción.</p>;

  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[(.*?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" class="underline" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n/g, "<br/>");

  return <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}
