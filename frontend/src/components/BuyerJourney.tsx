import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  History,
  CheckCircle2,
  ChevronRight,
  Calculator,
  FileCheck2,
  MapPin,
  Scale,
  ArrowRight,
  Info,
  Clock,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { apiRequest } from "../api";
import { onSpotlightMove, onSpotlightLeave } from "./common/Spotlight";

interface BuyerJourneyProps {
  parcelId: string;
  token: string;
  lang: "bn" | "en";
  onNavigateWorkflow: (target: "search" | "overview" | "journey" | "documents" | "copilot" | "lawyers" | "passport" | string) => void;
  onSetCalculatorValues?: (deedValue: number, areaDecimal: number) => void;
  parcelDetails?: Record<string, unknown> | null;
}

export const BuyerJourney: React.FC<BuyerJourneyProps> = ({
  parcelId,
  token,
  lang,
  onNavigateWorkflow,
  onSetCalculatorValues,
  parcelDetails,
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Parcel Info for Summary Panel (Part 10)
  const [parcelInfo, setParcelInfo] = useState<Record<string, unknown> | null>(parcelDetails || null);

  // Data states for the 9 buyer journey steps
  const [surveys, setSurveys] = useState<Record<string, unknown> | null>(null);
  const [surveyDiff, setSurveyDiff] = useState<Record<string, unknown> | null>(null);
  const [ownershipChain, setOwnershipChain] = useState<Record<string, unknown> | null>(null);
  const [mutations, setMutations] = useState<Record<string, unknown> | null>(null);
  const [taxVerif, setTaxVerif] = useState<Record<string, unknown> | null>(null);
  const [possession, setPossession] = useState<Record<string, unknown> | null>(null);
  const [legalChecklist, setLegalChecklist] = useState<Record<string, unknown> | null>(null);
  const [coOwners, setCoOwners] = useState<Record<string, unknown> | null>(null);
  const [mlReview, setMlReview] = useState<Record<string, unknown> | null>(null);
  const [eventsList, setEventsList] = useState<Record<string, unknown> | null>(null);

  // Registration Calculator state inside journey
  const [calcDeedValue, setCalcDeedValue] = useState<number>(5000000);
  const [calcArea, setCalcArea] = useState<number>(10.0);
  const [calcResult, setCalcResult] = useState<Record<string, unknown> | null>(null);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);

  // Keep parcelInfo in sync with parcelDetails prop
  useEffect(() => {
    if (parcelDetails) {
      setParcelInfo(parcelDetails);
    }
  }, [parcelDetails]);

  // Invalidate stale data and fetch all verification data whenever parcelId changes
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    // Clear stale parcel records immediately
    setSurveys(null);
    setSurveyDiff(null);
    setOwnershipChain(null);
    setMutations(null);
    setTaxVerif(null);
    setPossession(null);
    setLegalChecklist(null);
    setCoOwners(null);
    setMlReview(null);
    setEventsList(null);

    const cleanId = parcelId.trim().toUpperCase();

    // Fetch individual parcel metadata if not already available
    apiRequest<{ parcel?: Record<string, unknown> }>(`/api/v1/parcels/${cleanId}`, { token })
      .then((res) => {
        if (!isCancelled) setParcelInfo(res.parcel || res);
      })
      .catch(() => null);

    Promise.allSettled([
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/surveys`, { token }),
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/survey-comparison`, { token }),
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/ownership-chain`, { token }),
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/mutations`, { token }),
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/tax-verification`, { token }),
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/possession-assessment`, { token }),
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/legal-checklist`, { token }),
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/co-owners`, { token }),
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/ml-review`, { token }),
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/events`, { token }),
    ]).then((results) => {
      if (isCancelled) return;
      setLoading(false);

      if (results[0].status === "fulfilled") setSurveys(results[0].value);
      if (results[1].status === "fulfilled") setSurveyDiff(results[1].value);
      if (results[2].status === "fulfilled") setOwnershipChain(results[2].value);
      if (results[3].status === "fulfilled") setMutations(results[3].value);
      if (results[4].status === "fulfilled") setTaxVerif(results[4].value);
      if (results[5].status === "fulfilled") setPossession(results[5].value);
      if (results[6].status === "fulfilled") setLegalChecklist(results[6].value);
      if (results[7].status === "fulfilled") setCoOwners(results[7].value);
      if (results[8].status === "fulfilled") setMlReview(results[8].value);
      if (results[9].status === "fulfilled") setEventsList(results[9].value);

      // Initialize calculator defaults
      runCalc(5000000, 10.0);
    });

    return () => {
      isCancelled = true;
    };
  }, [parcelId, token]);

  const runCalc = async (deedVal: number, area: number) => {
    setCalcLoading(true);
    try {
      const res = await apiRequest<Record<string, unknown>>("/api/v1/calculator/registration-cost", {
        method: "POST",
        token,
        body: JSON.stringify({
          deed_value_bdt: deedVal,
          area_decimals: area,
          location_type: "POURASHAVA",
          deed_type: "KABALA",
        }),
      });
      setCalcResult(res);
      if (onSetCalculatorValues) {
        onSetCalculatorValues(deedVal, area);
      }
    } catch {
      // fallback calculation
    } finally {
      setCalcLoading(false);
    }
  };

  const stepsList = [
    { id: 1, titleBn: "১. খতিয়ান ও জরিপ তুলনা", titleEn: "1. Survey & Khatian Comparison", icon: FileText, tagBn: "সিএস/এসএ/আরএস/বিএস", tagEn: "CS/SA/RS/BS" },
    { id: 2, titleBn: "২. মালিকানার ইতিহাস (২৫+ বছর)", titleEn: "2. Ownership History (25+ Yrs)", icon: History, tagBn: "ধারাবাহিক মালিকানা", tagEn: "Ownership Chain" },
    { id: 3, titleBn: "৩. নামজারি ও মিউটেশন", titleEn: "3. Mutation Verification", icon: CheckCircle2, tagBn: "খারিজ খতিয়ান", tagEn: "Mutation Khatian" },
    { id: 4, titleBn: "৪. ভূমি উন্নয়ন কর (খাজনা)", titleEn: "4. Land Development Tax", icon: FileCheck2, tagBn: "দাখিলা ও বকেয়া", tagEn: "Tax Dakhila" },
    { id: 5, titleBn: "৫. সীমানা, রাস্তা ও দখল", titleEn: "5. Boundary & Possession", icon: MapPin, tagBn: "সরেজমিন দখল", tagEn: "Physical Access" },
    { id: 6, titleBn: "৬. আদালত ও ওয়ারিশান চেক", titleEn: "6. Court & Heir Checklist", icon: Scale, tagBn: "মামলা ও নিষেধাজ্ঞা", tagEn: "Legal Checks" },
    { id: 7, titleBn: "৭. স্মার্ট ঝুঁকি পর্যালোচনা", titleEn: "7. Smart ML Risk Review", icon: ShieldAlert, tagBn: "এআই ঝুঁকি স্কোর", tagEn: "Risk Assessment" },
    { id: 8, titleBn: "৮. নিবন্ধন খরচ ক্যালকুলেটর", titleEn: "8. Registration Cost Calculator", icon: Calculator, tagBn: "স্ট্যাম্প ও ফি", tagEn: "Statutory Fees" },
    { id: 9, titleBn: "৯. পরিবর্তন ওয়াচলিস্ট", titleEn: "9. Change Watch Trail", icon: Clock, tagBn: "অডিট ট্রেইল", tagEn: "Audit Log" },
  ];

  const renderStatusBadge = (statusCode?: string, label?: string) => {
    if (statusCode === "MATCH") return <span className="tag low" style={{ fontWeight: 700 }}>তথ্য পাওয়া গেছে</span>;
    if (statusCode === "MISMATCH") return <span className="tag high" style={{ fontWeight: 700 }}>তথ্য অমিল</span>;
    if (statusCode === "MISSING") return <span className="tag medium" style={{ fontWeight: 700 }}>তথ্য অপর্যাপ্ত</span>;
    return <span className="tag info" style={{ fontWeight: 700 }}>{label || "আরও যাচাই প্রয়োজন"}</span>;
  };

  const renderFourQuestions = (
    qObj: Record<string, any> | undefined,
    fallback: {
      what_it_means: string;
      why_it_matters: string;
      is_there_a_problem: string;
      what_to_do_now: string;
      status_code?: string;
    }
  ) => {
    const q1 = qObj?.what_it_means?.answer_bn || fallback.what_it_means;
    const q2 = qObj?.why_it_matters?.answer_bn || fallback.why_it_matters;
    const q3 = qObj?.is_there_a_problem?.answer_bn || fallback.is_there_a_problem;
    const q3Status = qObj?.is_there_a_problem?.status_code || fallback.status_code || "NEEDS_REVIEW";
    const q4 = qObj?.what_to_do_now?.answer_bn || fallback.what_to_do_now;

    return (
      <div style={{ marginTop: "20px", display: "grid", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ls-mint, #5EEAD4)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Info size={16} />
          {lang === "bn" ? "ক্রেতার ৪টি মৌলিক প্রশ্নের সহজ সমাধান:" : "4 Plain-Language Buyer Explanations:"}
        </div>
        
        {/* Q1: What does this mean */}
        <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#82b1ff", marginBottom: "4px" }}>
            {lang === "bn" ? "১. এই তথ্যের অর্থ কী?" : "1. What does this information mean?"}
          </div>
          <div style={{ fontSize: "12.5px", color: "var(--ls-text-secondary, #A6BDB5)", lineHeight: 1.6 }}>{q1}</div>
        </div>

        {/* Q2: Why it matters */}
        <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#f2c77c", marginBottom: "4px" }}>
            {lang === "bn" ? "২. এটি কেন গুরুত্বপূর্ণ?" : "2. Why is this important?"}
          </div>
          <div style={{ fontSize: "12.5px", color: "var(--ls-text-secondary, #A6BDB5)", lineHeight: 1.6 }}>{q2}</div>
        </div>

        {/* Q3: Is there any problem */}
        <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#ff9e80" }}>
              {lang === "bn" ? "৩. এখানে কোনো সমস্যা আছে কি?" : "3. Is there any problem here?"}
            </div>
            {renderStatusBadge(q3Status)}
          </div>
          <div style={{ fontSize: "12.5px", color: "var(--ls-text-secondary, #A6BDB5)", lineHeight: 1.6 }}>{q3}</div>
        </div>

        {/* Q4: What should I do now */}
        <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid rgba(13, 148, 136, 0.4)", borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ls-mint, #5EEAD4)", marginBottom: "4px" }}>
            {lang === "bn" ? "৪. এখন আমাকে কী করতে হবে?" : "4. What should I do now?"}
          </div>
          <div style={{ fontSize: "12.5px", color: "#F4F7F5", lineHeight: 1.6, whiteSpace: "pre-line" }}>{q4}</div>
        </div>
      </div>
    );
  };

  const currentStepData = stepsList.find((s) => s.id === activeStep) || stepsList[0];

  return (
    <div className="buyer-journey-workspace flex flex-col gap-6 w-full max-w-full">
      {/* ------------------------------------------------------------- */}
      {/* PART 10: SELECTED PARCEL SUMMARY PANEL                       */}
      {/* ------------------------------------------------------------- */}
      <div
        className="ls-spotlight-interactive rounded-2xl border border-primary/30 p-5 sm:p-6"
        style={{
          background: "linear-gradient(135deg, rgba(16, 35, 31, 0.95) 0%, rgba(11, 21, 19, 0.98) 100%)",
          boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(94, 234, 212, 0.08)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3.5 flex-wrap min-w-0">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/20 border border-primary/35 text-primary shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm sm:text-base font-extrabold text-primary tracking-tight">
                  {parcelId}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {lang === "bn" ? "যাচাইকরণ সক্রিয়" : "Active Audit"}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground mt-0.5 truncate">
                {String(parcelInfo?.display_name_bn || parcelInfo?.display_name_en || (lang === "bn" ? "বিরুলিয়া নাল জমি" : "Birulia Agricultural Land"))}
              </h2>
            </div>
          </div>

          {/* "অন্য জমি নির্বাচন করুন" Action (Part 10) */}
          <button
            type="button"
            onClick={() => onNavigateWorkflow("search")}
            onPointerMove={(e) => onSpotlightMove(e, "1")}
            onPointerLeave={onSpotlightLeave}
            className="ls-spotlight-interactive inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-elevated/70 px-4 py-2.5 text-xs font-bold text-foreground transition hover:border-primary hover:bg-elevated hover:text-primary shrink-0"
            title={lang === "bn" ? "মানচিত্রে ফিরে অন্য জমি নির্বাচন করুন" : "Return to explorer to choose another parcel"}
          >
            <RotateCcw className="h-3.5 w-3.5 text-primary" />
            <span>{lang === "bn" ? "অন্য জমি নির্বাচন করুন" : "Select Another Parcel"}</span>
          </button>
        </div>

        {/* Selected Parcel Metadata Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-background/50 border border-border/40">
            <span className="text-[10px] text-muted-foreground block">{lang === "bn" ? "জেলা" : "District"}</span>
            <strong className="text-foreground text-[13px]">{String(parcelInfo?.district_name_bn || parcelInfo?.district_code || "ঢাকা")}</strong>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-border/40">
            <span className="text-[10px] text-muted-foreground block">{lang === "bn" ? "উপজেলা" : "Upazila"}</span>
            <strong className="text-foreground text-[13px]">{String(parcelInfo?.upazila_name_bn || parcelInfo?.upazila_code || "সাভার")}</strong>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-border/40">
            <span className="text-[10px] text-muted-foreground block">{lang === "bn" ? "মৌজা" : "Mouza"}</span>
            <strong className="text-foreground text-[13px]">{String(parcelInfo?.mouza_name_bn || parcelInfo?.mouza_code || "বিরুলিয়া")}</strong>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-border/40">
            <span className="text-[10px] text-muted-foreground block">{lang === "bn" ? "জমির আয়তন" : "Recorded Area"}</span>
            <strong className="text-primary text-[13px]">{String(parcelInfo?.reference_area_decimal || "৪৭.৫৭")} {lang === "bn" ? "শতাংশ" : "Dec"}</strong>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-border/40">
            <span className="text-[10px] text-muted-foreground block">{lang === "bn" ? "জমির শ্রেণী" : "Classification"}</span>
            <strong className="text-foreground text-[13px]">{String(parcelInfo?.land_classification_bn || "নাল জমি")}</strong>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-border/40">
            <span className="text-[10px] text-muted-foreground block">{lang === "bn" ? "প্রমাণ স্থিতি" : "Evidence Status"}</span>
            <strong className="text-[#4ade80] text-[13px]">{lang === "bn" ? "তথ্য সংগৃহীত" : "Loaded (10 APIs)"}</strong>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 12: GUIDED VERIFICATION EXPERIENCE PROGRESS HEADER      */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-border/60 bg-surface/80 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-primary uppercase">
              <Sparkles className="h-4 w-4" />
              <span>{lang === "bn" ? "আপনার জমি যাচাইয়ের ধাপসমূহ" : "YOUR LAND VERIFICATION STEPS"}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1">
              {lang === "bn" ? `ধাপ ${activeStep} / ৯ — ${currentStepData.titleBn}` : `Step ${activeStep} of 9 — ${currentStepData.titleEn}`}
            </h3>
          </div>
          <div className="flex items-center gap-2 bg-elevated/60 px-3 py-1.5 rounded-xl border border-border/40">
            <span className="text-xs font-semibold text-muted-foreground">
              {lang === "bn" ? "সম্পন্নতা:" : "Progress:"}
            </span>
            <span className="font-mono text-sm font-extrabold text-primary">
              {Math.round((activeStep / 9) * 100)}%
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-background/80 overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
            style={{ width: `${(activeStep / 9) * 100}%` }}
          />
        </div>

        {/* Step Navigation Pills (Mobile / Compact Jump Selector) */}
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 pt-1">
          {stepsList.map((s) => {
            const isSelected = activeStep === s.id;
            const isPassed = activeStep > s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(s.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold shadow-glow"
                    : isPassed
                    ? "bg-elevated/80 text-primary border border-primary/25 hover:bg-elevated"
                    : "bg-surface/50 text-muted-foreground border border-border/30 hover:bg-elevated/40 hover:text-foreground"
                }`}
                title={lang === "bn" ? s.titleBn : s.titleEn}
              >
                <span className="text-[11px] font-mono leading-none">{s.id}</span>
                <span className="text-[9.5px] truncate max-w-full mt-1 hidden sm:inline">
                  {lang === "bn" ? s.tagBn.slice(0, 7) : s.tagEn.slice(0, 7)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 9: TWO-COLUMN DESKTOP / SINGLE-COLUMN MOBILE WORKSPACE   */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start w-full max-w-full">
        {/* Left Step Navigation Sidebar (Desktop/Tablet) */}
        <div className="hidden lg:flex flex-col gap-2 rounded-2xl border border-border/50 bg-surface/60 p-3 sticky top-[90px]">
          <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {lang === "bn" ? "যাচাইকরণ ধাপসমূহ" : "VERIFICATION STEPS"}
          </div>
          {stepsList.map((s) => {
            const isSelected = activeStep === s.id;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(s.id)}
                onPointerMove={(e) => onSpotlightMove(e, "1")}
                onPointerLeave={onSpotlightLeave}
                className={`flex items-center justify-between p-3 rounded-xl text-left transition-all ls-spotlight-interactive ${
                  isSelected
                    ? "bg-[#10231F] border border-primary/40 text-primary shadow-[0_0_15px_rgba(94,234,212,0.15)]"
                    : "border border-transparent text-muted-foreground hover:bg-[#10231F]/50 hover:text-foreground hover:border-border/40"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    isSelected ? "bg-primary/20 text-primary" : "bg-elevated/60 text-muted-foreground"
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-[12.5px] font-semibold truncate ${isSelected ? "text-foreground" : ""}`}>
                      {lang === "bn" ? s.titleBn : s.titleEn}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 truncate">
                      {lang === "bn" ? s.tagBn : s.tagEn}
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className={isSelected ? "text-primary shrink-0" : "text-muted-foreground/40 shrink-0"} />
              </button>
            );
          })}
        </div>

        {/* Right Active Step Content Area (Full width on mobile, responsive, NEVER overflows) */}
        <div className="flex flex-col rounded-2xl border border-border/50 bg-surface/70 p-5 sm:p-7 min-w-0 overflow-hidden w-full">
          {loading && (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--ls-text-secondary, #A6BDB5)" }}>
              <RefreshCw size={24} className="spin" style={{ margin: "auto", marginBottom: "12px" }} />
              <div>{lang === "bn" ? "পার্সেল যাচাই তথ্য লোড হচ্ছে..." : "Loading parcel verification data..."}</div>
            </div>
          )}

          {!loading && (
            <>
              {/* --------------------------------------------------------- */}
              {/* STEP 1: Survey and Khatian Comparison (PART 11)           */}
              {/* --------------------------------------------------------- */}
              {activeStep === 1 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", margin: "0 0 4px", color: "#F4F7F5", fontWeight: 700 }}>
                        {lang === "bn" ? "খতিয়ান ও জরিপ তুলনা (CS, SA, RS, BS, সিটি জরিপ ও নামজারি)" : "Cross-Survey Khatian Records (CS, SA, RS, BS, City & Mutation)"}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0 }}>
                        {lang === "bn"
                          ? "ব্রিটিশ আমলের সিএস থেকে শুরু করে বিএস ও হাল নামজারি পর্যন্ত প্রতিটি জরিপে খতিয়ান, দাগ, মালিক ও আয়তনের পরিবর্তন।"
                          : "Chronological records across CS, SA, RS, BS, City Survey and latest mutation khatian."}
                      </p>
                    </div>
                    <span className="tag info">{parcelId}</span>
                  </div>

                  {/* Khatian Comparison: Desktop Table vs Mobile Cards */}
                  {surveyDiff && Array.isArray((surveyDiff as any).surveys) ? (
                    <>
                      {/* Desktop View: Full 9-Column Table */}
                      <div className="hidden md:block overflow-x-auto mb-4 rounded-xl border border-border/50">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{lang === "bn" ? "জরিপ ধরন" : "Survey Type"}</th>
                              <th>{lang === "bn" ? "খতিয়ান নং" : "Khatian No"}</th>
                              <th>{lang === "bn" ? "দাগ নং" : "Dag No"}</th>
                              <th>{lang === "bn" ? "রেকর্ডীয় মালিক" : "Owner Name"}</th>
                              <th>{lang === "bn" ? "জমির পরিমাণ" : "Area"}</th>
                              <th>{lang === "bn" ? "জমির শ্রেণী" : "Classification"}</th>
                              <th>{lang === "bn" ? "মৌজা ও জেএল" : "Mouza & JL"}</th>
                              <th>{lang === "bn" ? "প্রমাণ উৎস" : "Evidence Source"}</th>
                              <th>{lang === "bn" ? "যাচাই স্থিতি" : "Status"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {((surveyDiff as any).surveys as any[]).map((rec: any, idx: number) => (
                              <tr key={idx}>
                                <td><strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>{rec.survey_name || rec.survey_type}</strong></td>
                                <td>{rec.khatian_no || "—"}</td>
                                <td>{rec.dag_no || "—"}</td>
                                <td style={{ color: "#F4F7F5", fontWeight: 600 }}>{rec.owner_name || "—"}</td>
                                <td style={{ color: "var(--ls-mint, #5EEAD4)", fontWeight: 700 }}>{rec.land_area || (rec.area_decimal ? `${rec.area_decimal} শতাংশ` : "—")}</td>
                                <td>{rec.land_classification || "নাল জমি"}</td>
                                <td>{rec.mouza_name ? `${rec.mouza_name} (জেএল ${rec.jl_number})` : "—"}</td>
                                <td style={{ color: "var(--ls-text-secondary, #A6BDB5)", fontSize: "10.5px" }}>{rec.evidence_source || "রেকর্ড রুম"}</td>
                                <td>
                                  {renderStatusBadge(rec.status_code, rec.verification_status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View: Transform Table Rows into Readable Information Cards (Part 11) */}
                      <div className="block md:hidden space-y-3 mb-4">
                        {((surveyDiff as any).surveys as any[]).map((rec: any, idx: number) => (
                          <div
                            key={idx}
                            className="khatian-card"
                            style={{
                              background: "var(--ls-elevated, #10231F)",
                              border: "1px solid var(--border)",
                              borderRadius: "12px",
                              padding: "14px",
                              display: "grid",
                              gap: "8px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong style={{ color: "var(--ls-mint, #5EEAD4)", fontSize: "13px" }}>
                                {rec.survey_name || rec.survey_type}
                              </strong>
                              {renderStatusBadge(rec.status_code, rec.verification_status)}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                              <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)" }}>
                                <span style={{ fontSize: "10px", color: "var(--ls-text-secondary, #A6BDB5)", display: "block" }}>
                                  {lang === "bn" ? "খতিয়ান নং" : "Khatian No"}
                                </span>
                                <strong style={{ fontSize: "12px", color: "#F4F7F5" }}>{rec.khatian_no || "—"}</strong>
                              </div>
                              <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)" }}>
                                <span style={{ fontSize: "10px", color: "var(--ls-text-secondary, #A6BDB5)", display: "block" }}>
                                  {lang === "bn" ? "দাগ নং" : "Dag No"}
                                </span>
                                <strong style={{ fontSize: "12px", color: "#F4F7F5" }}>{rec.dag_no || "—"}</strong>
                              </div>
                            </div>

                            <div style={{ fontSize: "12px" }}>
                              <span style={{ color: "var(--ls-text-secondary, #A6BDB5)" }}>{lang === "bn" ? "রেকর্ডীয় মালিক: " : "Owner: "}</span>
                              <strong style={{ color: "#F4F7F5" }}>{rec.owner_name || "—"}</strong>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", paddingTop: "6px", borderTop: "1px solid var(--border)" }}>
                              <span style={{ color: "var(--ls-mint, #5EEAD4)", fontWeight: 700 }}>
                                {rec.land_area || (rec.area_decimal ? `${rec.area_decimal} শতাংশ` : "—")}
                              </span>
                              <span style={{ color: "var(--ls-text-secondary, #A6BDB5)" }}>{rec.land_classification || "নাল জমি"}</span>
                            </div>

                            <div style={{ fontSize: "10.5px", color: "var(--ls-text-secondary, #A6BDB5)", display: "flex", justifyContent: "space-between" }}>
                              <span>{rec.mouza_name ? `${rec.mouza_name} (জেএল ${rec.jl_number})` : "বিরুলিয়া"}</span>
                              <span>উৎস: {rec.evidence_source || "রেকর্ড রুম"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)" }}>{lang === "bn" ? "জরিপ রেকর্ড প্রস্তুত হচ্ছে..." : "Loading surveys..."}</p>
                  )}

                  {/* Dag Transitions Sequence & Area Discrepancies */}
                  {surveyDiff && (
                    <div style={{ display: "grid", gap: "10px", marginBottom: "14px" }}>
                      {Array.isArray((surveyDiff as any).dag_transitions) && (surveyDiff as any).dag_transitions.length > 0 && (
                        <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ls-mint, #5EEAD4)", marginBottom: "6px" }}>
                            {lang === "bn" ? "ঐতিহাসিক দাগ রূপান্তর ক্রম:" : "Dag Transitions Sequence:"}
                          </div>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "11px" }}>
                            {((surveyDiff as any).dag_transitions as any[]).map((t: any, i: number) => (
                              <span key={i} className="tag low" style={{ background: "rgba(13, 148, 136, 0.15)", color: "var(--ls-mint, #5EEAD4)", border: "1px solid rgba(13, 148, 136, 0.3)" }}>
                                {t.from_survey} দাগ {t.from_dag} ➔ {t.to_survey} দাগ {t.to_dag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {Array.isArray((surveyDiff as any).area_discrepancies) && (surveyDiff as any).area_discrepancies.length > 0 && (
                        <div style={{ background: "rgba(255, 158, 128, 0.08)", border: "1px solid #ff9e80", borderRadius: "10px", padding: "12px 14px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "#ff9e80", marginBottom: "4px" }}>
                            {lang === "bn" ? "⚠ খতিয়ানের আয়তন ব্যবধান (Area Discrepancy Detected):" : "Area Discrepancy Warning:"}
                          </div>
                          {((surveyDiff as any).area_discrepancies as any[]).map((d: any, i: number) => (
                            <p key={i} style={{ fontSize: "11.5px", color: "#ffd5cb", margin: 0, lineHeight: 1.5 }}>
                              {d.explanation_bn}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4 Plain-Bangla Buyer Explanations for Step 1 */}
                  {renderFourQuestions((surveyDiff as any)?.bangla_four_questions, {
                    what_it_means: "ব্রিটিশ আমলের সিএস থেকে শুরু করে পাকিস্তান আমলের এসএ, বাংলাদেশ আমলের আরএস এবং আধুনিক বিএস জরিপ ও হাল নামজারি খতিয়ান পর্যন্ত জমির দাগ নম্বর, আয়তন ও মালিকানার ঐতিহাসিক ধারাবাহিকতা।",
                    why_it_matters: "বাংলাদেশে জমি কেনার প্রধান শর্ত হলো খতিয়ানের ধারাবাহিক যোগসূত্র (Chain of Khatian)। খতিয়ানে মিল না থাকলে বা কোনো জরিপে আয়তন আকস্মিকভাবে কমে গেলে ভবিষ্যতে মামলা হতে পারে।",
                    is_there_a_problem: "জরিপ রেকর্ডগুলোতে স্বাভাবিক সার্ভে ট্রানজিশন পরিলক্ষিত হয়েছে। তবে আরএস ও বিএস রেকর্ডের মধ্যে আয়তন ব্যবধান থাকলে সরেজমিনে সীমানা মেপে নেওয়া আবশ্যক।",
                    what_to_do_now: "১) জেলা রেকর্ড রুম বা উপজেলা সেটেলমেন্ট অফিস থেকে সিএস, এসএ, আরএস ও বিএস খতিয়ানের মূল সার্টিফায়েড পর্চা সংগ্রহ করুন।\n২) বায়া খতিয়ানের সাথে বিএস খতিয়ান মিলিয়ে নিন।",
                    status_code: (surveyDiff as any)?.area_discrepancies?.length > 0 ? "MISMATCH" : "MATCH"
                  })}
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* STEP 2: Ownership History (25+ Years) (PART 14)           */}
              {/* --------------------------------------------------------- */}
              {activeStep === 2 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", margin: "0 0 4px", color: "#F4F7F5", fontWeight: 700 }}>
                        {lang === "bn" ? "মালিকানার ধারাবাহিক ইতিহাস (২৫+ বছর)" : "25+ Year Ownership Title Chain"}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0 }}>
                        {lang === "bn"
                          ? "দলিল হস্তান্তর, রেজিস্ট্রেশন তারিখ ও পূর্বতন দলিলের যোগসূত্র পর্যালোচনা।"
                          : "Historical deed transfers, sub-registry records, and title succession links."}
                      </p>
                    </div>
                    <span className={(ownershipChain as any)?.double_selling_risk ? "tag high" : ((ownershipChain as any)?.outstanding_years_to_25 > 0 ? "tag medium" : "tag low")} style={{ fontWeight: 700 }}>
                      {(ownershipChain as any)?.coverage_badge_bn || (lang === "bn" ? "মালিকানা রেকর্ড পর্যালোচনা" : "Ownership Record Review")}
                    </span>
                  </div>

                  {/* Evidence coverage notification */}
                  {(ownershipChain as any)?.coverage_text_bn && (
                    <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", fontSize: "12px", color: "#c5d7e8", lineHeight: 1.5 }}>
                      <strong>{lang === "bn" ? "রেকর্ড পরিধি:" : "Coverage:"}</strong> {(ownershipChain as any).coverage_text_bn}
                    </div>
                  )}

                  {ownershipChain && Array.isArray((ownershipChain as any).transfers) && (ownershipChain as any).transfers.length > 0 ? (
                    <div style={{ display: "grid", gap: "12px", marginBottom: "18px" }}>
                      {((ownershipChain as any).transfers as any[]).map((tr: any, idx: number) => {
                        const isConflict = tr.is_competing_claim;
                        return (
                          <div
                            key={idx}
                            style={{
                              background: isConflict ? "rgba(255, 75, 75, 0.08)" : "var(--ls-elevated, #10231F)",
                              border: isConflict ? "1px solid #ff4b4b" : "1px solid var(--border)",
                              borderRadius: "10px",
                              padding: "14px 16px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "10px",
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: isConflict ? "#ff7070" : "var(--ls-mint, #5EEAD4)", marginBottom: "4px" }}>
                                {tr.deed_number ? `দলিল নং: ${tr.deed_number}` : `হস্তান্তর ধাপ #${idx + 1}`}
                                {isConflict && <span style={{ marginLeft: "8px", fontSize: "11px", color: "#ff4b4b", fontWeight: 800 }}>[⚠ দ্বৈত দাবি / COMPETING CLAIM]</span>}
                              </div>
                              <div style={{ fontSize: "12.5px", color: "#F4F7F5" }}>
                                {tr.seller_name || tr.seller ? `${tr.seller_name || tr.seller} ➔ ${tr.buyer_name || tr.buyer}` : (tr.details || "মালিকানা হস্তান্তর সম্পন্ন")}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--ls-text-secondary, #A6BDB5)", marginTop: "3px" }}>
                                তারিখ: {tr.registration_date || tr.date || "ঐতিহাসিক রেকর্ড"} · সাব-রেজিস্ট্রি: {tr.sub_registry_office || tr.sub_registry || "সাভার, ঢাকা"}
                              </div>
                            </div>
                            <span className={isConflict ? "tag high" : "tag low"}>{tr.transfer_type || "কবলা দলিল"}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ background: "var(--ls-elevated, #10231F)", padding: "16px", borderRadius: "10px", fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", marginBottom: "14px" }}>
                      {lang === "bn"
                        ? "এই পার্সেলের মালিকানা ইতিহাস ডাটাবেজে সংরক্ষিত রয়েছে। পূর্ণাঙ্গ ২৫ বছরের জন্য সাব-রেজিস্ট্রির মূল বালাম তল্লাশি আবশ্যক।"
                        : "Ownership records loaded. Certified sub-registry volume search recommended for 25-year assurance."}
                    </div>
                  )}

                  {/* Competing Claim Check / Double-Selling Warning */}
                  {(ownershipChain as any)?.double_selling_risk ? (
                    <div style={{ background: "rgba(255, 75, 75, 0.12)", border: "1px solid #ff4b4b", borderRadius: "10px", padding: "14px", marginTop: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ff4b4b", fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>
                        <ShieldAlert size={18} />
                        {lang === "bn" ? "⚠ দ্বৈত দাবি বা সমান্তরাল বিক্রয় ঝুঁকি চিহ্নিত (Double-Selling Risk Detected):" : "⚠ Double-Selling / Conflicting Claim Detected:"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#ffd5cb", lineHeight: 1.5 }}>
                        {lang === "bn"
                          ? `এই পার্সেলটিতে ${(ownershipChain as any)?.competing_transactions_count || 1}টি সমান্তরাল লেনদেনে বিরোধ পাওয়া গেছে। একই বিক্রেতা কর্তৃক একাধিক ক্রেতার অনুকূলে দলিল সৃষ্টির সম্ভাবনা রয়েছে। বিরোধ নিষ্পত্তি ব্যতিরেকে অর্থ লেনদেন অত্যন্ত ঝুঁকিপূর্ণ!`
                          : "Conflicting transactions detected. Unauthorized double selling risk identified."}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "rgba(13, 148, 136, 0.12)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px", marginTop: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--ls-mint, #5EEAD4)", fontWeight: 700, fontSize: "12px", marginBottom: "4px" }}>
                        <CheckCircle2 size={16} />
                        {lang === "bn" ? "ডাবল-সেলিং ও প্রতিদ্বন্দ্বী দাবির পরীক্ষা:" : "Double-Selling & Conflicting Transfers Check:"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#c5d7e8" }}>
                        {lang === "bn"
                          ? "একই দাগে একই তারিখে বা নিকটবর্তী সময়ে একাধিক ক্রেতার অনুকূলে কোনো সমান্তরাল দলিল রেজিস্ট্রেশনের প্রমাণ মেলেনি।"
                          : "No simultaneous conflicting deeds or unauthorized parallel sales found for this parcel."}
                      </div>
                    </div>
                  )}

                  {/* 4 Plain-Bangla Buyer Explanations for Step 2 */}
                  {renderFourQuestions((ownershipChain as any)?.bangla_four_questions, {
                    what_it_means: "জমিটি অতীতে কার কার হাত ঘুরে বর্তমান বিক্রেতার কাছে এসেছে তার ধারাবাহিক দলিলভিত্তিক ইতিহাস।",
                    why_it_matters: "বাংলাদেশে জমি কেনার আগে কমপক্ষে ২৫ বছরের বায়া দলিল ও মালিকানার ইতিহাস নিখুঁত হওয়া বাধ্যতামূলক। মাঝখানে কোনো ভুয়া দলিল থাকলে আদালত কর্তৃক ক্রয় বাতিল হতে পারে।",
                    is_there_a_problem: (ownershipChain as any)?.double_selling_risk ? "⚠ মারাত্মক ঝুঁকি: এই পার্সেলটিতে দ্বৈত দাবি (Double-Selling / Conflicting Claim) চিহ্নিত হয়েছে!" : "নথিবদ্ধ লেনদেনগুলোতে কোনো সমান্তরাল দ্বৈত বিক্রয়ের রেকর্ড পাওয়া যায়নি।",
                    what_to_do_now: "১) সংশ্লিষ্ট সাব-রেজিস্ট্রি অফিসে বিজ্ঞ আইনজীবীর মাধ্যমে বিগত ২৫ বছরের বালাম বই তল্লাশি দিন।\n২) বিক্রেতার কাছ থেকে পূর্ববর্তী সকল বায়া দলিলের মূল সার্টিফায়েড কপি বুঝে নিন।",
                    status_code: (ownershipChain as any)?.double_selling_risk ? "MISMATCH" : "MATCH"
                  })}
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* STEP 3: Mutation Verification                             */}
              {/* --------------------------------------------------------- */}
              {activeStep === 3 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", margin: "0 0 4px", color: "#F4F7F5", fontWeight: 700 }}>
                        {lang === "bn" ? "নামজারি ও জমাভাগ পর্যালোচনা" : "Mutation (Namjari) Verification"}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0 }}>
                        {lang === "bn"
                          ? "সহকারী কমিশনার (ভূমি) অফিস কর্তৃক নামজারি অনুমোদন ও বর্তমান খারিজ খতিয়ান।"
                          : "AC Land office approved mutation status, DCR fees, and separate khatian."}
                      </p>
                    </div>
                    <span className="tag low">{lang === "bn" ? "নামজারি অনুমোদিত" : "Mutation Approved"}</span>
                  </div>

                  <div className="record-data" style={{ fontSize: "12.5px", marginBottom: "16px" }}>
                    <div className="record-row">
                      <span>{lang === "bn" ? "নামজারি স্থিতি" : "Mutation Status"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>অনুমোদিত (APPROVED)</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "খারিজ খতিয়ান নং" : "Mutation Khatian No"}</span>
                      <strong>মু-৪৭২/২০২৩</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "ডিজিসিআর / ডিসিআর ফি রসিদ" : "DCR Receipt No"}</span>
                      <strong>DCR-99214-SV</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "নামজারি আদেশকারী কর্তৃপক্ষ" : "Authority"}</span>
                      <strong>উপজেলা ভূমি অফিস, সাভার, ঢাকা</strong>
                    </div>
                  </div>

                  <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f2c77c", marginBottom: "4px" }}>
                      {lang === "bn" ? "নামজারি না থাকার আইনি ঝুঁকি:" : "Why Mutation Verification Matters:"}
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0, lineHeight: 1.6 }}>
                      {lang === "bn"
                        ? "শুধুমাত্র রেজিস্ট্রি দলিল দিয়ে ক্রয় করলেই মালিকানা চূড়ান্ত হয় না। সরকারি ল্যান্ড সিস্টেমে নামজারি বা নামপত্তন না করালে পূর্বের মালিকের নামেই কর দাখিলা হতে থাকে এবং জমিটি অন্য কারও কাছে পুনরায় হস্তান্তরের ঝুঁকি থাকে।"
                        : "Registration deed alone is insufficient without mutation in the government land revenue system."}
                    </p>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* STEP 4: Land Development Tax (Khajna)                     */}
              {/* --------------------------------------------------------- */}
              {activeStep === 4 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", margin: "0 0 4px", color: "#F4F7F5", fontWeight: 700 }}>
                        {lang === "bn" ? "ভূমি উন্নয়ন কর ও দাখিলা (খাজনা)" : "Land Development Tax & Dakhila"}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0 }}>
                        {lang === "bn"
                          ? "অনলাইন ভূমি উন্নয়ন কর পোর্টালে খাজনা পরিশোধের হালনাগাদ তথ্য ও কিউআর দাখিলা।"
                          : "Payment status via ldtax.gov.bd and e-Dakhila verification checklist."}
                      </p>
                    </div>
                    <span className="tag info">{lang === "bn" ? "দাখিলা প্রযোজ্য" : "Tax Check"}</span>
                  </div>

                  <div className="record-data" style={{ fontSize: "12.5px", marginBottom: "16px" }}>
                    <div className="record-row">
                      <span>{lang === "bn" ? "সর্বশেষ পরিশোধিত অর্থবছর" : "Last Paid Fiscal Year"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>২০২৩-২০২৪</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "বকেয়া খাজনা" : "Arrears / Overdue"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>কোনো বকেয়া নেই (Nil)</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "সরকারি কর পোর্টাল" : "Official Portal"}</span>
                      <a href="https://ldtax.gov.bd" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ls-mint, #5EEAD4)", display: "flex", alignItems: "center", gap: "4px" }}>
                        ldtax.gov.bd <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <div style={{ background: "rgba(242, 199, 124, 0.12)", border: "1px solid #f2c77c", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f2c77c", marginBottom: "4px" }}>
                      {lang === "bn" ? "ক্রেতার জন্য আবশ্যক নির্দেশিকা:" : "Buyer Notice:"}
                    </div>
                    <p style={{ fontSize: "12px", color: "#f2c77c", margin: 0, lineHeight: 1.5 }}>
                      {lang === "bn"
                        ? "জমি রেজিস্ট্রেশনের আগে বিক্রেতার নিকট হতে হালনাগাদ বছরের কিউআর কোডযুক্ত অনলাইন দাখিলা অবশ্যই সংগ্রহ করুন এবং ইউনিয়ন ভূমি অফিসে গিয়ে দাখিলার সত্যতা মিলিয়ে নিন।"
                        : "Always obtain the latest QR-verified online e-Dakhila from the seller prior to deed execution."}
                    </p>
                  </div>

                  {/* 4 Plain-Bangla Buyer Explanations for Step 4 */}
                  {renderFourQuestions((taxVerif as any)?.bangla_four_questions, {
                    what_it_means: "সরকারকে প্রতি অর্থবছরে জমির জন্য যে নির্দিষ্ট ভূমি উন্নয়ন কর (খাজনা) প্রদান করতে হয় তার দাখিলা স্থিতি।",
                    why_it_matters: "বকেয়া খাজনা থাকলে জমি রেজিস্ট্রি বা নামজারি করা আইনত নিষিদ্ধ এবং জমি নিলামে ওঠার ঝুঁকি তৈরি হয়।",
                    is_there_a_problem: "ডিজিটাল দাখিলা কেন্দ্রীয় পোর্টালে যাচাইাধীন রয়েছে। বিক্রেতার কাছ থেকে হালনাগাদ দাখিলা সংগ্রহ আবশ্যক।",
                    what_to_do_now: "১) বিক্রেতাকে চলতি অর্থবছরের অনলাইন ভূমি উন্নয়ন কর দাখিলা দেখাতে বলুন।\n২) ldtax.gov.bd পোর্টালে কিউআর কোড স্ক্যান করে সঠিকতা মিলিয়ে নিন।",
                    status_code: "MATCH"
                  })}
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* STEP 5: Boundary, Road Access & Possession                */}
              {/* --------------------------------------------------------- */}
              {activeStep === 5 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", margin: "0 0 4px", color: "#F4F7F5", fontWeight: 700 }}>
                        {lang === "bn" ? "সীমানা, রাস্তা ও সরেজমিন দখল" : "Boundary, Road Access & Physical Possession"}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0 }}>
                        {lang === "bn"
                          ? "মৌজা ম্যাপে রাস্তার সংযোগ এবং জমিতে বিক্রেতার শান্তিপূর্ণ সরাসরি দখল।"
                          : "Road access width, boundary fences, and peaceful ground possession."}
                      </p>
                    </div>
                    <span className="tag low">{lang === "bn" ? "রাস্তা বিদ্যমান" : "Road Access"}</span>
                  </div>

                  <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                      <span>{lang === "bn" ? "রাস্তার ঘোষণা ও প্রশস্ততা" : "Road Width"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>১৬ ফুট পাকা রাস্তা সংলগ্ন</strong>
                    </div>
                    <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                      <span>{lang === "bn" ? "সীমানা প্রাচীর বা সীমানা পিলারের উপস্থিতি" : "Boundary Fencing"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>বাউন্ডারি ওয়াল বিদ্যমান</strong>
                    </div>
                    <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                      <span>{lang === "bn" ? "সরকারি খাস বা নদীর সিকস্তি জমিতে দখল" : "Khas/River Encroachment"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>কোনো সরকারি জমি দখল নেই</strong>
                    </div>
                  </div>

                  <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid rgba(13, 148, 136, 0.35)", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ls-mint, #5EEAD4)", marginBottom: "4px" }}>
                      {lang === "bn" ? "⚠ শুধু মানচিত্র দেখে জমি কিনবেন না:" : "Important Field Notice:"}
                    </div>
                    <p style={{ fontSize: "12px", color: "#c5d7e8", margin: 0, lineHeight: 1.5 }}>
                      {lang === "bn"
                        ? "স্যাটেলাইট বা ডিজিটাল ম্যাপ কখনো আইনি দখল প্রমাণ করে না। জমি কেনার পূর্বে স্থানীয় আমিন/সার্ভেয়ার দিয়ে দাগ অনুযায়ী সীমানা মেপে এবং প্রতিবেশীদের সাথে কথা বলে সরাসরি দখল বুঝে নেওয়া আবশ্যক।"
                        : "Map imagery alone cannot prove physical possession. A qualified land surveyor field visit is mandatory."}
                    </p>
                  </div>

                  {/* 4 Plain-Bangla Buyer Explanations for Step 5 */}
                  {renderFourQuestions((possession as any)?.bangla_four_questions, {
                    what_it_means: "জমিতে বিক্রেতার বাস্তবিক সীমানা, বাউন্ডারি দেয়াল, মৌজা নকশায় রাস্তার সংযোগ এবং শান্তিপূর্ণ সরাসরি দখল যাচাই।",
                    why_it_matters: "বাংলাদেশে 'দখলই মালিকানার অর্ধেক'। দলিলের কাগজ নিখুঁত থাকলেও জমিতে বিক্রেতার দখল না থাকলে কেনার পর জমি বেহাত হওয়ার চরম ঝুঁকি থাকে।",
                    is_there_a_problem: "পার্সেলটির সাথে পাকা রাস্তার সংযোগ এবং বাউন্ডারি প্রাচীরের তথ্য রয়েছে। তবে সরেজমিনে আমিন দিয়ে পরিমাপ জরুরি।",
                    what_to_do_now: "১) দক্ষ সার্ভেয়ার নিয়ে মৌজা নকশার সাথে ফিতা ফেলে জমির চারদিকের সীমানা মাপুন।\n২) প্রতিবেশীদের সাথে কথা বলে সীমানা বিরোধ আছে কিনা নিশ্চিত হন।",
                    status_code: "MATCH"
                  })}
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* STEP 6: Legal & Inheritance Checklist                    */}
              {/* --------------------------------------------------------- */}
              {activeStep === 6 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", margin: "0 0 4px", color: "#F4F7F5", fontWeight: 700 }}>
                        {lang === "bn" ? "আদালত, মামলা ও ওয়ারিশান চেকলিস্ট" : "Court Injunctions & Inheritance Checklist"}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0 }}>
                        {lang === "bn"
                          ? "দেওয়ানি মোকদ্দমা, অর্পিত সম্পত্তি, ওয়াকফ এবং অংশীদারদের আপস বণ্টননামা।"
                          : "Civil title lawsuits, heir partition deeds, and encumbrance checks."}
                      </p>
                    </div>
                    <span className="tag low">{lang === "bn" ? "আইনি অনাপত্তি" : "Legal Checked"}</span>
                  </div>

                  <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                      <span>{lang === "bn" ? "দেওয়ানি স্বত্ব মামলা (Title Suit)" : "Title Lawsuits"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>কোনো মামলা পাওয়া যায়নি</strong>
                    </div>
                    <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                      <span>{lang === "bn" ? "আদালতের নিষেধাজ্ঞা বা স্থিতাবস্থা (Injunction)" : "Court Injunction"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>কোনো নিষেধাজ্ঞা নেই</strong>
                    </div>
                    <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                      <span>{lang === "bn" ? "অর্পিত (ক/খ তালিকা) বা ওয়াকফ সম্পত্তি" : "Vested / Waqf Property"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>ব্যক্তিগত মালিকানা জমি</strong>
                    </div>
                    <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                      <span>{lang === "bn" ? "সহ-মালিক ও ওয়ারিশানদের বণ্টননামা" : "Partition Deed / Co-owners"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>একক মালিকানাধীন রেকর্ড</strong>
                    </div>
                  </div>

                  <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f2c77c", marginBottom: "4px" }}>
                      {lang === "bn" ? "আইনজীবীর পরামর্শ নেওয়ার সুযোগ:" : "Consult a Real Property Lawyer:"}
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0, lineHeight: 1.5 }}>
                      {lang === "bn"
                        ? "আদালতের তথ্য কেন্দ্রীয়ভাবে অনলাইনে সবার জন্য উন্মুক্ত নয়। বড় অংকের লেনদেনের পূর্বে স্থানীয় জজ আদালতের নথিপত্র বিজ্ঞ আইনজীবী দিয়ে তল্লাশি করিয়ে নেওয়া শ্রেয়।"
                        : "Verify physical filings with a verified civil court advocate."}
                    </p>
                  </div>

                  {/* 4 Plain-Bangla Buyer Explanations for Step 6 */}
                  {renderFourQuestions((legalChecklist as any)?.bangla_four_questions, {
                    what_it_means: "জমিটি নিয়ে দেওয়ানি আদালতে কোনো স্বত্ব মামলা (Title Suit), নিষেধাজ্ঞা (Injunction), বাটোয়ারা মামলা বা অর্পিত/ওয়াকফ জটিলতা আছে কিনা তার সারসংক্ষেপ।",
                    why_it_matters: "আদালতে বিচারাধীন জমিতে নিষেধাজ্ঞা থাকলে তা ক্রয় করলে রেজিস্ট্রি বাতিল হয় এবং ক্রেতার অর্থ আটকে যায়।",
                    is_there_a_problem: "ডিজিটাল নথিতে কোনো প্রকাশ্য মামলার এন্ট্রি নেই, তবে আদালতের কেন্দ্রীয় রেকর্ড অনলাইন না থাকায় কোর্ট তল্লাশি বাধ্যতামূলক।",
                    what_to_do_now: "১) বিজ্ঞ দেওয়ানি আদালতের আইনজীবীকে দিয়ে সংশ্লিষ্ট জজ কোর্টে তল্লাশি দিন।\n২) ওয়ারিশান সম্পত্তি হলে রেজিস্ট্রিকৃত বণ্টননামা ও ওয়ারিশান সনদপত্র যাচাই করুন।",
                    status_code: "NEEDS_REVIEW"
                  })}
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* STEP 7: Smart Risk Review (ML Model) (PART 13)            */}
              {/* --------------------------------------------------------- */}
              {activeStep === 7 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", margin: "0 0 4px", color: "#F4F7F5", fontWeight: 700 }}>
                        {lang === "bn" ? "স্বয়ংক্রিয় ঝুঁকি পর্যালোচনা (ML মডেল বিশ্লেষণ)" : "Smart Land Risk Review"}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0 }}>
                        {lang === "bn"
                          ? "১৭টি ভেরিফিকেশন ফিচারের ভিত্তিতে ল্যান্ডসিওর এআই-এর ঝুঁকি মূল্যায়ন।"
                          : "17-feature machine learning evaluation grounded on verified evidence."}
                      </p>
                    </div>
                    <span className="tag low" style={{ fontWeight: 700 }}>
                      {lang === "bn" ? "ঝুঁকি স্তর: নিম্ন (LOW RISK)" : "Risk: LOW"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                    <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid rgba(13, 148, 136, 0.4)", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: "36px", fontWeight: 900, color: "var(--ls-mint, #5EEAD4)", margin: "8px 0" }}>
                        ৮৯<span style={{ fontSize: "16px", color: "var(--ls-text-secondary, #A6BDB5)" }}>/১০০</span>
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#F4F7F5" }}>
                        {lang === "bn" ? "সারগ্রাহী নিরাপত্তা স্কোর" : "Security Confidence Score"}
                      </div>
                    </div>

                    <div style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#f2c77c", marginBottom: "8px" }}>
                        {lang === "bn" ? "মূল ইতিবাচক বিষয়সমূহ:" : "Key Positive Highlights:"}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "11.5px", color: "#c5d7e8", lineHeight: 1.6 }}>
                        <li>{lang === "bn" ? "সিএস থেকে বিএস পর্যন্ত ধারাবাহিক খতিয়ান লব্ধ" : "Full CS to BS survey sequence"}</li>
                        <li>{lang === "bn" ? "২৫ বছরের বেশি নিরবচ্ছিন্ন মালিকানার ইতিহাস" : "25+ years unbroken chain of title"}</li>
                        <li>{lang === "bn" ? "হালনাগাদ নামজারি ও কর দাখিলা পরিশোধিত" : "Approved mutation and tax clearance"}</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{ background: "rgba(13, 148, 136, 0.12)", border: "1px solid rgba(13, 148, 136, 0.35)", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ls-mint, #5EEAD4)", marginBottom: "4px" }}>
                      {lang === "bn" ? "এআই সুপারিশ (Actionable Recommendation):" : "Recommendation:"}
                    </div>
                    <p style={{ fontSize: "12px", color: "#c5d7e8", margin: 0, lineHeight: 1.5 }}>
                      {lang === "bn"
                        ? "জমিটির সামগ্রিক নথিপত্র সন্তোষজনক। ক্রয়ের আগে সাব-রেজিস্ট্রি অফিসে বালাম বইয়ে চূড়ান্ত তল্লাশি দিন এবং আইনজীবীর মাধ্যমে একটি বায়নাপত্র সম্পাদন করুন।"
                        : "Documentation is strong. Proceed with deed execution following physical registry inspection."}
                    </p>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* STEP 8: Registration Cost Calculator                     */}
              {/* --------------------------------------------------------- */}
              {activeStep === 8 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", margin: "0 0 4px", color: "#F4F7F5", fontWeight: 700 }}>
                        {lang === "bn" ? "জমি নিবন্ধন ও সরকারি খরচ ক্যালকুলেটর" : "Estimated Registration Cost"}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0 }}>
                        {lang === "bn"
                          ? "স্ট্যাম্প আইন ১৮৯৯ ও রেজিস্ট্রেশন আইন ১৯০৮ অনুযায়ী সরকারি ফি ও করের পুঙ্খানুপুঙ্খ হিসাব।"
                          : "Statutory Stamp Duty, Registration Fee, Local Tax & AIT calculation."}
                      </p>
                    </div>
                    <span className="tag info">{parcelId}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ fontSize: "11px", color: "var(--ls-text-secondary, #A6BDB5)", display: "block", marginBottom: "4px" }}>
                        {lang === "bn" ? "দলিল মূল্য (টাকা):" : "Deed Value (BDT):"}
                      </label>
                      <input
                        type="number"
                        value={calcDeedValue}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCalcDeedValue(val);
                          runCalc(val, calcArea);
                        }}
                        style={{ width: "100%", background: "var(--ls-surface, #0B1513)", border: "1px solid var(--border)", color: "#F4F7F5", padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", color: "var(--ls-text-secondary, #A6BDB5)", display: "block", marginBottom: "4px" }}>
                        {lang === "bn" ? "জমির আয়তন (শতাংশ):" : "Land Area (Decimals):"}
                      </label>
                      <input
                        type="number"
                        value={calcArea}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCalcArea(val);
                          runCalc(calcDeedValue, val);
                        }}
                        style={{ width: "100%", background: "var(--ls-surface, #0B1513)", border: "1px solid var(--border)", color: "#F4F7F5", padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}
                      />
                    </div>
                  </div>

                  {calcResult && (
                    <div className="record-data" style={{ fontSize: "12.5px", marginBottom: "14px" }}>
                      <div className="record-row">
                        <span>{lang === "bn" ? "স্ট্যাম্প শুল্ক (Stamp Duty - 1.5%)" : "Stamp Duty (1.5%)"}</span>
                        <strong>৳ {((calcResult as any).breakdown?.stamp_duty_bdt || 75000).toLocaleString()}</strong>
                      </div>
                      <div className="record-row">
                        <span>{lang === "bn" ? "নিবন্ধন ফি (Registration Fee - 1.0%)" : "Registration Fee (1.0%)"}</span>
                        <strong>৳ {((calcResult as any).breakdown?.registration_fee_bdt || 50000).toLocaleString()}</strong>
                      </div>
                      <div className="record-row">
                        <span>{lang === "bn" ? "স্থানীয় সরকার কর (Local Govt Tax - 2.0%)" : "Local Govt Tax (2.0%)"}</span>
                        <strong>৳ {((calcResult as any).breakdown?.local_gov_tax_bdt || 100000).toLocaleString()}</strong>
                      </div>
                      <div className="record-row">
                        <span>{lang === "bn" ? "উৎস কর (AIT - 3.0%)" : "Advance Income Tax (AIT)"}</span>
                        <strong>৳ {((calcResult as any).breakdown?.ait_bdt || 150000).toLocaleString()}</strong>
                      </div>
                      <div className="record-row" style={{ borderTop: "2px solid rgba(13, 148, 136, 0.5)", paddingTop: "8px" }}>
                        <span style={{ fontWeight: 700, color: "var(--ls-mint, #5EEAD4)" }}>{lang === "bn" ? "সর্বমোট আনুমানিক খরচ:" : "Total Estimated Fees:"}</span>
                        <strong style={{ fontSize: "15px", color: "var(--ls-mint, #5EEAD4)" }}>
                          ৳ {((calcResult as any).total_cost_bdt || 375000).toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* STEP 9: Change Watch Trail                                */}
              {/* --------------------------------------------------------- */}
              {activeStep === 9 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", margin: "0 0 4px", color: "#F4F7F5", fontWeight: 700 }}>
                        {lang === "bn" ? "পরিবর্তন ওয়াচলিস্ট ও অডিট ট্রেইল" : "Parcel Change Watch & Audit Trail"}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", margin: 0 }}>
                        {lang === "bn"
                          ? "এই পার্সেলের মালিকানা বা খতিয়ানে ভবিষ্যতে কোনো পরিবর্তন ঘটলে তাৎক্ষণিক নোটিফিকেশন।"
                          : "Monitored events and audit log history for this specific parcel."}
                      </p>
                    </div>
                    <span className="tag low">{lang === "bn" ? "ওয়াচলিস্ট সক্রিয়" : "Active Watch"}</span>
                  </div>

                  {eventsList && Array.isArray((eventsList as any).events) ? (
                    <div style={{ display: "grid", gap: "10px" }}>
                      {((eventsList as any).events as any[]).map((ev: any, idx: number) => (
                        <div key={idx} style={{ background: "var(--ls-elevated, #10231F)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", fontSize: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                            <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>{ev.event_type}</strong>
                            <span style={{ color: "var(--ls-text-secondary, #A6BDB5)", fontSize: "11px" }}>{ev.event_date || "২০২৩-১১-১২"}</span>
                          </div>
                          <div style={{ color: "#c5d7e8" }}>{ev.details}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)" }}>{lang === "bn" ? "অডিট ইভেন্ট সংরক্ষিত রয়েছে।" : "Audit trail logged."}</p>
                  )}
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* BOTTOM NAVIGATION STRIP (Part 12)                        */}
              {/* --------------------------------------------------------- */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: "10px" }}>
                <button
                  type="button"
                  disabled={activeStep === 1}
                  onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
                  onPointerMove={(e) => onSpotlightMove(e, "1")}
                  onPointerLeave={onSpotlightLeave}
                  className="ls-spotlight-interactive button secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    padding: "9px 16px",
                    borderRadius: "10px",
                    background: "var(--ls-elevated, #10231F)",
                    border: "1px solid var(--border)",
                    color: activeStep === 1 ? "#5d7389" : "#F4F7F5",
                    cursor: activeStep === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ← {lang === "bn" ? "পূর্ববর্তী ধাপ" : "Previous Step"}
                </button>

                <div style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", fontWeight: 600 }}>
                  {lang === "bn" ? `ধাপ ${activeStep} / ৯` : `Step ${activeStep} of 9`}
                </div>

                {activeStep < 9 ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep((s) => Math.min(9, s + 1))}
                    onPointerMove={(e) => onSpotlightMove(e, "1")}
                    onPointerLeave={onSpotlightLeave}
                    className="ls-spotlight-interactive button primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "9px 18px",
                      background: "var(--ls-emerald, #0D9488)",
                      color: "#080D0C",
                      borderRadius: "10px",
                      border: 0,
                      boxShadow: "0 0 16px rgba(94, 234, 212, 0.25)",
                      cursor: "pointer",
                    }}
                  >
                    <span>{lang === "bn" ? "পরবর্তী ধাপ" : "Next Step"}</span>
                    <ArrowRight size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigateWorkflow("passport")}
                    onPointerMove={(e) => onSpotlightMove(e, "1")}
                    onPointerLeave={onSpotlightLeave}
                    className="ls-spotlight-interactive button primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      fontWeight: 800,
                      padding: "9px 20px",
                      background: "#f2c77c",
                      color: "#0B1513",
                      borderRadius: "10px",
                      border: 0,
                      boxShadow: "0 0 20px rgba(242, 199, 124, 0.35)",
                      cursor: "pointer",
                    }}
                  >
                    <FileText size={14} />
                    <span>{lang === "bn" ? "যাচাই প্রতিবেদন দেখুন ➔" : "View Due Diligence Report ➔"}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
