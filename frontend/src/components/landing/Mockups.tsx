import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Compass,
  Download,
  FileCheck,
  FileSearch,
  FileText,
  HelpCircle,
  Layers,
  MapPin,
  MessageSquare,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { Language } from "@/lib/translations";

/**
 * Common Card Header Shell for Mockups
 */
interface MockupFrameProps {
  children: React.ReactNode;
  category?: string;
  badge?: string;
  className?: string;
}

export function MockupFrame({
  children,
  category = "AI LAND INTELLIGENCE",
  badge = "ডেমো তথ্য",
  className = "",
}: MockupFrameProps) {
  return (
    <div
      className={`feature-mockup-frame relative overflow-hidden rounded-2xl border border-[#263B34] bg-[#0B1311] p-4 sm:p-5 text-left shadow-inner transition-all duration-300 ${className}`}
    >
      {/* Top Frame Control Bar */}
      <div className="mb-3.5 flex items-center justify-between border-b border-[#263B34]/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#263B34]" />
            <span className="h-2 w-2 rounded-full bg-[#263B34]" />
            <span className="h-2 w-2 rounded-full bg-primary/40" />
          </div>
          <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            {category}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
          {badge}
        </span>
      </div>

      {children}
    </div>
  );
}

/**
 * FEATURE CARD A: DOCUMENT & KHATIAN ANALYSIS PREVIEW
 */
interface DocIntelligenceMockProps {
  lang?: Language;
}

