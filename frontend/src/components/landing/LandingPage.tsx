import { useEffect, useState } from "react";
import { Intro } from "./Intro";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { DemoVideo } from "./DemoVideo";
import { AllFeatures, FreeDemo, Metrics, Problem, Showcase, Steps, TrustSection, Why } from "./Sections";
import { BackToTop, FAQ, FinalCTA, Footer } from "./Closing";
import { LandingCursorGlow } from "./LandingCursorGlow";
import { registerLandingAdapters } from "@/lib/integration";
import type { Language } from "@/lib/translations";
import "./landing.css";

interface LandingPageProps {
  onLoginClick?: () => void;
  onStartDemoClick?: () => void;
  onStartVerificationClick?: () => void;
  onOpenParcelExplorer?: () => void;
}

export function LandingPage({
  onLoginClick,
  onStartDemoClick,
  onStartVerificationClick,
  onOpenParcelExplorer,
}: LandingPageProps) {
  const [lang, setLang] = useState<Language>("bn");

  useEffect(() => {
    registerLandingAdapters({
      onLoginClick,
      onStartDemoClick,
      onStartVerificationClick,
      onOpenParcelExplorer,
    });
  }, [onLoginClick, onStartDemoClick, onStartVerificationClick, onOpenParcelExplorer]);

  const toggleLang = () => {
    setLang((prev) => (prev === "bn" ? "en" : "bn"));
  };

  return (
    <div className="landsure-landing landing-root min-h-screen bg-background text-foreground selection:bg-primary/30">
      <LandingCursorGlow />
      <Intro />
      <Navbar lang={lang} onToggleLang={toggleLang} />
      <main>
        <Hero
          lang={lang}
          onStartDemoClick={onStartDemoClick}
          onStartVerificationClick={onStartVerificationClick}
        />
        <DemoVideo lang={lang} onStartDemoClick={onStartDemoClick} />
        <Metrics lang={lang} />
        <Problem lang={lang} />
        <Steps lang={lang} />
        <Showcase lang={lang} />
        <AllFeatures lang={lang} />
        <TrustSection lang={lang} />
        <Why lang={lang} />
        <FreeDemo lang={lang} />
        <FAQ lang={lang} />
        <FinalCTA
          lang={lang}
          onStartDemoClick={onStartDemoClick}
          onStartVerificationClick={onStartVerificationClick}
        />
      </main>
      <Footer lang={lang} />
      <BackToTop />
    </div>
  );
}

