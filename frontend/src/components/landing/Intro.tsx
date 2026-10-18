import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";

const INTRO_STORAGE_KEY = "ls-intro";

const parcels = [
  "M60 120 L150 90 L200 150 L120 190 Z",
  "M150 90 L250 70 L280 140 L200 150 Z",
  "M120 190 L200 150 L260 210 L170 250 Z",
  "M200 150 L280 140 L330 200 L260 210 Z",
];

function hasSeenIntro(): boolean {
  try {
    return sessionStorage.getItem(INTRO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroComplete(): void {
  try {
    sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
  } catch {
    // Graceful fallback if storage unavailable
  }
}

export function Intro() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(() => !hasSeenIntro());
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!show) return;

    // Progress bar animation for Stage 3
    const pTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(pTimer);
          return 100;
        }
        return prev + (reduce ? 35 : 12);
      });
    }, reduce ? 50 : 160);

    const timer = setTimeout(
      () => {
        markIntroComplete();
        setShow(false);
      },
      reduce ? 600 : 2600
    );

    return () => {
      clearTimeout(timer);
      clearInterval(pTimer);
    };
  }, [reduce, show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 grid place-items-center bg-[#080B0B] px-4"
          style={{ backgroundColor: "#080B0B", zIndex: 99999, pointerEvents: "none" }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: "blur(8px)",
          }}
          transition={{
            duration: reduce ? 0.2 : 0.65,
            ease: [0.22, 1, 0.36, 1],
          }}
          aria-label="LandSure AI লোড হচ্ছে"
          role="status"
        >
          {/* Stage 1: Digital Land Environment Background */}
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />

          <div className="relative flex flex-col items-center text-center">
            {/* Cadastral Grid Lines and Parcel Boundary Illumination */}
            <svg
              viewBox="0 0 390 300"
              className="absolute -top-28 h-[300px] w-[390px] opacity-80"
              aria-hidden="true"
            >
              {[60, 120, 180, 240].map((y, i) => (
                <motion.line
                  key={y}
                  x1="0"
                  x2="390"
                  y1={y}
                  y2={y}
                  className="stroke-primary/25"
                  strokeWidth="0.8"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.08 }}
                />
              ))}
              {parcels.map((d, i) => (
                <motion.path
                  key={d}
                  d={d}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="1.4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.85 }}
                  transition={{
                    duration: 0.9,
                    delay: 0.2 + i * 0.12,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </svg>

            {/* Stage 2: Brand Reveal */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                delay: reduce ? 0 : 0.8,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative"
            >
              <span className="absolute inset-0 rounded-2xl bg-primary/30 animate-pulse-ring" />
              <LogoMark className="relative h-20 w-20" />
            </motion.div>

            {/* Brand Wordmark */}
            <motion.p
              initial={{ opacity: 0, y: 8, letterSpacing: "0.2em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0em" }}
              transition={{ delay: reduce ? 0 : 1.1, duration: 0.6 }}
              className="mt-6 font-display text-3xl font-extrabold sm:text-4xl text-[#F7FAF9]"
            >
              LandSure <span className="text-primary">AI</span>
            </motion.p>

            {/* Bengali Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 1.35, duration: 0.5 }}
              className="mt-2 text-base text-muted-foreground sm:text-lg"
            >
              জমি কেনার আগে, নিশ্চিত হোন।
            </motion.p>

            {/* Stage 3: Intelligent System Initialization & Progress Line */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 1.6, duration: 0.5 }}
              className="mt-6 flex flex-col items-center gap-2.5"
            >
              <p className="text-xs font-medium text-primary sm:text-sm">
                আপনার ভূমি যাচাইয়ের স্মার্ট প্ল্যাটফর্ম প্রস্তুত হচ্ছে...
              </p>

              {/* Thin glowing animated progress bar */}
              <div className="h-1 w-56 overflow-hidden rounded-full bg-elevated sm:w-64">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.6)]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.2 }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
