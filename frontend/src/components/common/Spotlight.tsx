import React, { useCallback, useRef } from "react";

/**
 * Lightweight pointer event handlers for applying a restrained CSS-based
 * spotlight highlight directly on any element without triggering React state re-renders.
 */
export function onSpotlightMove(e: React.PointerEvent<HTMLElement>, spotlightOpacity = "1") {
  if (e.pointerType === "touch") return;
  const target = e.currentTarget;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  target.style.setProperty("--mouse-x", `${x}px`);
  target.style.setProperty("--mouse-y", `${y}px`);
  target.style.setProperty("--spotlight-opacity", spotlightOpacity);
}

export function onSpotlightLeave(e: React.PointerEvent<HTMLElement>) {
  const target = e.currentTarget;
  if (!target) return;
  target.style.setProperty("--spotlight-opacity", "0");
}

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightSize?: number;
  interactive?: boolean;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = "",
  spotlightColor = "rgba(94, 234, 212, 0.12)",
  spotlightSize = 220,
  interactive = true,
  style = {},
  ...props
}) => {
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      onSpotlightMove(e, "1");
    },
    [interactive]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      onSpotlightLeave(e);
    },
    [interactive]
  );

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`ls-spotlight-box relative overflow-hidden ${className}`}
      style={{
        "--spotlight-color": spotlightColor,
        "--spotlight-size": `${spotlightSize}px`,
        ...style,
      } as React.CSSProperties}
      {...props}
    >
      {/* Restrained Pointer Spotlight Layer */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 ease-out opacity-0 ls-spotlight-glow"
        style={{
          opacity: "var(--spotlight-opacity, 0)",
          background: `radial-gradient(var(--spotlight-size, 220px) circle at var(--mouse-x, -999px) var(--mouse-y, -999px), var(--spotlight-color, rgba(94, 234, 212, 0.12)), transparent 75%)`,
        }}
        aria-hidden="true"
      />
      {/* Content Layer */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};
