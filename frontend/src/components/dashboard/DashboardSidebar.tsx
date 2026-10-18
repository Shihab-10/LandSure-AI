import { useEffect } from "react";
import {
  Bell, BookmarkCheck, Bot, ChevronRight, FileCheck2, FileText,
  LayoutDashboard, LogOut, MapPinned, Scale, ShieldAlert,
  ShieldCheck, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LogoMark, Wordmark } from "../landing/Logo";
import { onSpotlightMove, onSpotlightLeave } from "../common/Spotlight";
import type { DashboardModuleId, DashboardNavModule } from "../../types/dashboard";
import type { AuthUser } from "../../api";

export const DASHBOARD_MODULES: DashboardNavModule[] = [
  {
    id: "explorer",
    labelBn: "জমি খুঁজুন",
    labelEn: "Find Land",
    subtitleBn: "মানচিত্র ও পার্সেল ব্রাউজার",
    subtitleEn: "Map & Parcel Browser",
    icon: MapPinned,
  },
  {
    id: "saved",
    labelBn: "সংরক্ষিত জমি",
    labelEn: "Saved Properties",
    subtitleBn: "পছন্দের পার্সেল তালিকা",
    subtitleEn: "Bookmarked Parcels",
    icon: BookmarkCheck,
  },
  {
    id: "verification",
    labelBn: "জমি যাচাইকরণ",
    labelEn: "Land Verification",
    subtitleBn: "৯-ধাপের স্মার্ট অডিট",
    subtitleEn: "9-Step Smart Audit",
    icon: ShieldAlert,
  },
  {
    id: "documents",
    labelBn: "দলিল পরীক্ষা ও OCR",
    labelEn: "Deed Review & OCR",
    subtitleBn: "দলিল টেক্সট নিষ্কাশন",
    subtitleEn: "Deed Extraction & Checks",
    icon: FileCheck2,
  },
  {
    id: "copilot",
    labelBn: "ভূমি সহকারী",
    labelEn: "Land Assistant",
    subtitleBn: "স্মার্ট এআই চ্যাট ও পরামর্শ",
    subtitleEn: "AI Land Copilot",
    icon: Bot,
  },
  {
    id: "lawyers",
    labelBn: "আইনজীবীর পরামর্শ",
    labelEn: "Lawyer Consultation",
    subtitleBn: "ভূমি আইন বিশেষজ্ঞ সংযোগ",
    subtitleEn: "Legal Expert Connect",
    icon: Scale,
  },
  {
    id: "passport",
    labelBn: "যাচাই প্রতিবেদন",
    labelEn: "Verification Report",
    subtitleBn: "ট্রাস্ট পাসপোর্ট ও পিডিএফ",
    subtitleEn: "Trust Passport & PDF",
    icon: FileText,
  },
  {
    id: "my_land",
    labelBn: "আমার জমি",
    labelEn: "My Land",
    subtitleBn: "ব্যক্তিগত জমি ব্যবস্থাপনা",
    subtitleEn: "Personal Property Portfolio",
    icon: LayoutDashboard,
  },
  {
    id: "notifications",
    labelBn: "নোটিফিকেশন",
    labelEn: "Notifications",
    subtitleBn: "পরিবর্তন ও অডিট ট্রেইল",
    subtitleEn: "Change Alerts & Audit Trail",
    icon: Bell,
  },
];

interface DashboardSidebarProps {
  currentModule: DashboardModuleId;
  onSelectModule: (module: DashboardModuleId) => void;
  lang: "bn" | "en";
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: AuthUser | null;
  onLogout: () => void;
  savedCount?: number;
  notificationCount?: number;
}

