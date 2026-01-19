"use client";

"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { gameIconPath } from "@/lib/games";
import { useGamesCatalog } from "@/lib/use-games-catalog";

type GameEntry = {
  slug: string;
  name: string;
  iconImagePath: string;
};

const EXCLUDED_SLUGS = new Set(["boardgames", "otros"]);
const AUTO_ROTATE_MS = 6500;
const FRAME_CLASS = "w-full";

function normalizeOffset(index: number, active: number, length: number) {
  let diff = index - active;
  const half = length / 2;
  if (diff > half) diff -= length;
  if (diff < -half) diff += length;
  return diff;
}

export default function GameCarousel3D({ className }: { className?: string }) {
  const router = useRouter();
  const { games: catalog } = useGamesCatalog();
  const games = useMemo<GameEntry[]>(() => {
    return catalog
      .filter((game) => !EXCLUDED_SLUGS.has(game.slug))
      .map((game) => ({
        slug: game.slug,
        name: game.name,
        iconImagePath: game.iconImagePath ?? gameIconPath(game.slug),
      }));
  }, [catalog]);

  const [rotation, setRotation] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const rotateBy = useCallback(
    (step: number) => {
      setRotation((prev) => {
        if (!games.length) return prev;
        let next = prev + step;
        const length = games.length;
        if (next >= length) next -= length;
        if (next < 0) next += length;
        return next;
      });
    },
    [games.length]
  );

  useEffect(() => {
    if (!games.length) return;
    if (isHovered) return;

    let raf: number;
    const tick = () => {
      rotateBy(0.005);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [games.length, isHovered, rotateBy]);

  const normalizedRotation =
    games.length > 0 ? ((rotation % games.length) + games.length) % games.length : 0;
  const baseIndex = Math.floor(normalizedRotation);
  const fraction = normalizedRotation - baseIndex;
  const highlightedIndex = games.length
    ? (baseIndex + (fraction >= 0.75 ? 1 : 0)) % games.length
    : 0;

  const navigateToGame = (slug: string) => {
    router.push(`/sobre-nosotros/juegos?open=${slug}#${slug}`);
  };

  const handleCardClick = (event: ReactMouseEvent<HTMLButtonElement>, index: number, slug: string) => {
    event.preventDefault();
    event.stopPropagation();
    navigateToGame(slug);
  };

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number, slug: string) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateBy(1);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateBy(-1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateToGame(slug);
    }
  };

  const activeGame = games[highlightedIndex] ?? null;

  return (
    <div
      className={clsx("relative w-full text-white pointer-events-none", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={clsx(
          "pointer-events-none relative -mt-[13rem] mb-8 flex h-[310px] w-full items-center justify-center overflow-hidden sm:-mt-[14.5rem] sm:h-[350px] pb-8",
          FRAME_CLASS
        )}
        style={{ perspective: "1600px" }}
      >
        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-[61.25%] -translate-y-1/2">
          {games.map((game, index) => {
            const offset = normalizeOffset(index, normalizedRotation, games.length);
            const abs = Math.abs(offset);

            if (abs > 3.5) {
              return null;
            }
            const translateX = offset * 150;
            const translateY = abs * 14;
            const translateZ = -abs * 135;
            const rotateY = offset * -10;
            const scale = 1 - abs * 0.038;
            const opacity = Math.max(0.45, 1 - abs * 0.2);
            const isActive = index === highlightedIndex;

            return (
              <button
                key={game.slug}
                type="button"
                aria-label={`Explorar ${game.name}`}
                aria-pressed={isActive}
                onClick={(event) => handleCardClick(event, index, game.slug)}
                onKeyDown={(event) => handleCardKeyDown(event, index, game.slug)}
                data-carousel-card="true"
                className="pointer-events-auto absolute left-1/2 top-1/2 h-[230px] w-[202px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[34px] bg-transparent p-6 outline-none transition-[box-shadow] duration-300"
                style={{
                  transform: `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex: Math.round(100 - abs * 10),
                  transition:
                    "transform 650ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 450ms ease, z-index 0s linear, box-shadow 400ms ease",
                }}
              >
                <div className="relative flex h-full w-full items-center justify-center">
                  <div className="relative h-[11rem] w-[11rem] sm:h-[12rem] sm:w-[12rem]">
                    <Image
                      src={game.iconImagePath}
                      alt={`Icono de ${game.name}`}
                      fill
                      sizes="(min-width: 1024px) 12rem, 10rem"
                      className={clsx(
                        "object-contain drop-shadow-[0_12px_28px_rgba(8,18,30,0.55)] transform",
                        game.slug === "rol" ? "scale-[0.8]" : ""
                      )}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeGame ? (
        <>
          <div
            className={clsx(
              "pointer-events-auto relative z-30 mx-auto mt-10 flex w-full flex-col items-center gap-3 px-2 text-white -translate-x-[1%]",
              FRAME_CLASS
            )}
            style={{ backgroundColor: "transparent" }}
          >
            <span className="text-4xl font-semibold tracking-wide text-white">{activeGame.name}</span>
            <Link
              href={`/eventos?games=${encodeURIComponent(activeGame.slug)}`}
              className="btn btn-accent"
              prefetch={false}
            >
              Ver agenda
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
