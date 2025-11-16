"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import GameCarousel3D from "./GameCarousel3D";

type Slide = {
  src: string;
  alt: string;
  title: string;
  description: string;
  badge: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

const SLIDES: Slide[] = [
  {
    src: "/assets/img/slide1.svg",
    alt: "Partidas en el club",
    title: "Tu mesa para jugar, pintar y compartir",
    description:
      "Organizamos quedadas diarias, campañas narrativas y espacios libres para que montes tu partida con la comunidad.",
    badge: "Bienvenido a Bilbohammer",
    primaryCta: { label: "Únete al club", href: "/register" },
    secondaryCta: { label: "Quiero visitar", href: "/sobre-nosotros/contacto" },
  },
  {
    src: "/assets/img/slide2.svg",
    alt: "Competición y torneos",
    title: "Calendario competitivo y eventos especiales",
    description:
      "Torneos oficiales, ligas internas y colaboraciones con otros clubes. Consulta la agenda y reserva tu plaza.",
    badge: "Torneos y ligas",
    primaryCta: { label: "Ver próximos eventos", href: "/eventos" },
    secondaryCta: { label: "Contactar con la junta", href: "/sobre-nosotros/contacto" },
  },
  {
    src: "/assets/img/slide3.svg",
    alt: "Actividades sociales",
    title: "Actividades sociales todo el año",
    description:
      "Quedadas de pintura, masterclass, jornadas temáticas y noches de juego social abiertas a socios y amistades.",
    badge: "Vida en comunidad",
    primaryCta: { label: "Descubre novedades", href: "/novedades" },
    secondaryCta: { label: "Explora la galería", href: "/galeria" },
  },
];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [textOpacity, setTextOpacity] = useState(0);

  const slides = useMemo(() => SLIDES, []);

  const advance = useCallback(() => {
    setIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(advance, 10000);
    return () => window.clearInterval(timer);
  }, [advance, isPaused]);

  useEffect(() => {
    setTextOpacity(0);
    const raf = window.requestAnimationFrame(() => {
      setTextOpacity(1);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [index]);

  const activeSlide = slides[index];

  const handlePause = () => setIsPaused(true);
  const handleResume = () => setIsPaused(false);

  return (
    <section
      className="relative -mt-6 space-y-6 md:-mt-10 md:space-y-8"
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
    >
      <div className="relative isolate overflow-hidden bg-slate-950 text-white shadow-[0_60px_160px_rgba(8,18,30,0.65)] pb-14 md:pb-16">
        <div className="absolute inset-0 pointer-events-none">
          {slides.map((slide, idx) => (
            <Image
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              fill
              priority={idx === 0}
              sizes="100vw"
              className="object-cover pointer-events-none"
              style={{
                opacity: idx === index ? 1 : 0,
                transform: `scale(${idx === index ? 1 : 1.05})`,
                transition: "opacity 800ms ease, transform 1200ms ease",
              }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/70 to-slate-900/40 pointer-events-none" />
        </div>

        <div className="relative z-10 px-6 py-14 sm:px-12 md:px-16">
          <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div
              className="max-w-2xl space-y-6 transition-opacity duration-700 ease-in-out"
              style={{ opacity: textOpacity }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-white/75">
                {activeSlide.badge}
              </span>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
                {activeSlide.title}
              </h1>
              <p className="text-base text-white/80 md:text-lg">{activeSlide.description}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={activeSlide.primaryCta.href}
                  className="btn btn-accent text-slate-900"
                  prefetch={false}
                  onFocus={handlePause}
                  onBlur={handleResume}
                >
                  {activeSlide.primaryCta.label}
                </Link>
                {activeSlide.secondaryCta ? (
                  <Link
                    href={activeSlide.secondaryCta.href}
                    className="btn border-white/40 bg-white/10 text-white hover:bg-white/20"
                    prefetch={false}
                    onFocus={handlePause}
                    onBlur={handleResume}
                  >
                    {activeSlide.secondaryCta.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute right-8 top-8 hidden gap-2 md:flex z-20 pointer-events-auto"
          onMouseEnter={handlePause}
          onMouseLeave={handleResume}
        >
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setIndex(idx)}
              onFocus={handlePause}
              onBlur={handleResume}
              className="h-3 w-3 cursor-pointer rounded-full transition-all duration-300 hover:scale-150 focus-visible:scale-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              style={{
                backgroundColor: idx === index ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.35)",
              }}
              aria-label={`Mostrar slide ${idx + 1}`}
            />
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-8 flex justify-center gap-2 md:hidden z-20 pointer-events-auto">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setIndex(idx)}
              onFocus={handlePause}
              onBlur={handleResume}
              className="h-2.5 w-2.5 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              style={{
                backgroundColor: idx === index ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)",
                transform: idx === index ? "scale(1.3)" : "scale(1)",
              }}
              aria-label={`Mostrar slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="-mt-24 sm:-mt-[120px] md:-mt-[136px]">
        <GameCarousel3D className="px-3 sm:px-6 md:px-12" />
      </div>
    </section>
  );
}
