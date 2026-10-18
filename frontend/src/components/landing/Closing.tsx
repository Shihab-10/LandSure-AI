
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { onLoginClick, onStartDemoClick, onStartVerificationClick } from "@/lib/integration";
import { translations, type Language } from "@/lib/translations";
import { LogoMark, Wordmark } from "./Logo";
import { Reveal, SectionHead } from "./Reveal";

const FAQS: [string, string][] = [
  [
    "LandSure AI কী?",
    "LandSure AI একটি AI-চালিত জমি যাচাই ও সিদ্ধান্ত-সহায়ক প্ল্যাটফর্ম। এটি জমির মালিকানা ইতিহাস, দলিল, খতিয়ান ও সম্ভাব্য ঝুঁকি এক জায়গায় বুঝতে সাহায্য করে। বর্তমানে এটি সিন্থেটিক ডেটাভিত্তিক একটি প্রোটোটাইপ।",
  ],
  [
    "এটি কি সরকারি ভূমি রেকর্ড সরাসরি যাচাই করে?",
    "না। বর্তমান ডেমোতে কোনো সরকারি সিস্টেমের সঙ্গে সরাসরি সংযোগ নেই। প্রদর্শিত সব তথ্য সিন্থেটিক। ভবিষ্যতে অনুমোদিত সংযোগের পরিকল্পনা রয়েছে।",
  ],
  [
    "জমির মালিকানা ইতিহাস কীভাবে দেখা যায়?",
    "Parcel Explorer থেকে একটি জমি নির্বাচন করলে Ownership Timeline-এ সময়ানুক্রমে মালিকানা পরিবর্তন, সংশ্লিষ্ট দলিল ও নামজারির তথ্য দেখা যায়।",
  ],
  [
    "AI Risk Score কি জমি নিরাপদ হওয়ার নিশ্চয়তা দেয়?",
    "না। Risk Score শুধুমাত্র উপলব্ধ তথ্যের ভিত্তিতে সম্ভাব্য সতর্কতা নির্দেশ করে। এটি কোনো আইনগত নিশ্চয়তা নয়—চূড়ান্ত সিদ্ধান্তের আগে অবশ্যই সরকারি রেকর্ড ও বিশেষজ্ঞ দিয়ে যাচাই করুন।",
  ],
  [
    "কাছাকাছি বিকল্প জমি কি দেখা যায়?",
    "হ্যাঁ। দূরত্ব, উপলব্ধ তথ্যের মান এবং নমুনা মূল্য অনুযায়ী আশেপাশের বিকল্প ডেমো জমি তুলনা করা যায়।",
  ],
  [
    "বাংলা দলিল আপলোড করা যাবে?",
    "ডেমোতে বাংলা দলিল থেকে OCR-এর মাধ্যমে তথ্য সংগ্রহের প্রদর্শনী রয়েছে। হাতে লেখা বা অস্পষ্ট দলিলে নির্ভুলতা কম হতে পারে, তাই ফলাফল যাচাই করে নিন।",
  ],
  [
    "রিপোর্ট কি PDF আকারে পাওয়া যাবে?",
    "Land Trust Passport রিপোর্ট প্রমাণের রেফারেন্সসহ তৈরি করা যায় এবং ডাউনলোডযোগ্য আকারে সংরক্ষণের সুবিধা মূল অ্যাপে রয়েছে।",
  ],
  [
    "এটি কি মোবাইলে ব্যবহার করা যায়?",
    "হ্যাঁ। LandSure AI মোবাইল, ট্যাবলেট ও ডেস্কটপ—সব ধরনের স্ক্রিনে ব্যবহারের উপযোগী করে তৈরি।",
  ],
  [
    "ডেমো ব্যবহার করতে কি টাকা লাগে?",
    "না। বর্তমান ডেমো সম্পূর্ণ ফ্রি। কোনো সাবস্ক্রিপশন বা পেমেন্টের প্রয়োজন নেই।",
  ],
  [
    "LandSure AI কি আইনজীবীর বিকল্প?",
    "না। এটি তথ্য বুঝতে ও প্রশ্ন তৈরিতে সহায়তা করে, কিন্তু আইনগত পরামর্শের বিকল্প নয়। জমি কেনার আগে একজন অভিজ্ঞ আইনজীবীর পরামর্শ নেওয়া উচিত।",
  ],
];

interface ClosingProps {
  lang?: Language;
}

