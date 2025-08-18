// src/components/profile/DescriptionSection.tsx
import * as React from "react";
import SectionCard from "./SectionCard";

export default function DescriptionSection({ since, description }: { since?: string | null; description?: string | null }) {
  return (
    <SectionCard title="Descripción">
      <div className="flex flex-col gap-2">
        <p><span className="bh-muted">Socio desde:</span> {since || "—"}</p>
        <p className="whitespace-pre-wrap">{description?.trim() || "Sin descripción."}</p>
      </div>
    </SectionCard>
  );
}
