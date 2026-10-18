import { animate, motion, useInView } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Check,
  Compass,
  Database,
  FileSearch,
  Languages,
  Layers,
  Scale,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { onStartDemoClick } from "@/lib/integration";
import { translations, type Language } from "@/lib/translations";
import {
  CopilotMock,
  DocIntelligenceMock,
  DocMock,
  MapMock,
  NearbyLandMock,
  NearbyMock,
  PassportMock,
  RiskMock,
} from "./Mockups";
import { Reveal, SectionHead } from "./Reveal";

const bn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯".charAt(+d));

interface SectionProps {
  lang?: Language;
}

function Counter({ to, suffix = "", lang = "bn" }: { to: number; suffix?: string; lang?: Language }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.6, ease: "easeOut", onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to]);

  const display = lang === "bn" ? bn(v) : v.toString();
  return <span ref={ref}>{display}{suffix}</span>;
}

export function Metrics({ lang = "bn" }: SectionProps) {
  const t = translations[lang];
  const m = [
    [t.metric1Val, t.metric1Suffix, t.metric1Label],
    [t.metric2Val, t.metric2Suffix, t.metric2Label],
    [t.metric3Val, t.metric3Suffix, t.metric3Label],
  ] as const;

  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid divide-y rounded-3xl border border-border/80 bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0 shadow-card">
          {m.map(([n, s, l], i) => (
            <Reveal key={l} delay={i * 0.1} className="px-6 py-10 text-center">
              <p className="font-display text-5xl font-extrabold text-gradient sm:text-6xl">
                <Counter to={n} suffix={s} lang={lang} />
              </p>
              <p className="mt-3 text-muted-foreground font-medium">{l}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">{t.metricFootnote}</p>
      </div>
    </section>
  );
}

export function Problem({ lang = "bn" }: SectionProps) {
  const t = translations[lang];

  return (
    <section className="px-5 py-24">
      <SectionHead
        eyebrow={t.problemEyebrow}
        title={t.problemTitle}
        sub={t.problemSub}
      />
      <div className="relative mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-2">
        <Reveal className="rounded-3xl border border-border/80 bg-card p-8">
          <p className="text-sm font-semibold text-muted-foreground">{t.problemBeforeLabel}</p>
          <h3 className="mt-1 text-2xl font-bold">{t.problemBeforeHeading}</h3>
          <ul className="mt-6 space-y-4">
            {t.problemBeforeItems.map((b) => (
              <li key={b} className="flex items-center gap-3 text-muted-foreground">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-destructive/15">
                  <X className="h-4 w-4 text-destructive" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="absolute left-1/2 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-background shadow-card md:grid">
          <ArrowRight className="h-5 w-5 text-primary" />
        </div>

        <Reveal delay={0.15} className="rounded-3xl border border-primary/40 bg-elevated p-8 shadow-glow">
          <p className="text-sm font-semibold text-primary">{t.problemAfterLabel}</p>
          <h3 className="mt-1 font-display text-2xl font-bold">
            LandSure <span className="text-primary">AI</span>
          </h3>
          <ul className="mt-6 space-y-4">
            {t.problemAfterItems.map((b) => (
              <li key={b} className="flex items-center gap-3 text-foreground font-medium">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15">
                  <Check className="h-4 w-4 text-primary" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

export function Steps({ lang = "bn" }: SectionProps) {
  const t = translations[lang];
  const s = [
    [t.step1Title, t.step1Desc],
    [t.step2Title, t.step2Desc],
    [t.step3Title, t.step3Desc],
  ];

  return (
    <section id="how" className="px-5 py-24">
      <SectionHead
        eyebrow={t.howEyebrow}
        title={t.howTitle}
        sub={t.howSub}
      />
      <div className="relative mx-auto mt-16 grid max-w-6xl gap-12 md:grid-cols-3 md:gap-8">
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          className="absolute left-[16%] right-[16%] top-10 hidden origin-left border-t-2 border-dashed border-primary/40 md:block"
        />
        {s.map(([title, desc], i) => (
          <Reveal key={title} delay={0.2 + i * 0.2} className="relative text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl border border-border bg-elevated font-display text-2xl font-bold text-primary transition hover:border-primary/40 hover:shadow-glow">
              0{i + 1}
            </div>
            <h3 className="mt-6 text-2xl font-bold">{title}</h3>
            <p className="mx-auto mt-3 max-w-xs leading-relaxed text-muted-foreground">{desc}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
export function Showcase({ lang = "bn" }: SectionProps) {
  const t = translations[lang];

  const cards = [
    {
      category: t.featCategoryDoc || "DOCUMENT INTELLIGENCE",
      icon: FileSearch,
      title: t.featTitleDoc || "দলিল ও খতিয়ান বিশ্লেষণ",
      desc: t.featDescDoc || "দলিলের পাঠযোগ্য তথ্য সংগ্রহ করে সরকারি খতিয়ান রেকর্ডের সঙ্গে স্বয়ংক্রিয় তুলনা এবং সম্ভাব্য অমিল শনাক্তকরণ।",
      Mock: DocIntelligenceMock,
    },
    {
      category: t.featCategoryNearby || "SPATIAL DISCOVERY",
      icon: Compass,
      title: t.featTitleNearby || "কাছাকাছি বিকল্প জমি",
      desc: t.featDescNearby || "একই মৌজা ও দূরত্বের মধ্যে তুলনামূলক বিকল্প জমি, আনুমানিক আয়তন ও তথ্য স্কোরের তাৎক্ষণিক বিশ্লেষণ।",
      Mock: NearbyLandMock,
    },
    {
      category: t.featCategoryCopilot || "INTELLIGENT ADVISORY",
      icon: Bot,
      title: t.featTitleCopilot || "LandSure AI Copilot",
      desc: t.featDescCopilot || "জমির মালিকানা ও দলিল সংক্রান্ত যেকোনো প্রশ্ন বাংলায় জিজ্ঞাসা করুন এবং প্রমাণভিত্তিক নিরপেক্ষ ব্যাখ্যা পান।",
      Mock: CopilotMock,
    },
    {
      category: t.featCategoryPassport || "DUE DILIGENCE REPORT",
      icon: ShieldCheck,
      title: t.featTitlePassport || "Land Trust Passport",
      desc: t.featDescPassport || "যাচাইকৃত তথ্য, অমিল সতর্কতা এবং সংযুক্ত প্রমাণের সারসংক্ষেপ নিয়ে তৈরি নির্ভরযোগ্য ডিজিটাল রিপোর্ট।",
      Mock: PassportMock,
    },
  ];

  return (
    <section id="features" className="px-5 py-24">
      <SectionHead
        eyebrow={t.featuresEyebrow}
        title={t.featuresTitle}
        sub={t.featuresSub}
      />
      <div className="mx-auto mt-14 grid max-w-[1240px] gap-6 sm:gap-8 md:grid-cols-2">
        {cards.map(({ category, icon: Icon, title, desc, Mock }, i) => (
          <Reveal key={title} delay={(i % 2) * 0.1}>
            <article className="feature-card group flex h-full flex-col rounded-3xl border border-[#263B34] bg-[#101A17] p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/25">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary/90">
                  {category}
                </span>
              </div>

              <h3 className="mt-4 text-2xl sm:text-[1.7rem] font-bold text-[#F0F4F1] leading-snug tracking-tight">
                {title}
              </h3>

              <p className="mt-2.5 text-base leading-relaxed text-[#A9BDB4]">
                {desc}
              </p>

              <div className="mt-6 flex-1 transition duration-300">
                <Mock lang={lang} />
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}


type Status = "demo" | "review" | "pending";
const CATS: { name: string; items: [string, string, Status][] }[] = [
  {
    name: "জমির পরিচয় ও ইতিহাস",
    items: [
      ["Digital Parcel Identity", "প্রতিটি জমির জন্য একটি ডিজিটাল পরিচয়, দাগ ও মৌজাভিত্তিক তথ্য একত্রে।", "demo"],
      ["Cross-Survey Khatian", "CS, SA, RS ও BS খতিয়ানের তথ্য পাশাপাশি তুলনা।", "pending"],
      ["Ownership Timeline", "সময়ানুক্রমে মালিকানা পরিবর্তনের ভিজ্যুয়াল টাইমলাইন।", "demo"],
      ["GIS Parcel Map", "ম্যাপে জমির আনুমানিক সীমানা ও অবস্থান।", "demo"],
      ["Change Intelligence", "জমির রেকর্ডে পরিবর্তন হলে তা চিহ্নিত করা।", "demo"],
    ],
  },
  {
    name: "মালিকানা ও ঝুঁকি যাচাই",
    items: [
      ["AI Risk Assessment", "উপলব্ধ প্রমাণের ভিত্তিতে ব্যাখ্যাযোগ্য ঝুঁকি স্কোর।", "review"],
      ["Double-Selling Risk Detection", "একই জমির একাধিক বিক্রয়ের সম্ভাব্য ইঙ্গিত শনাক্ত।", "review"],
      ["Mutation Evidence Review", "নামজারি সংক্রান্ত প্রমাণ আছে কিনা পর্যালোচনা।", "review"],
      ["Inheritance Review", "উত্তরাধিকার সূত্রে প্রাপ্ত জমির অংশ ও দাবিদার বিশ্লেষণ।", "review"],
      ["Legal Case Checklist", "মামলা-মোকদ্দমা যাচাইয়ের প্রয়োজনীয় চেকলিস্ট।", "review"],
      ["Road Access & Possession Review", "রাস্তা সংযোগ ও দখল-সংক্রান্ত বিষয় পর্যালোচনা।", "review"],
      ["Land Tax Evidence Checklist", "ভূমি উন্নয়ন কর পরিশোধের প্রমাণ যাচাই চেকলিস্ট।", "demo"],
    ],
  },
  {
    name: "AI ও দলিল বিশ্লেষণ",
    items: [
      ["Bengali Document OCR", "বাংলা দলিল থেকে পাঠযোগ্য তথ্য স্বয়ংক্রিয়ভাবে সংগ্রহ।", "demo"],
      ["Document Integrity", "দলিলের তথ্যের সঙ্গে রেকর্ডের সামঞ্জস্য পরীক্ষা।", "review"],
      ["AI Copilot", "বাংলায় প্রশ্ন করে প্রমাণভিত্তিক ব্যাখ্যা পাওয়া।", "demo"],
      ["Query Classification", "আপনার প্রশ্ন বুঝে সঠিক বিশ্লেষণে পাঠানো।", "demo"],
      ["Verification Gap Navigator", "কোন প্রমাণ অনুপস্থিত এবং কোথায় যাচাই করবেন তা জানানো।", "demo"],
    ],
  },
  {
    name: "ক্রেতার স্মার্ট টুলস",
    items: [
      ["Buyer Verification Wizard", "ধাপে ধাপে জমি যাচাইয়ের গাইড।", "demo"],
      ["Parcel Explorer", "লোকেশন ধরে ডেমো জমি অনুসন্ধান ও ব্রাউজিং।", "demo"],
      ["Buyer Dashboard", "আপনার দেখা জমি, রিপোর্ট ও সতর্কতা এক জায়গায়।", "demo"],
      ["Parcel Watchlist", "পছন্দের জমি অনুসরণ ও পরিবর্তনের নোটিফিকেশন।", "demo"],
      ["Land Trust Passport", "প্রমাণ-রেফারেন্সসহ যাচাই রিপোর্ট।", "demo"],
      ["Registration Cost Calculator", "রেজিস্ট্রেশন খরচের আনুমানিক হিসাব।", "demo"],
      ["Legal Expert Connect", "প্রয়োজনে আইন বিশেষজ্ঞের সঙ্গে যোগাযোগের পথ।", "pending"],
    ],
  },
  {
    name: "নিরাপত্তা ও প্রশাসন",
    items: [
      ["Secure Access & Audit", "নিরাপদ অ্যাক্সেস এবং প্রতিটি কার্যক্রমের অডিট লগ।", "demo"],
      ["Admin Scenario Simulator", "বিভিন্ন ঝুঁকির দৃশ্যপট তৈরি করে সিস্টেম পরীক্ষা।", "demo"],
    ],
  },
];

const BADGE: Record<Status, [string, string]> = {
  demo: ["প্রোটোটাইপ ডেমো", "bg-primary/15 text-primary"],
  review: ["মানব যাচাই প্রয়োজন", "bg-warning/15 text-warning"],
  pending: ["সরকারি সংযোগ অপেক্ষমাণ", "bg-muted text-muted-foreground"],
};

export function AllFeatures({ lang = "bn" }: SectionProps) {
  const [tab, setTab] = useState(0);
  const t = translations[lang];

  return (
    <section id="all-features" className="px-5 py-24">
      <SectionHead
        eyebrow={t.allFeaturesEyebrow}
        title={t.allFeaturesTitle}
        sub={t.allFeaturesSub}
      />
      <div className="mx-auto mt-12 max-w-6xl">
        <div role="tablist" className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center">
          {CATS.map((c, i) => (
            <button
              key={c.name}
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className={`relative shrink-0 rounded-full border px-5 py-2.5 text-sm transition ${
                tab === i ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === i && <motion.span layoutId="tab-bg" className="absolute inset-0 rounded-full bg-primary" />}
              <span className="relative">{c.name}</span>
            </button>
          ))}
        </div>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="tabpanel"
        >
          {(CATS[tab]?.items ?? []).map(([n, d, s]) => (
            <div key={n} className="rounded-2xl border border-border/80 bg-card p-5 transition hover:border-primary/40">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display font-bold text-foreground">{n}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              <span className={`mt-4 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${BADGE[s][1]}`}>
                {BADGE[s][0]}
              </span>
            </div>
          ))}
        </motion.div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          কিছু ফিচার প্রোটোটাইপ প্রদর্শনী, কিছু ক্ষেত্রে মানব যাচাই প্রয়োজন এবং সরকারি সিস্টেমের সঙ্গে সংযোগ এখনও অপেক্ষমাণ।
        </p>
      </div>
    </section>
  );
}

export function TrustSection({ lang = "bn" }: SectionProps) {
  const t = translations[lang];
  const icons = [ShieldCheck, UserCheck, Database, AlertCircle];

  return (
    <section id="trust" className="px-5 py-24 bg-surface/50 border-y border-border/40">
      <SectionHead
        eyebrow={t.trustEyebrow}
        title={t.trustTitle}
        sub={t.trustSub}
      />
      <div className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {t.trustCards.map((card, i) => {
          const Icon = icons[i % icons.length];
          return (
            <Reveal key={card.title} delay={i * 0.1}>
              <div className="group relative h-full rounded-3xl border border-border/80 bg-card p-7 transition duration-300 hover:border-primary/40 hover:shadow-glow">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-elevated transition duration-300 group-hover:scale-105">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-6 text-xl font-bold leading-snug">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function Why({ lang = "bn" }: SectionProps) {
  const t = translations[lang];
  const v = [
    [FileSearch, "প্রমাণভিত্তিক বিশ্লেষণ", "প্রতিটি সতর্কতার সঙ্গে থাকে উৎস ও প্রমাণের রেফারেন্স।"],
    [Languages, "বাংলায় সহজ অভিজ্ঞতা", "জটিল ভূমি পরিভাষা সহজ বাংলায় ব্যাখ্যা করা হয়।"],
    [ShieldAlert, "সম্ভাব্য ঝুঁকির ধারণা", "সিদ্ধান্তের আগে কোন বিষয়গুলো আরও যাচাই প্রয়োজন তা জানুন।"],
    [Layers, "এক জায়গায় প্রয়োজনীয় তথ্য", "ম্যাপ, দলিল, খতিয়ান ও ইতিহাস—সব একটি প্ল্যাটফর্মে।"],
  ] as const;

  return (
    <section id="why" className="px-5 py-24">
      <SectionHead
        eyebrow={t.whyEyebrow}
        title={t.whyTitle}
      />
      <div className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {v.map(([Icon, title, desc], i) => (
          <Reveal key={title} delay={i * 0.08}>
            <div className="group relative h-full overflow-hidden rounded-3xl border border-border/80 bg-card p-7 transition hover:border-primary/40 hover:shadow-glow">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/0 blur-2xl transition duration-500 group-hover:bg-primary/20" />
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-elevated">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-6 text-xl font-bold">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function FreeDemo({ lang = "bn" }: SectionProps) {
  const t = translations[lang];
  const inc = [
    "Synthetic land records",
    "Interactive map",
    "Ownership history",
    "AI-assisted risk review",
    "Document comparison demonstration",
    "Nearby land alternatives",
    "Bengali AI Copilot",
    "Evidence-linked report",
  ];

  return (
    <section className="px-5 py-24">
      <SectionHead
        eyebrow={t.freeDemoEyebrow}
        title={t.freeDemoTitle}
        sub={t.freeDemoSub}
      />
      <Reveal className="relative mx-auto mt-14 max-w-3xl">
        <div className="pointer-events-none absolute inset-x-10 -top-6 h-40 rounded-full bg-emerald/40 blur-[90px]" />
        <div className="relative rounded-3xl border border-primary/40 bg-elevated p-8 shadow-glow sm:p-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                {t.freeDemoBadge}
              </span>
              <h3 className="mt-4 font-display text-3xl font-extrabold">{t.freeDemoTitle}</h3>
            </div>
            <ScanSearch className="h-10 w-10 text-primary" />
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {inc.map((x) => (
              <li key={x} className="flex items-center gap-3 font-display text-[15px]">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {x}
              </li>
            ))}
          </ul>
          <button
            onClick={onStartDemoClick}
            className="mt-10 w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition hover:shadow-glow"
          >
            {t.freeDemoCta}
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">{t.freeDemoDisclaimer}</p>
        </div>
      </Reveal>
    </section>
  );
}
