import { AnimatePresence, motion } from "motion/react";
import { Languages, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { onLoginClick, onStartDemoClick, onStartVerificationClick } from "@/lib/integration";
import { translations, type Language } from "@/lib/translations";
import { LogoMark, Wordmark } from "./Logo";

export const getNavItems = (lang: Language) => [
  { id: "how", label: translations[lang].navHow },
  { id: "features", label: translations[lang].navFeatures },
  { id: "all-features", label: translations[lang].navAllFeatures },
  { id: "demo", label: translations[lang].navDemo },
  { id: "faq", label: translations[lang].navFaq },
];

function useTheme() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light") || localStorage.getItem("ls-theme") === "light";
    setLight(isLight);
    if (isLight) {
      document.documentElement.classList.add("light");
      document.querySelector(".landsure-landing")?.classList.add("light");
    }
  }, []);
  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    document.querySelector(".landsure-landing")?.classList.toggle("light", next);
    localStorage.setItem("ls-theme", next ? "light" : "dark");
  };
  return { light, toggle };
}

function useActiveSection(navItems: { id: string; label: string }[]) {
  const [active, setActive] = useState("");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    navItems.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [navItems]);
  return active;
}

interface NavbarProps {
  lang?: Language;
  onToggleLang?: () => void;
}

export function Navbar({ lang = "bn", onToggleLang }: NavbarProps) {
  const { light, toggle } = useTheme();
  const navItems = getNavItems(lang);
  const active = useActiveSection(navItems);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden cursor-pointer"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <nav
        aria-label="প্রধান নেভিগেশন"
        className={`relative z-50 mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl border bg-background/80 px-3 py-2.5 backdrop-blur-xl transition-shadow sm:px-5 ${
          scrolled ? "shadow-card border-primary/20" : "border-border/60"
        }`}
      >
        <a href="#top" className="flex min-w-0 items-center gap-2.5" aria-label="LandSure AI হোম">
          <LogoMark className="h-9 w-9 shrink-0" />
          <Wordmark className="truncate text-lg" />
          <span className="hidden rounded-md border border-primary/20 bg-elevated/70 px-2 py-1 font-display text-[10px] font-bold tracking-[0.16em] text-primary xl:inline">
            {t.navBadge}
          </span>
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {navItems.map((n) => (
            <li key={n.id}>
              <a
                href={`#${n.id}`}
                className={`relative rounded-lg px-3 py-2 text-[14px] font-medium transition-colors hover:text-foreground ${
                  active === n.id ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {n.label}
                {active === n.id && (
                  <motion.span
                    layoutId="nav-dot"
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary"
                  />
                )}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          {/* Staff Login CTA */}
          <button
            onClick={onLoginClick}
            className="hidden rounded-xl border border-primary/30 bg-elevated/80 px-3.5 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:shadow-glow sm:inline-flex"
          >
            {t.navLogin}
          </button>

          {/* Primary Land Verification CTA */}
          <button
            onClick={onStartVerificationClick}
            className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:shadow-glow sm:inline-flex"
          >
            {t.navStartDemo}
          </button>

          {/* Bilingual Language Toggle */}
          {onToggleLang && (
            <button
              onClick={onToggleLang}
              aria-label={lang === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
              className="flex h-10 items-center gap-1 rounded-xl border border-border/80 bg-elevated/50 px-2.5 text-xs font-bold text-muted-foreground transition hover:bg-elevated hover:text-foreground"
              title={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
            >
              <Languages className="h-3.5 w-3.5 text-primary" />
              <span>{t.navToggleLang}</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggle}
            aria-label={light ? t.navToggleThemeDark : t.navToggleThemeLight}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border/80 text-muted-foreground transition hover:bg-elevated hover:text-foreground"
          >
            {light ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="মেনু"
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-border/80 lg:hidden"
          >
            <span
              className={`absolute h-0.5 w-5 bg-foreground transition ${open ? "rotate-45" : "-translate-y-1.5"}`}
            />
            <span
              className={`absolute h-0.5 w-5 bg-foreground transition ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute h-0.5 w-5 bg-foreground transition ${open ? "-rotate-45" : "translate-y-1.5"}`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative z-50 mx-auto mt-2 max-w-7xl rounded-2xl border border-primary/40 bg-surface p-4 shadow-card lg:hidden max-h-[calc(100vh-90px)] overflow-y-auto scrollbar-thin"
          >
            {navItems.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-base font-medium text-foreground hover:bg-elevated"
              >
                {n.label}
              </a>
            ))}

            {onToggleLang && (
              <button
                onClick={() => {
                  onToggleLang();
                  setOpen(false);
                }}
                className="mt-2 flex w-full items-center justify-between rounded-xl border border-border/70 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-elevated"
              >
                <span className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-primary" />
                  {lang === "bn" ? "ভাষা পরিবর্তন (বাংলা)" : "Change Language (English)"}
                </span>
                <span className="rounded bg-primary/15 px-2 py-0.5 font-bold text-primary">
                  {lang === "bn" ? "English" : "বাংলা"}
                </span>
              </button>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
              <button
                onClick={() => {
                  setOpen(false);
                  onStartDemoClick();
                }}
                className="rounded-xl border border-primary/40 bg-elevated py-2.5 text-center text-xs font-semibold text-primary hover:bg-elevated/80"
              >
                {lang === "bn" ? "ডেমো দেখুন" : "View Demo"}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  onLoginClick();
                }}
                className="rounded-xl border border-border/80 bg-background/60 py-2.5 text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {t.navLogin}
              </button>
            </div>

            <button
              onClick={() => {
                setOpen(false);
                onStartVerificationClick();
              }}
              className="mt-2 w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground shadow-glow"
            >
              {lang === "bn" ? "জমি যাচাই শুরু করুন" : "Start Verification"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
