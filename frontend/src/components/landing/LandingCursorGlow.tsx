import { useEffect, useRef } from "react";

/**
 * LandingCursorGlow
 *
 * Global interactive mouse-following emerald spotlight for LandSure AI public landing page.
 * - Smooth lerp trailing motion with zero React rerenders
 * - Hardware-accelerated translate3d transforms
 * - Dynamic scale expansion when hovering interactive elements
 * - Localized CSS custom properties for card & button border glow
 * - Automatically sleeps when idle to consume 0% CPU
 * - Disabled on touch devices and prefers-reduced-motion
 */
export function LandingCursorGlow() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Check touch device or reduced motion preferences
    if (typeof window === "undefined") return;

    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || prefersReducedMotion) return;

    const spotlight = spotlightRef.current;
    if (!spotlight) return;

    let targetX = -9999;
    let targetY = -9999;
    let currentX = -9999;
    let currentY = -9999;
    let targetOpacity = 0;
    let currentOpacity = 0;
    let targetScale = 1;
    let currentScale = 1;

    let animationFrameId: number | null = null;
    let isMoving = false;

    const updateGlow = () => {
      // Smooth linear interpolation (lerp)
      const lerpFactor = 0.085;
      const opacityFactor = 0.1;
      const scaleFactor = 0.1;

      currentX += (targetX - currentX) * lerpFactor;
      currentY += (targetY - currentY) * lerpFactor;
      currentOpacity += (targetOpacity - currentOpacity) * opacityFactor;
      currentScale += (targetScale - currentScale) * scaleFactor;

      // Center the 400px spotlight on cursor (400 / 2 = 200)
      const x = currentX - 200;
      const y = currentY - 200;

      spotlight.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${currentScale.toFixed(3)})`;
      spotlight.style.opacity = currentOpacity.toFixed(3);

      // Check if settled to stop running the loop when idle
      const dist = Math.hypot(targetX - currentX, targetY - currentY);
      const opacityDiff = Math.abs(targetOpacity - currentOpacity);
      const scaleDiff = Math.abs(targetScale - currentScale);

      if (dist > 0.1 || opacityDiff > 0.005 || scaleDiff > 0.005) {
        animationFrameId = requestAnimationFrame(updateGlow);
      } else {
        isMoving = false;
        animationFrameId = null;
      }
    };

    const startAnimation = () => {
      if (!isMoving) {
        isMoving = true;
        animationFrameId = requestAnimationFrame(updateGlow);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      // Initialize immediately on first entry to prevent fly-in from -9999
      if (currentX === -9999) {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      targetX = e.clientX;
      targetY = e.clientY;
      targetOpacity = 1;

      // Interactive element detection for scale expansion & localized highlight
      const targetEl = e.target as HTMLElement | null;
      const interactiveEl = targetEl?.closest?.(
        "button, a, .feature-card, .faq-card, .demo-video-wrapper, [role='button'], input"
      ) as HTMLElement | null;

      if (interactiveEl) {
        targetScale = 1.15;

        // Feed local item coordinates for card/button border lighting
        const cardOrBtn = targetEl?.closest?.(
          ".feature-card, .faq-card, .hero-cta-btn-primary, .hero-cta-btn-secondary, .demo-video-wrapper, .demo-play-btn"
        ) as HTMLElement | null;

        if (cardOrBtn) {
          const rect = cardOrBtn.getBoundingClientRect();
          const relX = e.clientX - rect.left;
          const relY = e.clientY - rect.top;
          cardOrBtn.style.setProperty("--item-mouse-x", `${relX.toFixed(1)}px`);
          cardOrBtn.style.setProperty("--item-mouse-y", `${relY.toFixed(1)}px`);
        }
      } else {
        targetScale = 1;
      }

      startAnimation();
    };

    const onPointerLeave = () => {
      targetOpacity = 0;
      startAnimation();
    };

    const onPointerEnter = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      targetOpacity = 1;
      startAnimation();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave, { passive: true });
    document.addEventListener("pointerenter", onPointerEnter, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("pointerenter", onPointerEnter);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div
      ref={spotlightRef}
      className="landing-cursor-spotlight"
      aria-hidden="true"
    />
  );
}
