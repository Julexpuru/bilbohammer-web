'use client';

import { useEffect, useState } from "react";

type MembersCounterProps = {
  target: number;
  durationMs?: number;
};

const formatNumber = (value: number) => new Intl.NumberFormat("es-ES").format(value);

export function MembersCounter({ target, durationMs = 2000 }: MembersCounterProps) {
  const [display, setDisplay] = useState(() => (target > 0 ? 0 : target));

  useEffect(() => {
    if (target <= 0) {
      setDisplay(target);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const run = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(target * eased);
      setDisplay(nextValue);
      if (progress < 1) {
        frame = requestAnimationFrame(run);
      }
    };

    frame = requestAnimationFrame(run);

    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return <span>{formatNumber(display)}</span>;
}
