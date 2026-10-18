import { Maximize2, Play } from "lucide-react";
import { useRef } from "react";
import { onStartDemoClick } from "@/lib/integration";
import { translations, type Language } from "@/lib/translations";
import { SectionHead } from "./Reveal";

interface DemoVideoProps {
  lang?: Language;
  onStartDemoClick?: () => void;
}

export function DemoVideo({
  lang = "bn",
  onStartDemoClick: propStartDemo,
}: DemoVideoProps) {
  const t = translations[lang] || translations.bn;

  const wrap = useRef<HTMLDivElement>(null);

  // Navigate to the existing real demo dashboard experience
  const handlePlayClick = () => {
    if (propStartDemo) {
      propStartDemo();
    } else {
      onStartDemoClick();
    }
  };

  // Open the image section in fullscreen
  const openFullscreen = async () => {
    try {
      await wrap.current?.requestFullscreen?.();
    } catch {
      // Fullscreen unsupported or blocked by browser
    }
  };

  return (
    <section id="demo" className="relative px-5 py-20">
      <SectionHead
        title={t.demoTitle}
        sub={t.demoSub}
      />

      <div className="mx-auto mt-12 max-w-6xl">
        {/* Ambient emerald backlight glow */}
        <div className="pointer-events-none absolute left-1/2 h-72 w-2/3 -translate-x-1/2 rounded-full bg-emerald/25 blur-[120px]" />

        {/* Original cinematic demo preview container */}
        <div
          ref={wrap}
          style={{ aspectRatio: "16 / 9" }}
          className="group relative aspect-video overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/25 bg-[#080B0B] shadow-glow"
        >
          {/* High-quality land aerial image with smooth hover zoom */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src="/images/aerial_land_survey.jpg"
              alt={
                lang === "bn"
                  ? "LandSure AI — জমির আকাশ থেকে তোলা দৃশ্য"
                  : "LandSure AI — Aerial land survey preview"
              }
              loading="lazy"
              className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </div>

          {/* Dark cinematic vignette and radial mask */}
          <div className="pointer-events-none absolute inset-0 bg-[#080B0B]/35" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080B0B]/95 via-transparent to-[#080B0B]/50" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(8,11,11,0.75)_85%)]" />

          {/* Four decorative L-shaped corner scanning brackets */}
          <div aria-hidden="true" className="demo-corner-bracket demo-corner-tl" />
          <div aria-hidden="true" className="demo-corner-bracket demo-corner-tr" />
          <div aria-hidden="true" className="demo-corner-bracket demo-corner-bl" />
          <div aria-hidden="true" className="demo-corner-bracket demo-corner-br" />

          {/* Top scanning badge */}
          <div className="pointer-events-none absolute left-1/2 top-3 sm:top-6 -translate-x-1/2 z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-[#080B0B]/85 px-3 py-0.5 sm:px-4 sm:py-1 text-[9px] sm:text-xs font-bold tracking-widest text-primary backdrop-blur-md uppercase shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
              <span>AI LAND DUE DILIGENCE</span>
            </div>
          </div>

          {/* Exact center animated circular play button */}
          <div className="absolute inset-0 grid place-items-center z-20">
            <button
              type="button"
              onClick={handlePlayClick}
              aria-label={
                lang === "bn"
                  ? "এক নজরে দেখুন LandSure AI — ডেমো যাচাই শুরু করুন"
                  : "Experience LandSure AI at a Glance — Start Demo"
              }
              className="demo-play-btn group/btn"
            >
              <span className="pointer-events-none absolute -inset-2.5 sm:-inset-3 rounded-full border border-primary/40 animate-pulse-ring" />
              <Play className="ml-0.5 h-6 w-6 sm:h-9 sm:w-9 fill-primary text-primary transition-all duration-300 drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]" />
            </button>
          </div>

          {/* Bottom text overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#080B0B]/95 via-[#080B0B]/70 to-transparent pb-2.5 sm:pb-6 pt-6 sm:pt-12 text-center px-3 sm:px-6">
            <h3 className="text-xs sm:text-xl font-bold tracking-tight text-[#F7FAF9] drop-shadow-md">
              {lang === "bn" ? "এক নজরে দেখুন LandSure AI" : "Experience LandSure AI at a Glance"}
            </h3>
            <p className="mx-auto mt-0.5 hidden max-w-lg text-[11px] sm:block sm:text-sm text-[#A9B9B3] drop-shadow">
              {lang === "bn"
                ? "জমি অনুসন্ধান থেকে AI বিশ্লেষণ ও যাচাই রিপোর্ট—পুরো অভিজ্ঞতা দেখুন।"
                : "From parcel discovery to AI risk assessment and trust reports—see the full workflow."}
            </p>
          </div>

          {/* Fullscreen button */}
          <button
            type="button"
            onClick={openFullscreen}
            aria-label={lang === "bn" ? "পূর্ণ পর্দায় দেখুন" : "View fullscreen"}
            className="absolute bottom-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-lg border border-border bg-[#080B0B]/70 text-foreground backdrop-blur hover:bg-elevated transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
