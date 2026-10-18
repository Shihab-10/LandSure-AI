import { useState, useEffect } from "react";
import {
  Bell, ChevronRight, Languages, LogOut,
  MapPinned, Menu, Moon, Sun
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LogoMark, Wordmark } from "../landing/Logo";
import { onSpotlightMove, onSpotlightLeave } from "../common/Spotlight";
import type { DashboardModuleId } from "../../types/dashboard";
import type { AuthUser } from "../../api";

interface DashboardNavbarProps {
  moduleTitleBn: string;
  moduleTitleEn: string;
  currentModuleId: DashboardModuleId;
  lang: "bn" | "en";
  onToggleLang: () => void;
  lightTheme: boolean;
  onToggleTheme: () => void;
  user: AuthUser | null;
  onLogout: () => void;
  onOpenMobileMenu: () => void;
  onNavigate: (module: DashboardModuleId) => void;
  notificationCount?: number;
  parcelId: string;
  parcelName?: string;
}

export function DashboardNavbar({
  moduleTitleBn,
  moduleTitleEn,
  currentModuleId: _currentModuleId,
  lang,
  onToggleLang,
  lightTheme,
  onToggleTheme,
  user,
  onLogout,
  onOpenMobileMenu,
  onNavigate,
  notificationCount = 0,
  parcelId,
  parcelName,
}: DashboardNavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const activeTitle = lang === "bn" ? moduleTitleBn : moduleTitleEn;
  const displayName = parcelName || (lang === "bn" ? "বিরুলিয়া নাল জমি" : "Birulia Agricultural Land");

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b backdrop-blur-xl transition-all duration-200 ls-dashboard-navbar ${
        scrolled
          ? "border-border/80 bg-[var(--ls-bg,#080D0C)]/90 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          : "border-border/50 bg-[var(--ls-bg,#080D0C)]/75 shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
      }`}
      style={{ height: "72px", minHeight: "72px" }}
    >
      <div className="h-full w-full px-4 sm:px-6 flex items-center justify-between gap-3 max-w-full">
        {/* Left Section: Mobile Menu + Mobile Branding / Desktop Breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile Menu Hamburger (Visible ONLY on tablet/mobile) */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            onPointerMove={(e) => onSpotlightMove(e, "1")}
            onPointerLeave={onSpotlightLeave}
            className="ls-spotlight-interactive grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-elevated/40 text-muted-foreground transition hover:border-primary/40 hover:bg-elevated hover:text-foreground lg:hidden shrink-0 mobile-menu"
            aria-label="মেনু খুলুন"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo & Wordmark (Visible ONLY on mobile/tablet when sidebar is hidden) */}
          <div
            className="flex items-center gap-2 cursor-pointer lg:hidden shrink-0"
            onClick={() => onNavigate("explorer")}
            title="LandSure AI ড্যাশবোর্ড"
          >
            <LogoMark size={32} className="h-8 w-8" animated={true} />
            <Wordmark className="text-base hidden sm:inline" />
          </div>

          {/* Clean Desktop Module Breadcrumbs */}
          <nav aria-label="ব্রেডক্রাম্ব" className="hidden lg:flex items-center gap-2 text-xs sm:text-sm text-muted-foreground select-none">
            <span
              onClick={() => onNavigate("my_land")}
              className="cursor-pointer transition hover:text-foreground hover:underline underline-offset-4 decoration-primary/40"
            >
              LandSure AI
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <AnimatePresence mode="wait">
              <motion.span
                key={activeTitle}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 4 }}
                transition={{ duration: 0.18 }}
                className="font-semibold text-foreground text-[14.5px]"
              >
                {activeTitle}
              </motion.span>
            </AnimatePresence>
          </nav>
        </div>

        {/* Center Section: Selected Parcel Context Pill with Pointer Spotlight */}
        <div className="flex items-center justify-center min-w-0">
          <button
            type="button"
            onClick={() => onNavigate("explorer")}
            onPointerMove={(e) => onSpotlightMove(e, "1")}
            onPointerLeave={onSpotlightLeave}
            title={lang === "bn" ? "পার্সেল পরিবর্তন বা নির্বাচন করতে ক্লিক করুন" : "Click to view or change selected parcel"}
            className="ls-spotlight-interactive group flex items-center gap-2 rounded-full border border-primary/30 bg-[#10231F]/80 px-3 py-1.5 text-xs text-primary transition-all duration-200 hover:border-primary/60 hover:bg-[#10231F] hover:shadow-[0_0_15px_rgba(94,234,212,0.15)] sm:px-4 sm:py-2"
          >
            <MapPinned className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
            <span className="font-mono font-bold tracking-tight text-foreground">{parcelId}</span>
            <span className="hidden sm:inline text-muted-foreground/60">|</span>
            <span className="hidden sm:inline max-w-[160px] truncate text-muted-foreground group-hover:text-foreground transition-colors">
              {displayName}
            </span>
          </button>
        </div>

        {/* Right Section: Environment Pill, Notifications, Lang, Theme, User Profile */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Environment Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 rounded-full border border-primary/25 bg-elevated/60 px-2.5 py-1 text-[11px] font-semibold text-primary environment demo">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span>{user?.is_demo || user?.role === "demo" ? (lang === "bn" ? "ডেমো ডেটাসেট (৭০০ জমি)" : "Demo (700 Parcels)") : (lang === "bn" ? "লাইভ এপিআই" : "Live API")}</span>
          </div>

          {/* Notifications / Watchlist Bell with Spotlight */}
          <button
            type="button"
            onClick={() => onNavigate("notifications")}
            onPointerMove={(e) => onSpotlightMove(e, "1")}
            onPointerLeave={onSpotlightLeave}
            title={lang === "bn" ? "নোটিফিকেশন ও সাম্প্রতিক পরিবর্তন দেখুন" : "View notifications & watchlist changes"}
            className="ls-spotlight-interactive relative grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl border border-border/80 bg-elevated/40 text-muted-foreground transition hover:border-primary/40 hover:bg-elevated hover:text-foreground"
            aria-label="নোটিফিকেশন"
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white shadow-sm">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Language Switcher with Spotlight */}
          <button
            type="button"
            onClick={onToggleLang}
            onPointerMove={(e) => onSpotlightMove(e, "1")}
            onPointerLeave={onSpotlightLeave}
            className="ls-spotlight-interactive flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-border/80 bg-elevated/40 px-2.5 sm:px-3 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:bg-elevated hover:text-foreground"
            title={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
            aria-label={lang === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
          >
            <Languages className="h-3.5 w-3.5 text-primary" />
            <span>{lang === "bn" ? "EN" : "বাংলা"}</span>
          </button>

          {/* Theme Switcher with Spotlight */}
          <button
            type="button"
            onClick={onToggleTheme}
            onPointerMove={(e) => onSpotlightMove(e, "1")}
            onPointerLeave={onSpotlightLeave}
            className="ls-spotlight-interactive grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl border border-border/80 bg-elevated/40 text-muted-foreground transition hover:border-primary/40 hover:bg-elevated hover:text-foreground"
            title={lightTheme ? "ডার্ক মোডে পরিবর্তন করুন" : "লাইট মোডে পরিবর্তন করুন"}
            aria-label="থিম পরিবর্তন"
          >
            {lightTheme ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {/* User Profile Pill with Spotlight */}
          <div
            onPointerMove={(e) => onSpotlightMove(e, "1")}
            onPointerLeave={onSpotlightLeave}
            className="ls-spotlight-interactive hidden sm:flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl border border-border/50 bg-elevated/30"
          >
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-teal-700/40 border border-primary/30 text-xs font-extrabold text-primary shrink-0">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : "LS"}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-foreground leading-tight truncate max-w-[95px]">
                {user?.username || "Demo User"}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {user?.role === "demo" ? "ভিজিটর সেশন" : user?.role || "ব্যবহারকারী"}
              </span>
            </div>
          </div>

          {/* Logout Button with Spotlight */}
          <button
            type="button"
            onClick={onLogout}
            onPointerMove={(e) => onSpotlightMove(e, "1")}
            onPointerLeave={onSpotlightLeave}
            title={lang === "bn" ? "লগআউট" : "Sign out"}
            className="ls-spotlight-interactive grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl border border-border/80 bg-elevated/40 text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            aria-label="লগআউট"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