export function FAQ({ lang = "bn" }: ClosingProps) {
  const [open, setOpen] = useState<number | null>(0);
  const t = translations[lang];
  const faqList: [string, string][] = (t as any).faqs
    ? (t as any).faqs.map((f: { q: string; a: string }) => [f.q, f.a])
    : FAQS;

  return (
    <section id="faq" className="px-5 py-24 sm:py-28">
      <SectionHead
        title={t.faqTitle}
        sub={t.faqSub}
      />

      <div className="mx-auto mt-14 max-w-[1100px] space-y-3.5">
        {faqList.map(([question, answer], index) => {
          const isOpen = open === index;

          return (
            <div
              key={question}
              className={`faq-card overflow-hidden transition-all duration-300 ${
                isOpen ? "open" : ""
              }`}
            >
              <h3>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-${index}`}
                  id={`faq-trigger-${index}`}
                  className="faq-question flex w-full items-center justify-between gap-4 px-6 py-5 sm:px-8 sm:py-5.5 text-left text-[18px] sm:text-[19px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <span className="leading-snug">{question}</span>

                  <ChevronDown
                    className={`faq-icon h-5 w-5 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : "opacity-75"
                    }`}
                  />
                </button>
              </h3>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-${index}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="overflow-hidden"
                  >
                    <p className="faq-answer border-t border-primary/10 px-6 pb-6 pt-3.5 sm:px-8 sm:pb-7 text-[15.5px] sm:text-[16.5px] leading-relaxed">
                      {answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface FinalCTAProps extends ClosingProps {
  onStartDemoClick?: () => void;
  onStartVerificationClick?: () => void;
}

export function FinalCTA({
  lang = "bn",
  onStartDemoClick: propStartDemo,
  onStartVerificationClick: propStartVerification,
}: FinalCTAProps) {
  const t = translations[lang];

  const handleAction = () => {
    if (propStartVerification) {
      propStartVerification();
    } else if (propStartDemo) {
      propStartDemo();
    } else {
      onStartVerificationClick();
    }
  };

  return (
    <section className="relative overflow-hidden bg-cta-gradient px-5 py-28 text-center text-cta border-y border-border/40">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <Reveal className="relative mx-auto max-w-4xl">
        <h2 className="text-4xl font-bold leading-[1.3] sm:text-6xl tracking-tight text-foreground">
          {t.finalCtaTitle1}
          <br />
          {t.finalCtaTitle2}
          <br />
          <span className="text-gradient">{t.finalCtaTitle3}</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
          {t.finalCtaDesc}
        </p>

        <button
          type="button"
          onClick={handleAction}
          className="mt-10 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.03]"
        >
          {t.finalCtaBtn}
        </button>
      </Reveal>
    </section>
  );
}

type FooterLink = [string, string | (() => void)];
type FooterColumn = [string, FooterLink[]];

export function Footer({ lang = "bn" }: ClosingProps) {
  const t = translations[lang];
  const cols: FooterColumn[] = [
    [
      t.footerColPlatform,
      [
        [t.navHow, "#how"],
        [t.navFeatures, "#features"],
        [t.navAllFeatures, "#all-features"],
        [t.navDemo, "#demo"],
      ],
    ],
    [
      t.footerColSupport,
      [
        [t.navFaq, "#faq"],
        ["সীমাবদ্ধতা", "#trust"],
        ["দায়িত্বশীল এআই", "#trust"],
      ],
    ],
    [
      t.footerColAccount,
      [
        [t.navLogin, onLoginClick],
        [t.navStartDemo, onStartDemoClick],
      ],
    ],
  ];

  return (
    <footer className="relative overflow-hidden bg-surface px-5 pt-20">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-9 w-9" />
            <Wordmark className="text-lg" />
          </div>

          <p className="mt-4 leading-relaxed text-muted-foreground">
            বাংলাদেশের জন্য AI-চালিত জমি যাচাই ও সিদ্ধান্ত-সহায়ক
            প্ল্যাটফর্ম।
          </p>
        </div>

        {cols.map(([heading, links]) => (
          <div key={heading} className="md:border-l md:pl-8">
            <p className="font-semibold text-primary">{heading}</p>

            <ul className="mt-4 space-y-3">
              {links.map(([label, target]) => (
                <li key={label}>
                  {typeof target === "string" ? (
                    <a
                      href={target}
                      className="text-muted-foreground transition hover:text-foreground"
                    >
                      {label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={target}
                      className="text-muted-foreground transition hover:text-foreground"
                    >
                      {label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 flex max-w-6xl flex-col justify-between gap-2 border-t pt-6 font-display text-sm text-muted-foreground sm:flex-row">
        <p>© 2026 LandSure AI. All rights reserved.</p>

        <p>
          Designed &amp; Developed by{" "}
          <span className="text-foreground">
            Team AfterThought
          </span>
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="pointer-events-none mx-auto max-w-6xl select-none px-4 py-10 text-center"
        aria-hidden="true"
      >
        <p className="font-display text-[11px] font-semibold tracking-[0.4em] text-primary/60 sm:text-xs">
          AFTERTHOUGHT
        </p>

        <p className="mt-3 font-display text-4xl font-extrabold tracking-tight text-[#DDE5E1]/25 sm:text-6xl lg:text-7xl">
          LandSure AI
        </p>
      </motion.div>
    </footer>
  );
}

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setShow(window.scrollY > 800);
    };

    updateVisibility();

    window.addEventListener("scroll", updateVisibility, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", updateVisibility);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          aria-label="উপরে যান"
          className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border bg-elevated text-primary shadow-glow backdrop-blur"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
