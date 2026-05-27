import clsx from "clsx";

type ChevronIconProps = {
  open?: boolean;
  direction?: "down" | "left" | "right";
  className?: string;
};

export function ChevronIcon({ open = false, direction = "down", className }: ChevronIconProps) {
  const directionClass =
    direction === "left" ? "rotate-90" : direction === "right" ? "-rotate-90" : open ? "rotate-180" : "";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={clsx("h-3 w-3 shrink-0 transition-transform duration-150", directionClass, className)}
      focusable="false"
    >
      <path
        d="M2 4.5 6 8l4-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
