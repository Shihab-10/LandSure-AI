import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
} from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Compass,
  ZoomIn,
  ZoomOut,
  Star,
  Eye,
} from "lucide-react";
import { onStartDemoClick, onStartVerificationClick } from "@/lib/integration";
import { translations, type Language } from "@/lib/translations";
import { onSpotlightMove, onSpotlightLeave } from "../common/Spotlight";

function getGraphemes(text: string, lang = "bn"): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new (Intl as any).Segmenter(lang === "bn" ? "bn" : "en", {
        granularity: "grapheme",
      });
      return Array.from(segmenter.segment(text), (s: any) => s.segment);
    } catch {
      // Fallback
    }
  }
  return Array.from(text);
}

interface HeroProps {
  lang?: Language;
  onStartDemoClick?: () => void;
  onStartVerificationClick?: () => void;
}

export function Hero({
  lang = "bn",
  onStartDemoClick: propStartDemo,
  onStartVerificationClick: propStartVerification,
}: HeroProps) {
  const t = translations[lang] || translations.bn;
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  // Content requirements
  const eyebrowText = "LANDSURE AI · SMART LAND INTELLIGENCE";
  const line1 = lang === "bn" ? "জমি কেনার আগে," : "Before buying land,";
  const line2Full = lang === "bn" ? "সত্যটা জানুন।" : "Know the ground truth.";
  const heroDesc =
    lang === "bn"
      ? "জমির মালিকানা, খতিয়ান, দলিল, সম্ভাব্য ঝুঁকি ও আইনগত তথ্য যাচাই করুন একটি স্মার্ট প্ল্যাটফর্মে। সঠিক সিদ্ধান্ত নেওয়ার আগে জেনে নিন প্রয়োজনীয় সবকিছু।"
      : "Verify land ownership, khatian, title chain deeds, legal disputes and risks on one intelligent platform. Know everything before making the final decision.";

  const searchQueryFull =
    lang === "bn"
      ? "ঢাকার মিরপুরে যাচাইযোগ্য জমি খুঁজুন"
      : "Find verified parcels in Mirpur, Dhaka";

  // Typing animation for floating search bar
  const [typedQuery, setTypedQuery] = useState<string>("");
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (reduceMotion) {
      setTypedQuery(searchQueryFull);
      setCursorVisible(false);
      return;
    }

    const graphemes = getGraphemes(searchQueryFull, lang);
    setTypedQuery("");
    setCursorVisible(true);

    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setTypedQuery(graphemes.slice(0, idx).join(""));
      if (idx >= graphemes.length) {
        clearInterval(timer);
        setTimeout(() => setCursorVisible(false), 800);
      }
    }, 65);

    return () => clearInterval(timer);
  }, [searchQueryFull, lang, reduceMotion]);

  const handleStartDemo = () => {
    if (propStartDemo) {
      propStartDemo();
    } else {
      onStartDemoClick();
    }
  };

  const handleStartVerification = () => {
    if (propStartVerification) {
      propStartVerification();
    } else {
      onStartVerificationClick();
    }
  };

  return (
    <section
      id="top"
      ref={heroRef}
      className="hero-section login-card"
    >
      {/* 1. Deep Atmospheric Ambient Backlights */}
      <div
        className="pointer-events-none absolute inset-0 -z-30 select-none overflow-hidden"
        aria-hidden="true"
      >
        {/* Soft emerald radial aura behind visualization (Right Side) */}
        <div
          className="absolute right-[-5%] top-[12%] h-[650px] w-[650px] rounded-full blur-[130px] opacity-40 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(13, 148, 136, 0.45) 0%, rgba(94, 234, 212, 0.12) 50%, transparent 75%)",
          }}
        />

        {/* Faint subtle mint aura behind headline (Left Side) */}
        <div
          className="absolute left-[-8%] top-[25%] h-[500px] w-[500px] rounded-full blur-[140px] opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(13, 148, 136, 0.3) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="hero-container">
        <div className="hero-two-column-layout">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: EDITORIAL CONTENT & CALLS-TO-ACTION (45%)    */}
          {/* ======================================================== */}
          <div className="hero-left-content">
            
            {/* Small Eyebrow Pill */}
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-[#10231F]/90 px-3.5 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.3)] backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5EEAD4] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D9488]" />
              </span>
              <span className="font-mono text-[11px] sm:text-xs font-bold tracking-wider uppercase text-[#5EEAD4]">
                {eyebrowText}
              </span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="mt-5 sm:mt-6 font-bold tracking-tight text-[2.75rem] leading-[1.18] sm:text-5xl lg:text-[3.65rem] xl:text-[4.2rem] sm:leading-[1.14]">
              {/* Line 1: Premium off-white */}
              <motion.span
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="hero-headline-line1 block text-[#F4F7F5]"
              >
                {line1}
              </motion.span>

              {/* Line 2: Vibrant Emerald / Mint */}
              <motion.span
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="hero-headline-line2 block bg-gradient-to-r from-[#5EEAD4] via-[#2DD4BF] to-[#0D9488] bg-clip-text text-transparent font-extrabold pb-1"
              >
                {line2Full}
              </motion.span>
            </h1>

            {/* Supporting Description */}
            <motion.p
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-6 text-base leading-relaxed text-[#A6BDB5] sm:text-lg max-w-xl"
            >
              {heroDesc}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="hero-cta-group mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3.5 sm:gap-4 w-full sm:w-auto"
            >
              {/* Primary CTA */}
              <button
                type="button"
                onClick={handleStartVerification}
                onPointerMove={(e) => onSpotlightMove(e, "1")}
                onPointerLeave={onSpotlightLeave}
                className="hero-cta-btn-primary ls-spotlight-interactive group shrink-0"
                aria-label="জমি যাচাই শুরু করুন"
              >
                <span>{lang === "bn" ? "জমি যাচাই শুরু করুন" : "Start Land Verification"}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              {/* Secondary CTA */}
              <button
                type="button"
                onClick={handleStartDemo}
                onPointerMove={(e) => onSpotlightMove(e, "1")}
                onPointerLeave={onSpotlightLeave}
                className="hero-cta-btn-secondary demo-btn ls-spotlight-interactive group shrink-0"
                aria-label="ডেমো দেখুন"
              >
                <span>{lang === "bn" ? "ডেমো দেখুন" : "View Live Demo"}</span>
                <ArrowUpRight className="h-4 w-4 text-[#5EEAD4] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </motion.div>

            {/* Trust Social Proof Badge (Reference Screenshot: 4.8 / 5 on Trustpilot) */}
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="mt-8 pt-4 border-t border-border/40 flex items-center gap-3"
            >
              <div className="flex items-center gap-1 text-[#4ade80]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#4ade80" className="text-[#4ade80]" />
                ))}
              </div>
              <div className="text-xs font-medium text-[#A6BDB5]">
                <strong className="text-foreground font-bold font-mono">৪.৯ / ৫</strong> · ১০০% প্রমাণভিত্তিক খতিয়ান ও স্যাটেলাইট AI অডিট
              </div>
            </motion.div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: PREMIUM LAND VISUALIZATION (55%)            */}
          {/* ======================================================== */}
          <div className="hero-right-visual">
            
            <div className="hero-vis-stage">
              
              {/* Subtle Dashed Connection Lines (Inspired directly by reference screenshot) */}
              <svg
                className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none"
                viewBox="0 0 600 480"
                fill="none"
                aria-hidden="true"
              >
                {/* Dashed line from top search pill down to parcel boundary */}
                <path
                  d="M 160 75 L 255 160"
                  stroke="rgba(94, 234, 212, 0.55)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {/* Dashed line to laptop edge */}
                <path
                  d="M 450 75 L 530 180"
                  stroke="rgba(94, 234, 212, 0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <circle cx="255" cy="160" r="3.5" fill="#5EEAD4" />
                <circle cx="160" cy="75" r="3.5" fill="#5EEAD4" />
                <circle cx="530" cy="180" r="3" fill="#5EEAD4" />
              </svg>

              {/* ---------------------------------------------------- */}
              {/* LAYER 1: SECONDARY GIS DASHBOARD / LAPTOP PREVIEW    */}
              {/* Positioned behind and offset to bottom-right         */}
              {/* ---------------------------------------------------- */}
              <motion.div
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="hero-laptop-screen"
              >
                {/* Laptop Screen Top Header */}
                <div className="h-7 bg-[#10231F] border-b border-border/60 px-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                    <span className="ml-2 font-mono text-[10px] text-[#A6BDB5] truncate">
                      LandSure GIS Engine v4.2 • Savar, Dhaka
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#5EEAD4] bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5EEAD4] animate-pulse" />
                      লাইভ ডাটা
                    </span>
                  </div>
                </div>

                {/* Dashboard Inner: Aerial GIS Map View */}
                <div className="relative w-full flex-1 bg-[#071310] overflow-hidden">
                  <img
                    src="/images/aerial_land_survey.jpg"
                    alt="GIS Cadastral Layer Preview"
                    className="w-full h-full object-cover opacity-60 filter brightness-90 contrast-110"
                    loading="lazy"
                  />

                  {/* Overlaid GIS Cadastral Boundary polygons */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 250">
                    <polygon
                      points="80,40 180,60 160,140 70,110"
                      fill="rgba(13, 148, 136, 0.25)"
                      stroke="#5EEAD4"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />
                    <polygon
                      points="185,62 310,40 330,130 200,150"
                      fill="rgba(245, 158, 11, 0.2)"
                      stroke="#F59E0B"
                      strokeWidth="1.2"
                    />
                    <polygon
                      points="120,145 230,155 210,230 110,210"
                      fill="rgba(16, 185, 129, 0.25)"
                      stroke="#10B981"
                      strokeWidth="1.2"
                    />
                  </svg>

                  {/* Right GIS Vertical Toolbar (Matching Reference Screenshot) */}
                  <div className="absolute right-2 top-2 bottom-2 w-7 bg-[#0B1513]/90 border border-border/80 rounded-lg flex flex-col items-center justify-between py-2 backdrop-blur-md shadow-md z-10">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <button className="p-1 hover:text-[#5EEAD4] rounded transition" title="লেয়ার কন্ট্রোল">
                        <Layers size={13} className="text-[#5EEAD4]" />
                      </button>
                      <button className="p-1 hover:text-foreground rounded transition" title="জুম ইন">
                        <ZoomIn size={13} />
                      </button>
                      <button className="p-1 hover:text-foreground rounded transition" title="জুম আউট">
                        <ZoomOut size={13} />
                      </button>
                      <button className="p-1 hover:text-foreground rounded transition" title="দিক নির্দেশক">
                        <Compass size={13} />
                      </button>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <button className="p-1 hover:text-[#5EEAD4] rounded transition" title="ফিল্টার">
                        <SlidersHorizontal size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom GIS Status Footer */}
                  <div className="absolute left-2 bottom-2 right-11 bg-[#10231F]/90 border border-border/70 rounded px-2.5 py-1 text-[10px] text-[#A6BDB5] flex items-center justify-between backdrop-blur-sm">
                    <span className="truncate">মৌজা: বিরুলিয়া (জেএল ৪৫) · দাগ: ১৮২৫-১৮৩২</span>
                    <span className="font-mono text-[#5EEAD4] text-[9px] font-bold">BS / RS RECORD</span>
                  </div>
                </div>

                {/* Laptop Chassis Base (MacBook style chin at bottom) */}
                <div className="h-2.5 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-t border-slate-600/50 flex items-center justify-center shrink-0">
                  <div className="w-14 h-0.5 rounded-full bg-slate-500/60" />
                </div>
              </motion.div>

              {/* ---------------------------------------------------- */}
              {/* LAYER 2: MAIN HIGH-RESOLUTION SATELLITE LAND CARD    */}
              {/* Elevated in foreground with vibrant emerald glow     */}
              {/* ---------------------------------------------------- */}
              <motion.div
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="hero-main-land-card group"
              >
                {/* High-Resolution Satellite Aerial Photography */}
                <img
                  src="/images/hero_satellite_land.jpg"
                  alt="High-resolution aerial satellite land view in Bangladesh"
                  className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                  loading="eager"
                />

                {/* Satellite Perspective Shading */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080D0C]/60 via-transparent to-[#080D0C]/20 pointer-events-none" />

                {/* Top-Right Badge: 3D Satellite View & Resolution */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 bg-[#0B1513]/85 border border-primary/40 rounded-lg px-2.5 py-1 text-[10.5px] sm:text-xs font-bold text-[#5EEAD4] flex items-center gap-1.5 shadow-md backdrop-blur-md">
                  <Eye size={12} className="text-[#5EEAD4]" />
                  <span>স্যাটেলাইট ভিউ · 0.5m HD</span>
                </div>

                {/* -------------------------------------------------- */}
                {/* HIGHLIGHTED ANIMATED PARCEL POLYGON OVERLAY        */}
                {/* -------------------------------------------------- */}
                <svg
                  className="absolute inset-0 h-full w-full pointer-events-none z-10"
                  viewBox="0 0 600 450"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    {/* Glowing Filter for Parcel Border */}
                    <filter id="parcel-glow" x="-25%" y="-25%" width="150%" height="150%">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#5EEAD4" floodOpacity="0.85" />
                    </filter>
                    <linearGradient id="parcel-fill-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#0D9488" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>

                  {/* Highlighted Cadastral Parcel Polygon (Survey Boundary) */}
                  <polygon
                    points="205,135 375,108 420,248 245,282"
                    fill="url(#parcel-fill-grad)"
                    stroke="#5EEAD4"
                    strokeWidth="3"
                    filter="url(#parcel-glow)"
                    className="animate-parcel-breathe"
                  />

                  {/* Internal Cadastral Subdivision Line */}
                  <line
                    x1="285"
                    y1="122"
                    x2="330"
                    y2="265"
                    stroke="#5EEAD4"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    strokeOpacity="0.6"
                  />

                  {/* Centroid Survey Marker / Pin with Pulse Ring */}
                  <g transform="translate(312, 195)">
                    {/* Pulsing Beacon Ring */}
                    <circle
                      cx="0"
                      cy="0"
                      r="12"
                      fill="none"
                      stroke="#5EEAD4"
                      strokeWidth="1.5"
                      className="animate-beacon-ring"
                    />
                    {/* Solid Center Pin */}
                    <circle cx="0" cy="0" r="4.5" fill="#5EEAD4" />
                    <circle cx="0" cy="0" r="2" fill="#080D0C" />
                  </g>
                </svg>

                {/* Overlaid Survey Pin Callout Label (Inside Card) */}
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{ top: "48%", left: "38%" }}
                >
                  <div className="bg-[#0B1513]/90 border border-[#5EEAD4]/50 text-[#5EEAD4] px-2.5 py-1 rounded-md shadow-lg text-[10.5px] sm:text-xs font-bold tracking-tight backdrop-blur-sm whitespace-nowrap flex items-center gap-1.5">
                    <MapPin size={11} className="text-[#0D9488]" />
                    দাগ ১৮২৭ · ২৪.৫ শতাংশ
                  </div>
                </div>

              </motion.div>

              {/* ---------------------------------------------------- */}
              {/* LAYER 3: FLOATING INTELLIGENT SEARCH QUERY BAR        */}
              {/* Pinned above top-left of main land card              */}
              {/* ---------------------------------------------------- */}
              <motion.div
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                onPointerMove={(e) => onSpotlightMove(e, "1")}
                onPointerLeave={onSpotlightLeave}
                className="hero-search-floating ls-spotlight-interactive animate-gentle-float"
              >
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 text-[#5EEAD4] shrink-0">
                    <Search size={14} className="text-[#5EEAD4] animate-pulse" />
                  </div>
                  <div className="flex-1 truncate">
                    <span className="text-[#F4F7F5] font-medium">{typedQuery}</span>
                    {cursorVisible && (
                      <span className="inline-block w-1.5 h-3.5 bg-[#5EEAD4] ml-1 rounded-sm animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Intelligent Filter Chips (Reference Screenshot: "with less than 5% developed land") */}
                <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs">
                  <span className="rounded bg-primary/20 text-[#5EEAD4] border border-primary/30 px-2 py-0.5 font-bold">
                    ১৫+ কাঠা
                  </span>
                  <span className="rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 font-bold">
                    অনুমোদিত আবাসিক প্লট
                  </span>
                </div>
              </motion.div>

              {/* ---------------------------------------------------- */}
              {/* LAYER 4: FLOATING RESULT CARD (Matching Reference)    */}
              {/* Pinned near lower-right of main card                 */}
              {/* ---------------------------------------------------- */}
              <motion.div
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                onPointerMove={(e) => onSpotlightMove(e, "1")}
                onPointerLeave={onSpotlightLeave}
                className="hero-result-card ls-spotlight-interactive animate-gentle-float"
                style={{
                  animationDelay: "-2.5s",
                }}
              >
                {/* Header Icon + Label */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide uppercase text-slate-500">
                    স্মার্ট অনুসন্ধান
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Sparkles size={11} />
                  </span>
                </div>

                {/* Big Bold Opportunities Count (Reference: "210 Opportunities found") */}
                <div className="mt-1">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#061512] font-mono leading-none">
                    ২১০+
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-700 leading-tight mt-1">
                    যাচাইযোগ্য জমির সুযোগ
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    ৭টি জেলার নমুনা রেকর্ড
                  </div>
                </div>

                {/* Action CTA Button in Result Card */}
                <button
                  type="button"
                  onClick={handleStartDemo}
                  className="mt-3 w-full rounded-lg bg-[#0D9488] hover:bg-[#0f766e] text-white py-1.5 sm:py-2 px-2.5 text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  title="জমি দেখুন"
                >
                  <span>জমি দেখুন</span>
                  <ArrowRight size={12} />
                </button>
              </motion.div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
