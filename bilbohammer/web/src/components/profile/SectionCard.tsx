// src/components/profile/SectionCard.tsx
import * as React from "react";
type Props = React.PropsWithChildren<{
  title?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}>;

export default function SectionCard({ title, right, className, children }: Props) {
  return (
    <section className={`bh-card bh-card--p ${className ?? ""}`}>
      {(title || right) && (
        <header className="flex items-center justify-between mb-3">
          {title ? <h3 className="bh-section-title">{title}</h3> : <div />}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}