export function DocIntelligenceMock({ lang = "bn" }: DocIntelligenceMockProps) {
  const isBn = lang === "bn";

  const rows = [
    {
      field: isBn ? "মালিকের নাম" : "Owner Name",
      deed: isBn ? "মো. রহিম উদ্দিন" : "Md. Rahim Uddin",
      khatian: isBn ? "মো. রহিম উদ্দিন" : "Md. Rahim Uddin",
      status: isBn ? "মিল পাওয়া গেছে" : "Exact Match",
      matched: true,
      tag: "CS-১৮ / RS-৪১২",
    },
    {
      field: isBn ? "জমির পরিমাণ" : "Land Area",
      deed: isBn ? "৫.২০ শতক" : "5.20 Decimals",
      khatian: isBn ? "৪.৮০ শতক" : "4.80 Decimals",
      status: isBn ? "০.৪০ শতক অমিল" : "0.40 Dec Discrepancy",
      matched: false,
      tag: isBn ? "যাচাই প্রয়োজন" : "Review Required",
    },
    {
      field: isBn ? "নামজারি ও জোত" : "Mutation & Jote",
      deed: isBn ? "জোত নং ৪১২/ক" : "Jote No 412/A",
      khatian: isBn ? "জোত ৪১২/ক (২০১৯)" : "Jote 412/A (2019)",
      status: isBn ? "রেকর্ড প্রাপ্ত" : "Verified Record",
      matched: true,
      tag: isBn ? "হালনাগাদ" : "Updated",
    },
  ];

  return (
    <MockupFrame
      category={isBn ? "দলিল ও খতিয়ান গোয়েন্দা" : "DOCUMENT INTELLIGENCE"}
      badge={isBn ? "ডেমো বিশ্লেষণ" : "Demo Analysis"}
    >
      <div className="relative overflow-hidden rounded-xl bg-[#101A17] p-3 sm:p-4 border border-[#263B34]">
        {/* Animated Document Scan Line Effect */}
        <div
          className="scan-line pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-primary/15 to-transparent"
          aria-hidden="true"
        />

        {/* Document Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#263B34] pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <FileCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">
                {isBn ? "দলিল নং ৩৬৮২/২০২২" : "Deed No 3682/2022"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isBn
                  ? "দাগ ১৪২৭ • মৌজা: বিরুলিয়া • খতিয়ান RS-৪১২"
                  : "Dag 1427 • Mouza: Birulia • RS-412"}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-primary/25 bg-[#182521] px-2.5 py-1 text-[11px] font-medium text-primary">
            {isBn ? "OCR নির্ভুলতা: ৯৪%" : "OCR Accuracy: 94%"}
          </div>
        </div>

        {/* Cross-Comparison Table */}
        <div className="mt-3 space-y-2">
          {/* Header */}
          <div className="doc-table-header px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>{isBn ? "রেকর্ড ক্ষেত্র" : "Record Field"}</span>
            <span>{isBn ? "দলিল (Deed)" : "Deed OCR"}</span>
            <span>{isBn ? "খতিয়ান (Khatian)" : "Survey Record"}</span>
            <span className="text-right">{isBn ? "স্থিতি" : "Status"}</span>
          </div>

          {/* Rows */}
          {rows.map((row) => (
            <div
              key={row.field}
              className={`doc-table-row rounded-lg border p-2.5 transition duration-200 ${
                row.matched
                  ? "border-[#263B34]/80 bg-[#0B1311]/70 hover:border-primary/40"
                  : "border-amber-500/30 bg-amber-950/15 hover:border-amber-500/50"
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-foreground">{row.field}</p>
                <p className="text-[10px] text-muted-foreground">{row.tag}</p>
              </div>

              <div className="text-xs text-foreground/90 font-mono">
                {row.deed}
              </div>

              <div className="text-xs text-foreground/90 font-mono">
                {row.khatian}
              </div>

              <div className="flex items-center justify-end gap-1">
                {row.matched ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-[#5BE0C5] border border-[#5BE0C5]/30">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="hidden sm:inline">{row.status}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/40 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-400/30">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{row.status}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Evidence Status Footer */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#182521] px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {isBn
              ? "সূত্র: সাভার সাব-রেজিস্ট্রি বালাম ৭২, পৃষ্ঠা ১১৪"
              : "Citation: Savar Sub-Registry Vol 72, P 114"}
          </span>

          <span className="text-[10px] text-primary/80 font-mono">
            {isBn ? "পরামর্শমূলক ডেমো বিশ্লেষণ" : "Advisory Demo Review"}
          </span>
        </div>
      </div>
    </MockupFrame>
  );
}

/**
 * FEATURE CARD B: NEARBY ALTERNATIVE LAND PREVIEW
 */
interface NearbyLandMockProps {
  lang?: Language;
}

export function NearbyLandMock({ lang = "bn" }: NearbyLandMockProps) {
  const isBn = lang === "bn";
  const [selectedParcel, setSelectedParcel] = useState(0);

  const parcels = [
    {
      id: 0,
      dag: isBn ? "দাগ ১৪৩১" : "Dag 1431",
      dist: isBn ? "১.২ কিমি" : "1.2 km",
      area: isBn ? "৬.৫০ শতক" : "6.50 Decimals",
      score: "৯২%",
      price: isBn ? "৳ ১৮.৫ লাখ / শতক" : "৳ 18.5 Lac / Dec",
      status: isBn ? "সর্বোত্তম মিল" : "Top Match",
      svgD: "M 140 30 L 220 20 L 205 85 L 130 75 Z",
      center: [175, 52] as const,
    },
    {
      id: 1,
      dag: isBn ? "দাগ ১৫০২" : "Dag 1502",
      dist: isBn ? "২.০ কিমি" : "2.0 km",
      area: isBn ? "৫.০০ শতক" : "5.00 Decimals",
      score: "৭১%",
      price: isBn ? "৳ ১৭.০ লাখ / শতক" : "৳ 17.0 Lac / Dec",
      status: isBn ? "মাঝারি মিল" : "Moderate",
      svgD: "M 220 20 L 300 15 L 290 80 L 205 85 Z",
      center: [250, 48] as const,
    },
    {
      id: 2,
      dag: isBn ? "দাগ ১৩৮৮" : "Dag 1388",
      dist: isBn ? "২.৬ কিমি" : "2.6 km",
      area: isBn ? "৮.২০ শতক" : "8.20 Decimals",
      score: "৫৮%",
      price: isBn ? "৳ ১৫.২ লাখ / শতক" : "৳ 15.2 Lac / Dec",
      status: isBn ? "পর্যালোচনা সাপেক্ষ" : "Review Needed",
      svgD: "M 50 45 L 140 30 L 130 75 L 40 90 Z",
      center: [90, 60] as const,
    },
  ];

  return (
    <MockupFrame
      category={isBn ? "স্থানিক বিকল্প জমি অনুসন্ধান" : "SPATIAL DISCOVERY"}
      badge={isBn ? "ডেমো পার্সেল ম্যাপ" : "Demo Parcel Map"}
    >
      <div className="space-y-3">
        {/* Stylized Mini Cadastral Parcel Map */}
        <div className="relative h-44 overflow-hidden rounded-xl border border-[#263B34] bg-[#101A17]">
          {/* Subtle Mouza Grid Background */}
          <div className="absolute inset-0 bg-grid opacity-50" />

          {/* SVG Cadastral Parcel Plots */}
          <svg
            viewBox="0 0 340 120"
            className="absolute inset-0 h-full w-full select-none"
            aria-hidden="true"
          >
            {/* Mouza Road Stream */}
            <path
              d="M 10 105 C 100 85, 200 115, 330 95"
              fill="none"
              stroke="#263B34"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Adjacent Base Cadastral Plots */}
            <path
              d="M 40 90 L 130 75 L 120 115 L 30 115 Z"
              fill="#0B1311"
              stroke="#263B34"
              strokeWidth="1"
            />
            <path
              d="M 130 75 L 205 85 L 195 115 L 120 115 Z"
              fill="#0B1311"
              stroke="#263B34"
              strokeWidth="1"
            />

            {/* Interactive Parcels */}
            {parcels.map((p) => {
              const isSelected = selectedParcel === p.id;
              return (
                <g
                  key={p.id}
                  onClick={() => setSelectedParcel(p.id)}
                  className="cursor-pointer transition-all duration-300"
                >
                  <path
                    d={p.svgD}
                    className={`transition-all duration-300 ${
                      isSelected
                        ? "fill-primary/25 stroke-primary"
                        : "fill-[#0B1311]/80 stroke-primary/40 hover:stroke-primary/70 hover:fill-primary/10"
                    }`}
                    strokeWidth={isSelected ? "2" : "1.2"}
                  />

                  {/* Marker Pin on Centroid */}
                  <circle
                    cx={p.center[0]}
                    cy={p.center[1]}
                    r={isSelected ? "5" : "3.5"}
                    className={isSelected ? "fill-primary animate-pulse" : "fill-primary/60"}
                  />
                  {isSelected && (
                    <circle
                      cx={p.center[0]}
                      cy={p.center[1]}
                      r="10"
                      className="fill-primary/20 animate-pulse-ring"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Map Top Badge */}
          <div
            className="absolute flex items-center gap-1.5 rounded-md border border-[#263B34] bg-[#0B1311]/90 px-2 py-1 text-[10px] text-foreground backdrop-blur"
            style={{ top: "0.625rem", left: "0.625rem" }}
          >
            <Compass className="h-3 w-3 text-primary" />
            <span>{isBn ? "মৌজা: বিরুলিয়া (জেএল ২৯)" : "Mouza: Birulia (JL 29)"}</span>
          </div>

          {/* Map Legend / Selected Info */}
          <div
            className="absolute rounded-md border border-primary/30 bg-[#182521]/90 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur"
            style={{ bottom: "0.625rem", right: "0.625rem" }}
          >
            {parcels[selectedParcel].dag} • {parcels[selectedParcel].dist}
          </div>
        </div>

        {/* 3 Alternative Land Cards */}
        <div className="nearby-cards-grid">
          {parcels.map((p) => {
            const isSelected = selectedParcel === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setSelectedParcel(p.id)}
                onMouseEnter={() => setSelectedParcel(p.id)}
                className={`relative rounded-xl border p-2.5 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-[#263B34] bg-[#101A17] hover:border-primary/40 hover:bg-[#182521]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{p.dag}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                      p.id === 0
                        ? "bg-emerald-950/60 text-[#5BE0C5]"
                        : p.id === 1
                        ? "bg-[#182521] text-primary"
                        : "bg-amber-950/40 text-amber-400"
                    }`}
                  >
                    {p.score}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-muted-foreground font-mono">
                  {p.dist} • {p.area}
                </p>

                <p className="mt-1.5 text-[11px] font-semibold text-foreground/90">
                  {p.price}
                </p>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          {isBn
            ? "* নমুনা মূল্য ও পার্সেল ডেটা শুধুমাত্র ডেমো তুলনার উদ্দেশ্যে প্রদর্শিত"
            : "* Benchmark pricing and proximity metrics are synthetic demo listings"}
        </p>
      </div>
    </MockupFrame>
  );
}

/**
 * FEATURE CARD C: LANDSURE AI COPILOT PREVIEW
 */
interface CopilotMockProps {
  lang?: Language;
}

export function CopilotMock({ lang = "bn" }: CopilotMockProps) {
  const isBn = lang === "bn";

  return (
    <MockupFrame
      category={isBn ? "এআই সহকারী প্রাকদর্শন" : "INTELLIGENT ADVISORY"}
      badge={isBn ? "লাইভ ডেমো সহকারী" : "Live Demo Copilot"}
    >
      <div className="space-y-3 rounded-xl border border-[#263B34] bg-[#101A17] p-3.5 sm:p-4">
        {/* Copilot Header Status */}
        <div className="flex items-center justify-between border-b border-[#263B34] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">LandSure AI Copilot</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {isBn ? "বাংলা ও ইংরেজি সমর্থিত • অনলাইন" : "Bengali & English • Online"}
              </p>
            </div>
          </div>

          <span className="rounded-md border border-primary/20 bg-[#182521] px-2 py-0.5 text-[10px] text-primary">
            GPT-4o + RAG
          </span>
        </div>

        {/* Realistic Conversation Thread */}
        <div className="space-y-2.5">
          {/* User Query */}
          <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm border border-primary/40 bg-primary/15 px-3.5 py-2.5 text-right shadow-sm">
            <p className="text-xs font-medium text-foreground leading-relaxed">
              {isBn
                ? "এই জমির মালিকানা ইতিহাসে কোনো অসংগতি বা দ্বৈত বিক্রয়ের ঝুঁকি আছে?"
                : "Are there any chain-of-title anomalies or double-selling risks for this parcel?"}
            </p>
            <span className="mt-1 block text-[10px] text-muted-foreground font-mono">
              {isBn ? "ক্রেতার অনুসন্ধান • ১২:৩৪ PM" : "Buyer Query • 12:34 PM"}
            </span>
          </div>

          {/* Copilot Grounded Response */}
          <div className="flex max-w-[94%] items-start gap-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#182521] text-primary mt-1 border border-[#263B34]">
              <Sparkles className="h-3 w-3" />
            </span>

            <div className="rounded-2xl rounded-bl-sm border border-[#263B34] bg-[#0B1311] p-3 text-left shadow-sm">
              <p className="text-xs leading-relaxed text-foreground/95">
                {isBn
                  ? "উপলব্ধ ডেমো তথ্য অনুযায়ী ২০০৮ থেকে ২০১৯ পর্যন্ত মালিকানা ধারাবাহিকতা সঠিক। তবে দাগ ১৪২৭-এ ২০১৯-এর নামজারির পর অপর একটি রেজিস্ট্রিহীন বায়না দলিলের সম্ভাব্য উল্লেখ রয়েছে।"
                  : "Based on available demo records, the chain of title is consistent from 2008 to 2019. However, an unregistered earnest-money deed reference exists after the 2019 mutation for Dag 1427."}
              </p>

              {/* Evidence Chips */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <FileText className="h-2.5 w-2.5" />
                  {isBn ? "প্রমাণ ১: সিএস খতিয়ান ১৮" : "Evidence 1: CS Khatian 18"}
                </span>

                <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <FileText className="h-2.5 w-2.5" />
                  {isBn ? "প্রমাণ ২: নামজারি ২০১৯" : "Evidence 2: Mutation 2019"}
                </span>

                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  <ShieldAlert className="h-2.5 w-2.5" />
                  {isBn ? "সতর্কতা: বালাম তল্লাশি কাম্য" : "Action: Registry Search"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Advisory Input Preview Bar */}
        <div className="flex items-center gap-2 rounded-xl border border-[#263B34] bg-[#0B1311] px-3 py-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="flex-1 truncate">
            {isBn ? "জমির নামজারি বা দাগ নিয়ে প্রশ্ন লিখুন…" : "Ask about mutation or dag records…"}
          </span>
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/15 text-primary">
            <Send className="h-3 w-3" />
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          {isBn
            ? "* এআই মতামত সিদ্ধান্ত-সহায়ক বিশ্লেষণ মাত্র; কোনো আইনগত নিশ্চয়তা নয়।"
            : "* AI output is advisory due diligence and does not substitute legal certification."}
        </p>
      </div>
    </MockupFrame>
  );
}

/**
 * FEATURE CARD D: LAND TRUST PASSPORT PREVIEW
 */
interface PassportMockProps {
  lang?: Language;
}

export function PassportMock({ lang = "bn" }: PassportMockProps) {
  const isBn = lang === "bn";

  const metrics = [
    {
      label: isBn ? "যাচাইকৃত রেকর্ড" : "Verified Records",
      val: isBn ? "৯টি" : "9",
      color: "text-[#5BE0C5]",
    },
    {
      label: isBn ? "সতর্কতা নোট" : "Risk Flags",
      val: isBn ? "২টি" : "2",
      color: "text-amber-400",
    },
    {
      label: isBn ? "সংযুক্ত প্রমাণ" : "Evidence Citations",
      val: isBn ? "১৪টি" : "14",
      color: "text-primary",
    },
  ];

  const checks = [
    {
      title: isBn ? "মালিকানা ধারাবাহিকতা" : "Ownership Chain Continuity",
      desc: isBn ? "সন্তোষজনক (CS → SA → RS খতিয়ান)" : "Consistent (CS → SA → RS)",
      pass: true,
    },
    {
      title: isBn ? "দলিল ও খতিয়ান সামঞ্জস্য" : "Deed vs Survey Alignment",
      desc: isBn ? "৮৪% মিল (০.৪০ শতক অমিল চিহ্নিত)" : "84% Match (0.40 Dec Discrepancy)",
      pass: false,
    },
    {
      title: isBn ? "নামজারি ও খাজনা হালনাগাদ" : "Mutation & Tax Clearance",
      desc: isBn ? "২০২৪-২৫ অর্থবছর পর্যন্ত পরিশোধিত" : "Paid through FY 2024-25",
      pass: true,
    },
  ];

  return (
    <MockupFrame
      category={isBn ? "ডিজিটাল যাচাই পাসপোর্ট" : "DUE DILIGENCE REPORT"}
      badge={isBn ? "সার্টিফাইড ডেমো" : "Certified Demo"}
    >
      <div className="relative overflow-hidden rounded-xl border border-[#263B34] bg-[#101A17] p-3.5 sm:p-4">
        {/* Subtle Background Watermark Graphic */}
        <div
          className="pointer-events-none absolute -right-6 -bottom-6 select-none opacity-5"
          aria-hidden="true"
        >
          <ShieldCheck className="h-44 w-44 text-primary" />
        </div>

        {/* Passport Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#263B34] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-foreground tracking-tight">
                Land Trust Passport™
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {isBn ? "আইডি: LS-2026-BD-0427" : "ID: LS-2026-BD-0427"}
              </p>
            </div>
          </div>

          <div className="rounded-full border border-[#5BE0C5]/30 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-semibold text-[#5BE0C5]">
            {isBn ? "AI-Assisted Due Diligence" : "AI-Assisted Due Diligence"}
          </div>
        </div>

        {/* 3 Summary Pillar Cards */}
        <div className="passport-metrics-grid mt-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-[#263B34] bg-[#0B1311] py-2 px-2 text-center"
            >
              <p className={`font-display text-base font-bold ${m.color}`}>
                {m.val}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                {m.label}
              </p>
            </div>
          ))}
        </div>

        {/* Verification Checklist */}
        <div className="mt-3 space-y-2">
          {checks.map((c) => (
            <div
              key={c.title}
              className="flex items-start justify-between gap-2 rounded-lg border border-[#263B34]/70 bg-[#0B1311]/60 px-3 py-2 text-left"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">{c.title}</p>
                <p className="text-[11px] text-muted-foreground">{c.desc}</p>
              </div>

              {c.pass ? (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-950/60 text-[#5BE0C5] mt-0.5 border border-[#5BE0C5]/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-950/60 text-amber-400 mt-0.5 border border-amber-400/30">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Export Action Bar */}
        <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/20 bg-[#182521] px-3 py-2">
          <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-primary" />
            {isBn ? "ডাউনলোডযোগ্য সার্টিফাইড রিপোর্ট (PDF)" : "Downloadable Verified Report (PDF)"}
          </span>

          <span className="font-mono text-[10px] text-primary font-bold">
            2.4 MB
          </span>
        </div>

        <p className="mt-2 text-[10px] text-muted-foreground text-center">
          {isBn
            ? "Human Verification Recommended • প্রদর্শিত রিপোর্ট শুধুমাত্র ডেমো পর্যালোচনার জন্য"
            : "Human Verification Recommended • Demonstration prototype review report"}
        </p>
      </div>
    </MockupFrame>
  );
}

/**
 * Legacy components for compatibility with any existing imports
 */
export function DocMock() {
  return <DocIntelligenceMock lang="bn" />;
}

export function NearbyMock() {
  return <NearbyLandMock lang="bn" />;
}

export function MapMock() {
  return (
    <div className="relative h-44 overflow-hidden rounded-lg bg-grid bg-card p-3">
      <svg viewBox="0 0 300 160" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d="M0 110 C 80 90, 160 140, 300 100" className="stroke-primary/40" strokeWidth="6" fill="none" />
        {["M30 30 L100 20 L110 70 L40 80 Z", "M100 20 L180 30 L170 80 L110 70 Z", "M180 30 L260 25 L270 85 L170 80 Z", "M40 80 L110 70 L120 120 L50 130 Z"].map((d, i) => (
          <path key={d} d={d} className={i === 1 ? "fill-primary/25 stroke-primary" : "fill-primary/5 stroke-primary/40"} strokeWidth="1.2" />
        ))}
      </svg>
      <MapPin className="absolute left-[46%] top-[22%] h-6 w-6 fill-primary/30 text-primary" />
      <div className="absolute bottom-2 left-2 rounded-md border bg-background/80 px-2 py-1 text-[11px] backdrop-blur">দাগ নং ১৪২৭ • ৫.২ শতক</div>
    </div>
  );
}

export function RiskMock() {
  const rows = [["মালিকানা ধারাবাহিকতা", 82, "primary"], ["দলিল সামঞ্জস্য", 64, "warning"], ["নামজারি প্রমাণ", 41, "destructive"]] as const;
  return (
    <div className="rounded-xl border bg-surface p-4">
      <div className="flex items-center gap-4">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="15" className="stroke-muted" strokeWidth="3" fill="none" />
            <circle cx="18" cy="18" r="15" className="stroke-warning" strokeWidth="3" fill="none" strokeDasharray="94" strokeDashoffset="36" strokeLinecap="round" />
          </svg>
          <div className="text-center"><p className="font-display text-xl font-bold">৬২</p><p className="text-[10px] text-muted-foreground">মাঝারি ঝুঁকি</p></div>
        </div>
        <div className="flex-1 space-y-2">
          {rows.map(([l, v, c]) => (
            <div key={l}>
              <div className="flex justify-between text-[11px]"><span>{l}</span><span className="text-muted-foreground">{v}%</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={`h-full rounded-full ${c === "primary" ? "bg-primary" : c === "warning" ? "bg-warning" : "bg-destructive"}`} style={{ width: `${v}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPoster() {
  return (
    <div className="grid h-full grid-cols-[180px_1fr] gap-3 p-4 max-sm:grid-cols-1 sm:p-6">
      <div className="hidden space-y-2 rounded-xl border bg-surface p-3 sm:block">
        {["ড্যাশবোর্ড", "Parcel Explorer", "ঝুঁকি বিশ্লেষণ", "দলিল", "Copilot", "রিপোর্ট"].map((t, i) => (
          <div key={t} className={`rounded-lg px-3 py-2 text-xs ${i === 1 ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>{t}</div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1"><MapMock /></div>
        <div className="hidden sm:block"><RiskMock /></div>
      </div>
    </div>
  );
}
