import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { LogoMark, Wordmark } from "../landing/Logo";

interface DashboardEntryTransitionProps {
  show: boolean;
  onComplete: () => void;
  targetModuleName?: string;
}

const cadastralParcels = [
  "M70 110 L160 85 L210 145 L130 180 Z",
  "M160 85 L260 65 L290 135 L210 145 Z",
  "M130 180 L210 145 L270 205 L180 240 Z",
  "M210 145 L290 135 L340 195 L270 205 Z",
];

export function DashboardEntryTransition({
  show,
  onComplete,
  targetModuleName,
}: DashboardEntryTransitionProps) {
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    if (!show) return;

    const intervalTime = reduce ? 30 : 90;
    const increment = reduce ? 40 : 18;

    const pTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(pTimer);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    const finishTimer = setTimeout(
      () => {
        onComplete();
      },
      reduce ? 350 : 1200
    );

    return () => {
      clearTimeout(finishTimer);
      clearInterval(pTimer);
    };
  }, [show, reduce, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="dashboard-entry-transition"
          className="fixed inset-0 grid place-items-center bg-[#080B0B] px-4 pointer-events-auto"
          style={{ zIndex: 99999 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
            filter: "blur(6px)",
          }}
          transition={{
            duration: reduce ? 0.2 : 0.45,
            ease: [0.22, 1, 0.36, 1],
          }}
          role="status"
          aria-live="polite"
          aria-label="আপনার ভূমি তথ্য প্রস্তুত করা হচ্ছে"
        >
          {/* Subtle Cadastral Ambient Background Grid */}
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" />

          {/* Central Animated Content */}
          <div className="relative flex flex-col items-center text-center max-w-md">
            {/* Cadastral Boundary Lines Illustration */}
            <svg
              viewBox="0 0 400 300"
              className="absolute -top-24 h-[260px] w-[340px] opacity-75 pointer-events-none"
              aria-hidden="true"
            >
              {[70, 130, 190, 250].map((y, i) => (
                <motion.line
                  key={y}
                  x1="20"
                  x2="380"
                  y1={y}
                  y2={y}
                  className="stroke-primary/20"
                  strokeWidth="0.8"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.06 }}
                />
              ))}
              {cadastralParcels.map((d, i) => (
                <motion.path
                  key={d}
                  d={d}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="1.2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.8 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.15 + i * 0.09,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </svg>

            {/* Logo Mark with Low-Intensity Pulse Ring */}
            <motion.div
              initial={{ scale: 0.75, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                duration: reduce ? 0.2 : 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative mt-4"
            >
              <LogoMark size={64} className="h-16 w-16" animated={true} />
            </motion.div>

            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0.05 : 0.2, duration: 0.4 }}
              className="mt-4"
            >
              <Wordmark className="text-2xl sm:text-3xl" />
            </motion.div>

            {/* Primary Bengali Status Text */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0.1 : 0.3, duration: 0.4 }}
              className="mt-3 text-sm sm:text-base font-medium text-primary"
            >
              আপনার ভূমি তথ্য প্রস্তুত করা হচ্ছে...
            </motion.p>

            {targetModuleName && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ delay: reduce ? 0.15 : 0.45, duration: 0.3 }}
                className="mt-1 text-xs text-muted-foreground"
              >
                গন্তব্য মডিউল: <span className="text-[#e2e8f0] font-semibold">{targetModuleName}</span>
              </motion.p>
            )}

            {/* Glowing Emerald Progress Bar */}
            <div className="mt-5 h-1 w-52 overflow-hidden rounded-full bg-elevated sm:w-64 border border-primary/20">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-teal-300 shadow-[0_0_12px_rgba(66,216,194,0.65)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.2 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