export function DashboardSidebar({
  currentModule,
  onSelectModule,
  lang,
  mobileOpen,
  onCloseMobile,
  user,
  onLogout,
  savedCount = 0,
  notificationCount = 0,
}: DashboardSidebarProps) {
  // Normalize module aliases for highlighting
  const activeId: DashboardModuleId =
    currentModule === "journey"
      ? "verification"
      : currentModule === "overview"
      ? "my_land"
      : currentModule === "watchlist"
      ? "notifications"
      : currentModule;

  // Keyboard accessibility: close mobile drawer on Escape (capture phase)
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        console.log("[Sidebar] Escape key triggered mobile drawer close");
        onCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [mobileOpen, onCloseMobile]);

  // Lock body scroll when mobile drawer is open to prevent unintended background interaction
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const sidebarContent = (
    <div className="flex h-full w-full flex-col justify-between overflow-y-auto px-4 py-5 select-none scrollbar-thin">
      {/* Top Header / Branding with Continuous Animated Logo */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-5 border-b border-border/50">
          <div
            className="flex items-center gap-2.5 cursor-pointer group min-w-0"
            onClick={() => onSelectModule("explorer")}
            title="LandSure AI ড্যাশবোর্ড"
          >
            <LogoMark size={36} className="h-9 w-9 shrink-0" animated={true} />
            <div className="flex flex-col min-w-0">
              <Wordmark className="text-lg leading-tight" />
              <span className="font-display text-[9px] font-bold tracking-[0.16em] text-primary truncate">
                {lang === "bn" ? "এআই ভূমি প্ল্যাটফর্ম" : "LAND INTELLIGENCE"}
              </span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border/70 text-muted-foreground transition hover:bg-elevated hover:text-foreground shrink-0 lg:hidden"
            aria-label="মেনু বন্ধ করুন"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section Label */}
        <div className="mt-5 mb-2.5 px-3 flex items-center justify-between">
          <span className="text-[10px] font-extrabold tracking-[0.16em] text-muted-foreground/80 uppercase">
            {lang === "bn" ? "মূল মডিউলসমূহ" : "PRIMARY MODULES"}
          </span>
          <span className="h-1 w-1 rounded-full bg-primary/40" />
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-1.5 ls-sidebar-nav" aria-label="ড্যাশবোর্ড মডিউল নেভিগেশন">
          {DASHBOARD_MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeId === mod.id;

            let badgeValue: number | undefined;
            if (mod.id === "saved" && savedCount > 0) badgeValue = savedCount;
            if (mod.id === "notifications" && notificationCount > 0) badgeValue = notificationCount;

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  onSelectModule(mod.id);
                  onCloseMobile();
                }}
                onPointerMove={(e) => onSpotlightMove(e, "1")}
                onPointerLeave={onSpotlightLeave}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ls-nav-item-interactive ${
                  isActive
                    ? "bg-[#10231F] text-primary border border-primary/40 shadow-sm"
                    : "text-muted-foreground hover:bg-[#10231F]/45 hover:text-foreground hover:border-border/50 border border-transparent"
                }`}
                style={
                  isActive
                    ? {
                        boxShadow: "0 0 16px -4px rgba(94, 234, 212, 0.15)",
                      }
                    : {}
                }
              >
                {/* Pointer spotlight highlight layer */}
                <div
                  className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 ease-out opacity-0 ls-spotlight-glow"
                  style={{
                    opacity: "var(--spotlight-opacity, 0)",
                    background:
                      "radial-gradient(180px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(94, 234, 212, 0.12), transparent 75%)",
                  }}
                  aria-hidden="true"
                />

                {/* Active indicator bar */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}

                {/* Icon box */}
                <div
                  className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-surface/80 text-muted-foreground border border-border/40 group-hover:bg-[#10231F] group-hover:text-primary group-hover:border-primary/25"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                </div>

                {/* Titles */}
                <div className="relative z-10 flex min-w-0 flex-1 flex-col">
                  <span
                    className={`text-[15px] font-semibold leading-tight truncate transition-colors ${
                      isActive ? "text-[#F4F7F5]" : "text-[#A6BDB5] group-hover:text-[#F4F7F5]"
                    }`}
                  >
                    {lang === "bn" ? mod.labelBn : mod.labelEn}
                  </span>
                  <span
                    className={`text-[11.5px] leading-tight truncate transition-colors mt-0.5 ${
                      isActive ? "text-primary/90 font-medium" : "text-[#A6BDB5]/70 group-hover:text-[#A6BDB5]"
                    }`}
                  >
                    {lang === "bn" ? mod.subtitleBn : mod.subtitleEn}
                  </span>
                </div>

                {/* Badge if present */}
                {badgeValue !== undefined && badgeValue > 0 && (
                  <span className="relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/20 border border-primary/30 px-1.5 text-[10px] font-bold text-primary">
                    {badgeValue}
                  </span>
                )}

                {isActive && (
                  <ChevronRight className="relative z-10 h-3.5 w-3.5 text-primary shrink-0 opacity-90 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Evidence Disclaimer & User Profile */}
      <div className="mt-6 flex flex-col gap-3.5 border-t border-border/50 pt-4">
        {/* Transparent Data Honesty Box with Pointer Spotlight */}
        <div
          onPointerMove={(e) => onSpotlightMove(e, "1")}
          onPointerLeave={onSpotlightLeave}
          className="ls-spotlight-interactive rounded-xl border border-primary/20 bg-surface/70 p-3 text-xs text-muted-foreground transition hover:border-primary/35"
        >
          {/* Spotlight layer */}
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 ease-out opacity-0 ls-spotlight-glow"
            style={{
              opacity: "var(--spotlight-opacity, 0)",
              background:
                "radial-gradient(180px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(94, 234, 212, 0.10), transparent 75%)",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-center gap-2 font-bold text-primary">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-[11.5px]">{lang === "bn" ? "প্রমাণভিত্তিক যাচাই" : "Evidence-First Due Diligence"}</span>
          </div>
          <p className="relative z-10 mt-1 text-[10.5px] leading-relaxed text-muted-foreground/85">
            {lang === "bn"
              ? "সিএস, এসএ, আরএস ও বিএস রেকর্ডের তুলনা। চূড়ান্ত ক্রয়ের পূর্বে সংশ্লিষ্ট ভূমি অফিস ও বিশেষজ্ঞ দ্বারা যাচাই করুন।"
              : "Cross-survey comparisons & records. Always verify through authoritative land offices before finalizing purchase."}
          </p>
        </div>

        {/* User Profile Pill with Spotlight */}
        <div
          onPointerMove={(e) => onSpotlightMove(e, "1")}
          onPointerLeave={onSpotlightLeave}
          className="ls-spotlight-interactive flex items-center justify-between rounded-xl border border-border/60 bg-elevated/40 p-2 text-xs transition hover:border-primary/30"
        >
          {/* Spotlight layer */}
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 ease-out opacity-0 ls-spotlight-glow"
            style={{
              opacity: "var(--spotlight-opacity, 0)",
              background:
                "radial-gradient(160px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(94, 234, 212, 0.10), transparent 75%)",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-center gap-2.5 min-w-0">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-500/25 to-teal-700/35 border border-primary/30 text-xs font-extrabold text-primary">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : "LS"}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-bold text-foreground truncate">
                {user?.username || "demo-visitor"}
              </span>
              <span className="text-[9.5px] text-muted-foreground truncate">
                {user?.is_demo || user?.role === "demo"
                  ? (lang === "bn" ? "ডেমো সেশন (সিমুলেশন)" : "Demo Simulation")
                  : (user?.role || "Staff User")}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            className="relative z-10 grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
            aria-label={lang === "bn" ? "লগআউট" : "Log out"}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (Width: 260px) */}
      <aside
        className="hidden lg:flex w-[260px] shrink-0 flex-col sticky top-0 h-screen border-r border-border/50 bg-background/95 backdrop-blur-xl z-30 ls-desktop-sidebar sidebar"
        style={{ width: "260px", minWidth: "260px", maxWidth: "260px" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer with Backdrop & Escape/Scroll Lock */}
      <div
        className={`fixed inset-0 z-[9999] lg:hidden ls-mobile-drawer-root transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto visible" : "opacity-0 pointer-events-none invisible"
        }`}
        role="dialog"
        aria-modal={mobileOpen}
        aria-hidden={!mobileOpen}
        aria-label="নেভিগেশন ড্রয়ার"
      >
        {/* Backdrop */}
        <div
          onClick={onCloseMobile}
          className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
          aria-label="ড্রয়ার বন্ধ করতে ক্লিক করুন"
        />

        {/* Slide-out Drawer */}
        <div
          className={`relative h-full w-[280px] max-w-[85vw] border-r border-border/70 bg-[#0B1513] shadow-2xl z-20 ls-mobile-drawer overflow-hidden transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ backgroundColor: "#0B1513", width: "280px", maxWidth: "85vw" }}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}

