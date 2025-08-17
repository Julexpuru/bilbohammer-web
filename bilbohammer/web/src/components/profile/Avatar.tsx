"use client";

import * as React from "react";

export function Avatar({
  avatarUrl,
  oauthAvatarUrl,
  displayName,
  size = 80,
}: {
  avatarUrl?: string | null;
  oauthAvatarUrl?: string | null;
  displayName: string;
  size?: number;
}) {
  const chosen = avatarUrl || oauthAvatarUrl || null;

  return (
    <div
      aria-label="Avatar"
      className="rounded-full border border-white/20 grid place-items-center overflow-hidden bg-gradient-to-br from-cyan-600 to-slate-800"
      style={{ width: size, height: size }}
    >
      {chosen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chosen}
          alt={displayName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Placeholder name={displayName} />
      )}
    </div>
  );
}

function Placeholder({ name }: { name: string }) {
  const initial = (name?.trim?.()?.[0]?.toUpperCase?.() ?? "?");
  return (
    <div className="font-bold text-2xl select-none">{initial}</div>
  );
}
