"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  { src: "/assets/img/slide1.svg", alt: "Partida en el club" },
  { src: "/assets/img/slide2.svg", alt: "Torneo de wargames" },
  { src: "/assets/img/slide3.svg", alt: "Quedada de fin de semana" },
];

export default function HeroCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative w-full h-[38vh] md:h-[54vh] overflow-hidden rounded-2xl mt-6">
      {slides.map((s, idx) => (
        <Image
          key={s.src}
          src={s.src}
          alt={s.alt}
          fill
          priority={idx === i}
          sizes="100vw"
          style={{
            objectFit: "cover",
            transform: `translateX(${(idx - i) * 100}%)`,
            transition: "transform 800ms ease-in-out",
          }}
        />
      ))}
    </div>
  );
}
