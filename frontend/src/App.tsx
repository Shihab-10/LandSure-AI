import { useEffect, useState, useRef } from "react";
import {
  Activity, ArrowRight, Bot, Building2, CheckCircle2,
  ChevronRight, CircleAlert, CircleHelp, Database,
  Download, FileCheck2, FileSearch, FileText, Fingerprint,
  Globe2, History, LayoutDashboard, LockKeyhole, LogOut,
  MapPinned, Menu, Scale, Search, Send, ShieldAlert,
  ShieldCheck, Sparkles, X, Calculator, Bell,
  Mic, MicOff, Volume2, Square, MessageSquare, AlertTriangle,
  Eye, EyeOff, Calendar, Clock
} from "lucide-react";
import {
  apiRequest,
  fetchCurrentUser,
  loginUser,
  loginDemoUser,
  type AuthUser,
  API_URL,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  isJwtExpired,
  decodeJwtUser,
} from "./api";
import { BangladeshMap } from "./components/BangladeshMap";
import { DocumentIntelligence } from "./components/DocumentIntelligence";
import { BuyerJourney } from "./components/BuyerJourney";
import { NearbyLandAlternatives } from "./components/NearbyLandAlternatives";

const navigation = [
  { id: "dashboard", labelBn: "আমার জমি (ওভারভিউ)", labelEn: "My Land (Overview)", icon: LayoutDashboard },
  { id: "explorer", labelBn: "জমি খুঁজুন (পার্সেল অনুসন্ধান)", labelEn: "Find Land (Search & Map)", icon: MapPinned },
  { id: "verification", labelBn: "জমি যাচাই (স্মার্ট ভেরিফিকেশন)", labelEn: "Land Verification & Risk", icon: ShieldAlert },
  { id: "documents", labelBn: "দলিল পরীক্ষা ও ওসিআর", labelEn: "Deed Review & OCR", icon: FileCheck2 },
  { id: "copilot", labelBn: "ভূমি সহকারী (এআই সহকারী)", labelEn: "Land Assistant (AI Copilot)", icon: Bot },
  { id: "lawyers", labelBn: "আইনজীবীর পরামর্শ (সংযোগ)", labelEn: "Lawyer Consultation", icon: Scale },
  { id: "passport", labelBn: "যাচাই প্রতিবেদন (রিপোর্ট)", labelEn: "Verification Report", icon: FileText }
] as const;

type Page =
  | typeof navigation[number]["id"]
  | "overview"
  | "search"
  | "journey"
  | "ownership"
  | "tax_calc"
  | "watchlist";

type Evidence = {
  source_table: string;
  source_record_id: string | number;
  data: Record<string, unknown>;
};

type CopilotResult = {
  status: string;
  topic?: string | null;
  answer: string;
  evidence?: Evidence[];
  parcel_id?: string;
  answer_type?: string;
  gemini_used?: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: Evidence[];
  status?: string;
  answerType?: string;
  geminiUsed?: boolean;
  timestamp: string;
};

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [mobileMenu, setMobileMenu] = useState(false);

  // Authentication & Persistent Session
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const isLoggingInRef = useRef(false);

  const [token, setToken] = useState<string>(() => {
    try {
      const t = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
      if (t && isJwtExpired(t)) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        return "";
      }
      return t;
    } catch {
      return "";
    }
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const t = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
      if (!t || isJwtExpired(t)) return null;
      const savedUserStr = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUserStr) {
        try {
          return JSON.parse(savedUserStr);
        } catch {
          // fallback to JWT payload
        }
      }
      return decodeJwtUser(t);
    } catch {
      return null;
    }
  });

  const [loginError, setLoginError] = useState("");
  const [demoStatus, setDemoStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function updateToken(newToken: string, newUser?: AuthUser | null) {
    setToken(newToken);
    try {
      if (newToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        if (newUser) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        }
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors in private/restricted environments
    }
    if (newUser !== undefined) {
      setUser(newUser);
    }
  }

  // Target Parcel Workspace (Persistent Context across all features)
  const [parcelId, setParcelId] = useState<string>(() => {
    try {
      return localStorage.getItem("landsure_selected_parcel_id") || "LS-PARCEL-000001";
    } catch {
      return "LS-PARCEL-000001";
    }
  });
  const [parcelDetails, setParcelDetails] = useState<Record<string, unknown> | null>(null);

  function selectParcel(newId: string) {
    const cleanId = newId.trim().toUpperCase();
    if (!cleanId) return;

    // Immediately clear stale data across all modules to prevent data bleed
    setParcelDetails(null);
    setMlReview(null);
    setGapNav(null);
    setSurveyComp(null);
    setOwnershipChain(null);
    setMutationsList(null);
    setDocsList(null);
    setTaxVerif(null);
    setEventsList(null);
    setCopilotResult(null);

    setParcelId(cleanId);
    try {
      localStorage.setItem("landsure_selected_parcel_id", cleanId);
    } catch {
      // Ignore storage access errors
    }

    if (token) {
      apiRequest<{ parcel?: Record<string, unknown> }>(`/api/v1/parcels/${encodeURIComponent(cleanId)}`, { token })
        .then(d => setParcelDetails(d.parcel ?? d))
        .catch(() => null);
    }
  }

  function navigateTo(target: string) {
    if (target === "overview") setPage("dashboard");
    else if (target === "search") setPage("explorer");
    else if (target === "journey") setPage("verification");
    else setPage(target as Page);
  }

  // Data states for core features
  const [readyStatus, setReadyStatus] = useState<Record<string, unknown> | null>(null);
  const [mlReview, setMlReview] = useState<Record<string, unknown> | null>(null);
  const [gapNav, setGapNav] = useState<Record<string, unknown> | null>(null);
  const [surveyComp, setSurveyComp] = useState<Record<string, unknown> | null>(null);
  const [ownershipChain, setOwnershipChain] = useState<Record<string, unknown> | null>(null);
  const [mutationsList, setMutationsList] = useState<Record<string, unknown> | null>(null);
  const [docsList, setDocsList] = useState<Record<string, unknown> | null>(null);
  const [ocrStatus, setOcrStatus] = useState<Record<string, unknown> | null>(null);
  const [taxVerif, setTaxVerif] = useState<Record<string, unknown> | null>(null);
  const [eventsList, setEventsList] = useState<Record<string, unknown> | null>(null);
  const [lawyersList, setLawyersList] = useState<Array<Record<string, unknown>>>([]);
  const [lawyerLocationFilter, setLawyerLocationFilter] = useState("");
  const [selectedLawyerSlots, setSelectedLawyerSlots] = useState<{ lawyerId: string; slots: Array<Record<string, unknown>> } | null>(null);

  // Lawyer Consultation Demonstration Bookings
  const [myBookings, setMyBookings] = useState<Array<Record<string, unknown>>>([]);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Parcel Change Watchlist & In-App Notifications
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const u = user?.username || "demo-visitor";
      const saved = localStorage.getItem(`landsure_watchlist_${u}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [watchedEvents, setWatchedEvents] = useState<Array<Record<string, unknown>>>([]);

  // Calculator State
  const [calcDeedValue, setCalcDeedValue] = useState(5000000);
  const [calcArea, setCalcArea] = useState(5.0);
  const [calcLocation, setCalcLocation] = useState<"dhaka_ctg_city" | "other_city_corporation" | "pourashava" | "union_parishad">("dhaka_ctg_city");
  const [calcResidential, setCalcResidential] = useState(true);
  const [calcResult, setCalcResult] = useState<Record<string, unknown> | null>(null);

  // Copilot Chat
  const [question, setQuestion] = useState("এই জমির নামজারি ও জরিপের অবস্থা কী?");
  const [copilotResult, setCopilotResult] = useState<CopilotResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Load readiness status on mount
  useEffect(() => {
    apiRequest<Record<string, unknown>>("/api/v1/ready")
      .then(setReadyStatus)
      .catch(() => {
        // Fallback to health if ready is degraded
        apiRequest<Record<string, unknown>>("/api/v1/health")
          .then(setReadyStatus)
          .catch(() => null);
      });
  }, []);

  // Background session sync (re-verifies valid token; gracefully resets if 401/403)
  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchCurrentUser(token)
      .then(u => {
        if (active) {
          setUser(u);
          try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("401") || msg.includes("403") || msg.includes("credentials")) {
          updateToken("");
          setUser(null);
        }
      });
    return () => { active = false; };
  }, [token]);

  // Sync user-specific watchlist from localStorage
  useEffect(() => {
    const u = user?.username || "demo-visitor";
    try {
      const saved = localStorage.getItem(`landsure_watchlist_${u}`);
      if (saved) {
        setWatchlist(JSON.parse(saved));
      } else {
        setWatchlist([]);
      }
    } catch {
      // ignore
    }
  }, [user?.username]);

  // Load parcel data when parcelId or page changes
  useEffect(() => {
    if (!token || !parcelId.trim()) return;
    const cleanId = parcelId.trim().toUpperCase();

    // Always keep current parcel details fresh
    apiRequest<{ parcel?: Record<string, unknown> }>(`/api/v1/parcels/${cleanId}`, { token })
      .then(data => setParcelDetails(data.parcel ?? data))
      .catch(() => null);

    if (page === "verification" || page === "journey") {
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/ml-review`, { token })
        .then(setMlReview)
        .catch(() => null);
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/gap-navigator`, { token })
        .then(setGapNav)
        .catch(() => null);
    } else if (page === "ownership") {
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/survey-comparison`, { token })
        .then(setSurveyComp)
        .catch(() => null);
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/ownership-chain`, { token })
        .then(setOwnershipChain)
        .catch(() => null);
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/mutations`, { token })
        .then(setMutationsList)
        .catch(() => null);
    } else if (page === "documents") {
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/documents`, { token })
        .then(setDocsList)
        .catch(() => null);
      apiRequest<Record<string, unknown>>(`/api/v1/documents/ocr/status`)
        .then(setOcrStatus)
        .catch(() => null);
    } else if (page === "tax_calc") {
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/tax-verification`, { token })
        .then(setTaxVerif)
        .catch(() => null);
      runRegistrationCalculation();
    } else if (page === "lawyers") {
      loadLawyers();
      loadMyBookings();
    } else if (page === "watchlist") {
      apiRequest<Record<string, unknown>>(`/api/v1/parcels/${cleanId}/events`, { token })
        .then(setEventsList)
        .catch(() => null);
      loadWatchlistEvents();
    }
  }, [page, token, parcelId]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setLoginError("");
    setBusy(true);
    try {
      const res = await loginUser(username.trim(), password);
      updateToken(res.token, res.user);
      setPassword("");
      setPage("explorer");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function loginDemo() {
    if (isLoggingInRef.current || busy) return;
    isLoggingInRef.current = true;
    setLoginError("");
    setDemoStatus(lang === "bn" ? "ডেমো সেশন প্রস্তুত হচ্ছে..." : "Initializing demo session...");
    setBusy(true);
    try {
      const res = await loginDemoUser((statusMsg) => {
        setDemoStatus(statusMsg);
      });
      updateToken(res.token, res.user);
      setPage("explorer");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Demo authentication failed");
    } finally {
      setBusy(false);
      setDemoStatus("");
      isLoggingInRef.current = false;
    }
  }

  function logout() {
    updateToken("");
    setUser(null);
    setParcelDetails(null);
    setCopilotResult(null);
    setLoginError("");
    setError("");
  }

  async function askCopilot(queryText?: string | React.FormEvent) {
    if (typeof queryText === "object" && "preventDefault" in queryText) {
      queryText.preventDefault();
    }
    const q = (typeof queryText === "string" ? queryText : question).trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setQuestion("");
    setBusy(true);
    setError("");

    try {
      const data = await apiRequest<CopilotResult & { answer_type?: string; gemini_used?: boolean }>("/api/v1/copilot/evidence", {
        method: "POST",
        token,
        body: JSON.stringify({
          question: q,
          parcel_id: parcelId.trim() || null,
          history: newHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
          language: lang,
        }),
      });

      setCopilotResult(data);
      const assistantMsg: ChatMessage = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: data.answer,
        evidence: data.evidence,
        status: data.status,
        answerType: data.answer_type,
        geminiUsed: data.gemini_used,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copilot request failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        lang === "bn"
          ? "এই ব্রাউজারে ভয়েস রিকগনিশন সমর্থিত নয়। অনুগ্রহ করে টাইপ করুন।"
          : "Voice recognition is not supported in this browser. Please type your query."
      );
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    setSpeechError(null);
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === "bn" ? "bn-BD" : "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join("");
        setQuestion(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed") {
          setSpeechError(
            lang === "bn"
              ? "মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি।"
              : "Microphone access denied."
          );
        } else if (event.error !== "no-speech") {
          setSpeechError(
            lang === "bn"
              ? `ভয়েস ত্রুটি: ${event.error}`
              : `Speech recognition error: ${event.error}`
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      setSpeechError(err instanceof Error ? err.message : "Failed to start speech input");
    }
  }

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }

  async function runRegistrationCalculation() {
    try {
      const data = await apiRequest<Record<string, unknown>>("/api/v1/calculator/registration-cost", {
        method: "POST",
        body: JSON.stringify({
          deed_value_bdt: calcDeedValue,
          area_decimal: calcArea,
          location_category: calcLocation,
          is_residential: calcResidential
        })
      });
      setCalcResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    }
  }

  async function loadLawyers(loc?: string) {
    try {
      const query = loc ? `?location=${encodeURIComponent(loc)}` : "";
      const data = await apiRequest<{ lawyers?: Array<Record<string, unknown>> }>(`/api/v1/legal-experts${query}`, { token });
      setLawyersList(data.lawyers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load legal experts");
    }
  }

  async function viewLawyerSlots(lawyerId: string) {
    try {
      const data = await apiRequest<{ availability?: Array<Record<string, unknown>> }>(`/api/v1/legal-experts/${lawyerId}/availability`, { token });
      setSelectedLawyerSlots({ lawyerId, slots: data.availability || [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slots");
    }
  }

  async function loadMyBookings() {
    if (!token) return;
    try {
      const data = await apiRequest<{ bookings?: Array<Record<string, unknown>> }>("/api/v1/legal-bookings/my-bookings", { token });
      setMyBookings(data.bookings || []);
    } catch {
      // Ignore
    }
  }

  async function bookSlot(lawyerId: string, availabilityId: string, mode: "CHAT" | "DEMO_CALL" = "CHAT") {
    if (!token) return;
    setBookingInProgress(true);
    setBookingSuccessMsg(null);
    try {
      const res = await apiRequest<Record<string, unknown>>("/api/v1/legal-bookings", {
        method: "POST",
        token,
        body: JSON.stringify({
          lawyer_id: lawyerId,
          availability_id: availabilityId,
          consultation_mode: mode,
          parcel_id: parcelId || undefined
        })
      });
      setBookingSuccessMsg(lang === "bn" ? `ডেমো পরামর্শ সফলভাবে সংরক্ষিত হয়েছে! রেফারেন্স: ${res.request_id}` : `Demo consultation confirmed! Ref: ${res.request_id}`);
      await viewLawyerSlots(lawyerId);
      await loadMyBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBookingInProgress(false);
    }
  }

  async function cancelBooking(requestId: string) {
    if (!token) return;
    try {
      await apiRequest<Record<string, unknown>>(`/api/v1/legal-bookings/${requestId}/cancel`, {
        method: "POST",
        token
      });
      await loadMyBookings();
      if (selectedLawyerSlots) {
        await viewLawyerSlots(selectedLawyerSlots.lawyerId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  function toggleWatchlist(pid: string) {
    const clean = pid.trim().toUpperCase();
    if (!clean) return;
    const u = user?.username || "demo-visitor";
    setWatchlist((prev) => {
      const next = prev.includes(clean) ? prev.filter(x => x !== clean) : [...prev, clean];
      try {
        localStorage.setItem(`landsure_watchlist_${u}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function loadWatchlistEvents() {
    if (!token || watchlist.length === 0) return;
    try {
      const allEvents: Array<Record<string, unknown>> = [];
      const seenEventIds = new Set<string>();
      for (const pid of watchlist.slice(0, 5)) {
        const d = await apiRequest<{ events?: Array<Record<string, unknown>> }>(`/api/v1/parcels/${encodeURIComponent(pid)}/events`, { token });
        if (Array.isArray(d.events)) {
          for (const ev of d.events) {
            const eid = String(ev.event_id || `${pid}-${ev.event_date}`);
            if (!seenEventIds.has(eid)) {
              seenEventIds.add(eid);
              allEvents.push({ ...ev, parcel_id: pid });
            }
          }
        }
      }
      setWatchedEvents(allEvents);
    } catch {
      // Ignore
    }
  }

  function downloadPassportPdf() {
    if (!token || !parcelId.trim()) return;
    const url = `${API_URL}/api/v1/parcels/${encodeURIComponent(parcelId.trim())}/trust-passport`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("PDF download failed");
        return res.blob();
      })
      .then(blob => {
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = `${parcelId.trim()}_Trust_Passport.pdf`;
        link.click();
      })
      .catch(err => setError(err instanceof Error ? err.message : "Download failed"));
  }

  const authenticated = Boolean(token && user);

  if (!authenticated) {
    return (
      <div className="login-screen">
        <div className="login-glow" />
        <div className="login-card" style={{ maxWidth: "480px" }}>
          {/* Top Brand Header & Language Toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div className="brand large" style={{ margin: 0, padding: 0 }}>
              <div className="brand-mark"><Fingerprint size={26}/></div>
              <div>LandSure <span>AI</span></div>
            </div>
            <button
              type="button"
              className="lang-toggle-btn"
              onClick={() => setLang(lang === "bn" ? "en" : "bn")}
              style={{
                background: "#162b3c",
                color: "#7ce3d0",
                border: "1px solid #285461",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {lang === "bn" ? "English" : "বাংলা"}
            </button>
          </div>

          <div className="login-icon"><Sparkles size={25}/></div>
          <h1 style={{ fontSize: "24px", lineHeight: "1.3", marginBottom: "10px" }}>
            {lang === "bn" ? "জমি যাচাই প্ল্যাটফর্মে স্বাগতম" : "Welcome to LandSure AI"}
          </h1>
          <p style={{ fontSize: "13px", color: "#90a9bc", lineHeight: "1.7", marginBottom: "24px" }}>
            {lang === "bn"
              ? "বাংলাদেশের জমি ক্রয়ের পূর্বে সিএস, এসএ, আরএস খতিয়ান, নামজারি ও মালিকানা স্বত্ব যাচাইয়ের নির্ভরযোগ্য এআই প্ল্যাটফর্ম।"
              : "Evidence-linked pre-purchase land verification and cross-survey title examination for Bangladesh."}
          </p>

          {/* Error Message with Bengali Guidance */}
          {loginError && (
            <div className="error" style={{ marginBottom: "18px", padding: "12px 14px", borderRadius: "10px", background: "#39181c", border: "1px solid #842e39", color: "#fca5a5", fontSize: "12px", lineHeight: "1.6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, marginBottom: "4px" }}>
                <CircleAlert size={16}/>
                <span>{lang === "bn" ? "সার্ভার সংযোগ সতর্কতা" : "Connection Notice"}</span>
              </div>
              <div>{loginError}</div>
              <div style={{ marginTop: "8px", fontSize: "11px", color: "#fecaca" }}>
                {lang === "bn"
                  ? "পরামর্শ: ব্যাকএন্ড সার্ভার চালু হতে কয়েক সেকেন্ড সময় লাগতে পারে। অনুগ্রহ করে নিচে আবার ক্লিক করে চেষ্টা করুন।"
                  : "Tip: Backend server might be starting up. Please click below to retry."}
              </div>
            </div>
          )}

          {/* Primary Action: One-Click Demo Entry ("জমি যাচাই শুরু করুন") */}
          <button
            type="button"
            className="demo-btn primary-demo"
            disabled={busy}
            onClick={loginDemo}
            style={{
              background: "linear-gradient(135deg, #26cba8, #0ea387)",
              color: "#051f1c",
              border: 0,
              borderRadius: "11px",
              padding: "16px 20px",
              fontWeight: 800,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              width: "100%",
              boxShadow: "0 6px 25px rgba(38, 203, 168, 0.35)",
              cursor: busy ? "not-allowed" : "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <Sparkles size={18}/>
            <span>
              {busy && demoStatus
                ? demoStatus
                : (lang === "bn" ? "জমি যাচাই শুরু করুন (এক-ক্লিক ডেমো প্রবেশ) ➔" : "Start Land Verification (One-Click Demo) ➔")}
            </span>
          </button>

          {/* Clear Guest Value Badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginTop: "16px", fontSize: "11px", color: "#8da2b7", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle2 size={13} style={{ color: "#5ee6cb" }}/>
              {lang === "bn" ? "পাসওয়ার্ড বা ওটিপি ছাড়া প্রবেশ" : "No password or OTP"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <ShieldCheck size={13} style={{ color: "#5ee6cb" }}/>
              {lang === "bn" ? "সুরক্ষিত স্যান্ডবক্স" : "Protected Sandbox"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Database size={13} style={{ color: "#5ee6cb" }}/>
              {lang === "bn" ? "৭০০টি প্রদর্শনী পার্সেল" : "700 Parcels"}
            </span>
          </div>

          {/* Secondary Collapsible Staff Login */}
          <details style={{ marginTop: "24px", borderTop: "1px solid #1f3347", paddingTop: "14px" }}>
            <summary style={{ cursor: "pointer", fontSize: "11px", color: "#627d92", textAlign: "center", userSelect: "none" }}>
              {lang === "bn" ? "অ্যাডমিন বা কর্মকর্তা লগইন (পাসওয়ার্ডসহ)" : "Staff / Admin Sign In (with password)"}
            </summary>
            <form onSubmit={login} style={{ marginTop: "14px" }}>
              <label style={{ fontSize: "11px", color: "#90a9bc", display: "block", marginBottom: "4px" }}>
                {lang === "bn" ? "ব্যবহারকারীর নাম" : "Username"}
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin or reviewer"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#0d1724", border: "1px solid #23374d", color: "#e7eef8", fontSize: "13px", marginBottom: "10px" }}
              />
              <label style={{ fontSize: "11px", color: "#90a9bc", display: "block", marginBottom: "4px" }}>
                {lang === "bn" ? "পাসওয়ার্ড" : "Password"}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#0d1724", border: "1px solid #23374d", color: "#e7eef8", fontSize: "13px", marginBottom: "14px" }}
              />
              <button
                type="submit"
                className="secondary full"
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "#182a3c",
                  color: "#9fc1d8",
                  border: "1px solid #284763",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? (lang === "bn" ? "যাচাই হচ্ছে..." : "Signing in...") : (lang === "bn" ? "সাইন ইন করুন" : "Sign in")}
              </button>
            </form>
          </details>

          <div className="login-footer" style={{ marginTop: "20px" }}>
            <ShieldCheck size={14}/> JWT-secured · 700 Synthetic Parcels · Read-Only Sandbox
          </div>
        </div>
      </div>
    );
  }

  const activeNavItem = navigation.find(n => n.id === page);

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Fingerprint size={24}/></div>
          <div>LandSure <span>AI</span><small>LAND INTELLIGENCE</small></div>
        </div>

        <div className="workspace-label">{lang === "bn" ? "মূল নেভিগেশন" : "WORKSPACE MODULES"}</div>
        <nav>
          {navigation.map(item => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => { setPage(item.id); setMobileMenu(false); }}
              >
                <Icon size={18}/>
                <span>{lang === "bn" ? item.labelBn : item.labelEn}</span>
                {active && <ChevronRight size={14} className="nav-arrow"/>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <ShieldCheck size={20}/>
            <strong>{lang === "bn" ? "প্রমাণভিত্তিক যাচাই" : "Evidence First"}</strong>
            <span>{lang === "bn" ? "সিএস, এসএ, আরএস ও বিএস রেকর্ডের সমন্বিত যাচাই।" : "Transparent cross-survey and mutation evidence."}</span>
          </div>
          <div className="profile">
            <div className="avatar">{user?.username.slice(0, 2).toUpperCase() || "LS"}</div>
            <div className="profile-name">
              <strong>{user?.username || "Workspace User"}</strong>
              <span>{user?.role === "demo" ? "ডেমো সেশন (Demo Mode)" : `${user?.role} access`}</span>
            </div>
            <button title="Log out" className="icon-button" onClick={logout}><LogOut size={16}/></button>
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />
      )}

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu size={22}/></button>
          <div className="breadcrumb">
            <span>LandSure AI</span> <ChevronRight size={14}/>
            <strong>{lang === "bn" ? activeNavItem?.labelBn : activeNavItem?.labelEn}</strong>
          </div>
          <div className="topbar-right">
            {/* Active Selected Parcel Badge */}
            <button
              onClick={() => navigateTo("search")}
              title={lang === "bn" ? "পার্সেল পরিবর্তন করতে ক্লিক করুন" : "Click to select a different parcel"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                background: "#0c1b2c",
                border: "1px solid #1c3b57",
                borderRadius: "20px",
                padding: "6px 12px",
                color: "#5ee6cb",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600
              }}
            >
              <MapPinned size={14}/>
              <span>{parcelId}</span>
              <span style={{ color: "#7189a0", fontWeight: 400 }}>|</span>
              <span style={{ color: "#d2e3f5", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 400 }}>
                {String(parcelDetails?.display_name_bn || parcelDetails?.display_name_en || (lang === "bn" ? "বিরুলিয়া আবাসিক জমি" : "Birulia Residential"))}
              </span>
            </button>

            {/* Watchlist & Change Watch Notification Bell */}
            <button
              onClick={() => setPage("watchlist")}
              title={lang === "bn" ? "পার্সেল ওয়াচলিস্ট ও সাম্প্রতিক পরিবর্তন দেখুন" : "View parcel watchlist and recent changes"}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: page === "watchlist" ? "#1b4d43" : "#0c1b2c",
                border: "1px solid #1c3b57",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                color: page === "watchlist" ? "#5ee6cb" : "#8da2b7",
                cursor: "pointer",
              }}
            >
              <Bell size={16}/>
              {watchlist.length > 0 && (
                <span className="bell-badge" style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-2px",
                  background: "#ff5252",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  padding: "1px 5px",
                  border: "1px solid #0c1827"
                }}>
                  {watchlist.length}
                </span>
              )}
            </button>

            {/* Language Switcher */}
            <button
              className="lang-toggle"
              onClick={() => setLang(l => (l === "bn" ? "en" : "bn"))}
              title="Toggle Language"
            >
              🌐 {lang === "bn" ? "English" : "বাংলা"}
            </button>
            <span className={`environment ${user?.role === "demo" ? "demo" : ""}`}>
              <span className="status-dot"/>
              {user?.role === "demo" ? "ডেমো মোড (700 Parcels)" : "Live API"}
            </span>
            <div className="top-avatar">{user?.username.slice(0, 2).toUpperCase() || "LS"}</div>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="error">{error}</div>}

          {/* 1. OVERVIEW & PARCEL WORKSPACE (STEP 3) */}
          {(page === "dashboard" || page === "overview") && (
            <>
              <div className="eyebrow"><ShieldCheck size={15}/> {lang === "bn" ? "ধাপ ৩ — সহজ জমি ওভারভিউ" : "STEP 3 — LAND OVERVIEW"}</div>
              
              <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <h1 style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span>{String(parcelDetails?.display_name_bn || parcelDetails?.display_name_en || (lang === "bn" ? "বিরুলিয়া আবাসিক জমি" : "Birulia Residential Land"))}</span>
                    <span className="tag info" style={{ fontSize: "14px", padding: "4px 10px" }}>{parcelId}</span>
                  </h1>
                  <p style={{ color: "#8da2b7", marginTop: "4px" }}>
                    {lang === "bn" 
                      ? "নির্বাচিত জমির সারসংক্ষেপ, প্রাথমিক তথ্য এবং যাচাই অগ্রগতি।" 
                      : "Key identification, recorded boundaries, and due diligence verification progress."}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button className="primary" onClick={() => navigateTo("journey")}>
                    {lang === "bn" ? "জমি যাচাই শুরু করুন" : "Start Full Verification"} <ArrowRight size={15}/>
                  </button>
                  <button className="secondary" onClick={() => navigateTo("search")} style={{ background: "#16283b", border: "1px solid #28445f", color: "#e7eef8", padding: "9px 15px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <MapPinned size={15}/> {lang === "bn" ? "মানচিত্রে দেখুন" : "View on Map"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => toggleWatchlist(parcelId)}
                    title={watchlist.includes(parcelId) ? "Remove from watchlist" : "Add to watchlist"}
                    style={{
                      background: watchlist.includes(parcelId) ? "#123d33" : "#16283b",
                      border: watchlist.includes(parcelId) ? "1px solid #1c6d5b" : "1px solid #28445f",
                      color: watchlist.includes(parcelId) ? "#5ee6cb" : "#e7eef8",
                      padding: "9px 15px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                  >
                    {watchlist.includes(parcelId) ? <EyeOff size={15}/> : <Eye size={15}/>}
                    {watchlist.includes(parcelId) ? (lang === "bn" ? "ওয়াচলিস্টে আছে (Watching)" : "Watching") : (lang === "bn" ? "ওয়াচলিস্টে রাখুন" : "Watch Parcel")}
                  </button>
                </div>
              </div>

              {/* The 4 Core Natural Bengali Questions */}
              <div className="grid-2col" style={{ gap: "18px", margin: "20px 0" }}>
                {/* প্রশ্ন ১: এটি কোন জমি? */}
                <div className="panel" style={{ borderLeft: "4px solid #5ee6cb" }}>
                  <div className="panel-title" style={{ color: "#5ee6cb", fontSize: "16px", fontWeight: 700 }}>
                    <Database size={18}/> {lang === "bn" ? "১. এটি কোন জমি?" : "1. What land is this?"}
                  </div>
                  <div className="record-data" style={{ marginTop: "12px" }}>
                    <div className="record-row">
                      <span>{lang === "bn" ? "জমির নাম / বিবরণ" : "Land Label"}</span>
                      <strong>{String(parcelDetails?.display_name_bn || (lang === "bn" ? "বিরুলিয়া আবাসিক জমি" : "Birulia Residential Land"))}</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "জমির শ্রেণি (জমির ধরন)" : "Classification"}</span>
                      <strong><span className="tag low">{String(parcelDetails?.land_classification_bn || parcelDetails?.land_classification || (lang === "bn" ? "নাল জমি (আবাসিক)" : "Nal / Residential"))}</span></strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "খতিয়ান নম্বর" : "Khatian No"}</span>
                      <strong>{String(parcelDetails?.khatian_no || "১২৪ (আরএস) / ৩১৮ (নামজারি)")}</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "দাগ নম্বর" : "Dag No"}</span>
                      <strong>{String(parcelDetails?.dag_no || "১০০৭")}</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "রেকর্ড স্ট্যাটাস" : "Record Status"}</span>
                      <strong><span className="tag info">{lang === "bn" ? "নমুনা রেকর্ড (যাচাইযোগ্য)" : "Demo Record"}</span></strong>
                    </div>
                  </div>
                </div>

                {/* প্রশ্ন ২: জমিটি কোথায়? */}
                <div className="panel" style={{ borderLeft: "4px solid #38bdf8" }}>
                  <div className="panel-title" style={{ color: "#38bdf8", fontSize: "16px", fontWeight: 700 }}>
                    <MapPinned size={18}/> {lang === "bn" ? "২. জমিটি কোথায়?" : "2. Where is it located?"}
                  </div>
                  <div className="record-data" style={{ marginTop: "12px" }}>
                    <div className="record-row">
                      <span>{lang === "bn" ? "জেলা" : "District"}</span>
                      <strong>{String(parcelDetails?.district_name_bn || parcelDetails?.district_code || (lang === "bn" ? "ঢাকা" : "Dhaka"))}</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "উপজেলা" : "Upazila"}</span>
                      <strong>{String(parcelDetails?.upazila_name_bn || parcelDetails?.upazila_code || (lang === "bn" ? "সাভার" : "Savar"))}</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "মৌজা ও জেএল নম্বর" : "Mouza & JL No"}</span>
                      <strong>{String(parcelDetails?.mouza_name_bn || parcelDetails?.mouza_code || (lang === "bn" ? "বিরুলিয়া (জেএল-৪২)" : "Birulia (JL-42)"))}</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "ভৌগোলিক সীমানা" : "Geographic Boundary"}</span>
                      <strong>{lang === "bn" ? "আনুমানিক মৌজা স্থানাঙ্ক প্রস্তুত" : "Coordinates Resolved"}</strong>
                    </div>
                    <div className="record-row" style={{ paddingTop: "8px" }}>
                      <button
                        onClick={() => navigateTo("search")}
                        style={{ background: "transparent", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", padding: 0 }}
                      >
                        🗺️ {lang === "bn" ? "বাংলাদেশ মানচিত্রে এই দাগটি জুম করে দেখুন ➔" : "Zoom to this Dag on Map ➔"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* প্রশ্ন ৩: রেকর্ডে কতটুকু জমি আছে? */}
                <div className="panel" style={{ borderLeft: "4px solid #f2c77c" }}>
                  <div className="panel-title" style={{ color: "#f2c77c", fontSize: "16px", fontWeight: 700 }}>
                    <Scale size={18}/> {lang === "bn" ? "৩. রেকর্ডে কতটুকু জমি আছে?" : "3. How much land in records?"}
                  </div>
                  <div className="record-data" style={{ marginTop: "12px" }}>
                    <div className="record-row">
                      <span>{lang === "bn" ? "রেকর্ডকৃত আয়তন" : "Recorded Area"}</span>
                      <strong style={{ fontSize: "15px", color: "#5ee6cb" }}>
                        {String(parcelDetails?.reference_area_decimal || 10.0)} {lang === "bn" ? "শতাংশ (Decimals)" : "Decimals"}
                      </strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "কাঠা / একর রূপান্তর" : "Katha / Acre"}</span>
                      <strong>~ {((Number(parcelDetails?.reference_area_decimal) || 10) / 1.65).toFixed(2)} {lang === "bn" ? "কাঠা" : "Katha"} ({((Number(parcelDetails?.reference_area_decimal) || 10) / 100).toFixed(2)} {lang === "bn" ? "একর" : "Acre"})</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "সর্বশেষ জরিপ দাগ আয়তন" : "Last Survey Dag Area"}</span>
                      <strong>{String(parcelDetails?.reference_area_decimal || 10.0)} শতাংশ (আরএস রেকর্ড অনুযায়ী)</strong>
                    </div>
                    <div className="record-row">
                      <span>{lang === "bn" ? "আয়তনের মিল" : "Area Consistency"}</span>
                      <strong><span className="tag low">{lang === "bn" ? "সিএস/এসএ/আরএস এ আয়তন সামঞ্জস্যপূর্ণ" : "Consistent across surveys"}</span></strong>
                    </div>
                  </div>
                </div>

                {/* প্রশ্ন ৪: আর কী কী যাচাই করা বাকি? */}
                <div className="panel" style={{ borderLeft: "4px solid #a78bfa" }}>
                  <div className="panel-title" style={{ color: "#a78bfa", fontSize: "16px", fontWeight: 700 }}>
                    <CheckCircle2 size={18}/> {lang === "bn" ? "৪. আর কী কী যাচাই করা বাকি?" : "4. What is left to verify?"}
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
                      <span>{lang === "bn" ? "যাচাই অগ্রগতি: ৪/৬ ধাপ সম্পন্ন" : "Verification Progress: 4/6 Completed"}</span>
                      <strong style={{ color: "#5ee6cb" }}>৬৭%</strong>
                    </div>
                    <div style={{ background: "#081420", borderRadius: "10px", height: "8px", overflow: "hidden", marginBottom: "14px" }}>
                      <div style={{ background: "linear-gradient(90deg, #38bdf8, #5ee6cb)", width: "67%", height: "100%" }} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#5ee6cb" }}>
                        <CheckCircle2 size={15}/> {lang === "bn" ? "খতিয়ান ও জরিপ রেকর্ড মেলানো হয়েছে" : "Khatian & survey records matched"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#5ee6cb" }}>
                        <CheckCircle2 size={15}/> {lang === "bn" ? "মালিকানা ধারাবাহিকতা ২৫ বছর পর্যন্ত ইতিবাচক" : "25+ year title continuity verified"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f2c77c" }}>
                        <AlertTriangle size={15}/> {lang === "bn" ? "সরেজমিনে সীমানা ও দখলদারিত্ব যাচাই আবশ্যক" : "Physical boundary & possession check required"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f2c77c" }}>
                        <AlertTriangle size={15}/> {lang === "bn" ? "সাব-রেজিস্ট্রি বালাম বহিতে মূল দলিল তল্লাশি বাকি" : "Sub-registry volume search pending"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Jump Modules */}
              <div className="section-heading" style={{ marginTop: "32px" }}>
                <h2>{lang === "bn" ? "জমির যাচাই কর্মপ্রবাহ ও সহায়ক টুলসমূহ" : "Land Due Diligence Workflow Tools"}</h2>
                <p>{lang === "bn" ? "একটি ক্লিকেই নির্বাচিত পার্সেলের বিস্তারিত তথ্য ও বিশ্লেষণ দেখুন।" : "Jump straight into connected tools with this selected parcel."}</p>
              </div>

              <div className="actions-grid">
                {[
                  { title: lang === "bn" ? "জমি যাচাই ও ঝুঁকি পরীক্ষা" : "Buyer Journey & Verification", desc: lang === "bn" ? "জরিপ, মালিকানা, নামজারি, খাজনা ও এমএল ঝুঁকির ৯ ধাপের যাচাই।" : "Comprehensive 9-step due diligence workflow.", icon: ShieldAlert, target: "journey" as Page },
                  { title: lang === "bn" ? "মানচিত্র ও সীমানা পরিদর্শন" : "Parcel Map & Geometry", desc: lang === "bn" ? "৬৪ জেলার মানচিত্রে জমির অবস্থান ও রাস্তা সংযোগ।" : "Interactive GIS map with OSM and satellite view.", icon: MapPinned, target: "search" as Page },
                  { title: lang === "bn" ? "মূল দলিল পরীক্ষা ও ওসিআর" : "Deed OCR & Cross-Match", desc: lang === "bn" ? "দলিল আপলোড করে দাগ, খতিয়ান ও মালিক ক্রস-ম্যাচিং।" : "Multi-page deed review with extracted field comparison.", icon: FileCheck2, target: "documents" as Page },
                  { title: lang === "bn" ? "ভূমি সহকারীকে জিজ্ঞাসা করুন" : "Ask AI Land Assistant", desc: lang === "bn" ? "নির্বাচিত পার্সেলের নামজারি, ঝুঁকি বা খরচ নিয়ে এআই প্রশ্ন।" : "Ask parcel questions with SQLite database evidence.", icon: Bot, target: "copilot" as Page },
                  { title: lang === "bn" ? "আইনজীবীর পরামর্শ নিন" : "Consult Verified Lawyers", desc: lang === "bn" ? "জমি বিশেষজ্ঞ বিজ্ঞ আইনজীবীর অ্যাপয়েন্টমেন্ট সূচি।" : "Connect with specialized land counsel.", icon: Scale, target: "lawyers" as Page },
                  { title: lang === "bn" ? "যাচাই প্রতিবেদন ডাউনলোড" : "Download Trust Passport", desc: lang === "bn" ? "সিএস/এসএ/আরএস ও নামজারি সমন্বিত অফিশিয়াল পিডিএফ।" : "Download tamper-evident PDF verification passport.", icon: FileText, target: "passport" as Page },
                ].map(act => {
                  const Icon = act.icon;
                  return (
                    <button className="action-card" key={act.title} onClick={() => navigateTo(act.target)}>
                      <div className="action-icon"><Icon size={22}/></div>
                      <strong>{act.title}</strong>
                      <p>{act.desc}</p>
                      <span>{lang === "bn" ? "প্রবেশ করুন" : "Open Module"} <ArrowRight size={14}/></span>
                    </button>
                  );
                })}
              </div>

              {/* Compact "তথ্যের উৎস ও সীমাবদ্ধতা" section */}
              <div className="panel" style={{ marginTop: "24px", background: "rgba(10, 25, 41, 0.7)", border: "1px solid #1a334d" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <CircleHelp size={18} color="#5ee6cb" style={{ marginTop: "2px", flexShrink: 0 }}/>
                  <div style={{ fontSize: "12px", color: "#8da2b7", lineHeight: "1.7" }}>
                    <strong style={{ color: "#d8e5f0", display: "block", marginBottom: "4px" }}>
                      {lang === "bn" ? "তথ্যের উৎস ও আইনি সীমাবদ্ধতা (Transparency & Disclaimers)" : "Data Provenance & Disclaimers"}
                    </strong>
                    {lang === "bn" ? (
                      <>
                        এই সিস্টেমে প্রদর্শিত রেকর্ডসমূহ জমির প্রাক-ক্রয় যাচাইকরণ পদ্ধতি প্রদর্শনের জন্য প্রস্তুতকৃত নমুনা রেকর্ড (Synthetic Demo Records)। 
                        কৃত্রিম বুদ্ধিমত্তা ও অ্যালগরিদমিক ঝুঁকি বিশ্লেষণ কোনো আইনি নিষ্পত্তি বা মালিকানার চূড়ান্ত ছাড়পত্র নয়। জমি ক্রয়ের পূর্বে সহকারী কমিশনার (ভূমি) অফিস থেকে হালনাগাদ দাখিলা ও খতিয়ান এবং সংশ্লিষ্ট সাব-রেজিস্ট্রি অফিস থেকে বালাম তল্লাশি করে মূল ভলিউম যাচাই করা আবশ্যক।
                      </>
                    ) : (
                      <>
                        All displayed data are demonstration records engineered for pre-purchase due diligence workflows. Machine-learning risk analysis does not constitute a certified legal warranty. Buyers must perform physical land inspection and independently confirm official volumes at the relevant AC Land and Sub-Registry offices.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 2. PARCEL SEARCH & MAP */}
          {page === "explorer" && (
            <>
              <div className="eyebrow"><MapPinned size={15}/> BANGLADESH GIS & PARCEL MAP</div>
              <div className="page-heading">
                <div>
                  <h1>{lang === "bn" ? "বাংলাদেশ জিআইএস ও" : "Bangladesh GIS &"} <span>{lang === "bn" ? "পার্সেল মানচিত্র" : "Parcel Map."}</span></h1>
                  <p>{lang === "bn" ? "৬৪ জেলার ভৌগোলিক মানচিত্র, মৌজা সীমানা ও ডিজিটাল পার্সেল পরিদর্শন।" : "Interactive 64-district Bangladesh GIS, Mouza boundaries, and parcel polygons."}</p>
                </div>
              </div>

              {/* Interactive Leaflet Bangladesh GIS Map */}
              <BangladeshMap
                token={token}
                initialParcelId={parcelId}
                lang={lang}
                onSelectParcel={(newId) => selectParcel(newId)}
                onNavigateWorkflow={(target) => navigateTo(target)}
              />

              {parcelDetails && (
                <div className="grid-2col" style={{ marginTop: "20px" }}>
                  <div className="panel">
                    <div className="panel-title"><Database size={18}/> {lang === "bn" ? "ডিজিটাল পার্সেল পরিচিতি" : "Parcel Metadata"}</div>
                    <div className="record-data">
                      <div className="record-row"><span>Parcel ID</span><strong>{String(parcelDetails.parcel_id)}</strong></div>
                      <div className="record-row"><span>{lang === "bn" ? "জমির নাম / বিবরণ" : "Display Label"}</span><strong>{String(parcelDetails.display_name_bn || parcelDetails.display_name_en || "বিরুলিয়া আবাসিক জমি")}</strong></div>
                      <div className="record-row"><span>{lang === "bn" ? "জেলা" : "District"}</span><strong>{String(parcelDetails.district_name_bn || parcelDetails.district_code || "ঢাকা")}</strong></div>
                      <div className="record-row"><span>{lang === "bn" ? "উপজেলা" : "Upazila"}</span><strong>{String(parcelDetails.upazila_name_bn || parcelDetails.upazila_code || "সাভার")}</strong></div>
                      <div className="record-row"><span>{lang === "bn" ? "মৌজা" : "Mouza"}</span><strong>{String(parcelDetails.mouza_name_bn || parcelDetails.mouza_code || "বিরুলিয়া")}</strong></div>
                      <div className="record-row"><span>{lang === "bn" ? "রেকর্ডকৃত আয়তন" : "Reference Area"}</span><strong>{String(parcelDetails.reference_area_decimal)} শতাংশ (Decimals)</strong></div>
                      <div className="record-row"><span>{lang === "bn" ? "রেকর্ড স্ট্যাটাস" : "Record Status"}</span><strong><span className="tag low">{lang === "bn" ? "নমুনা রেকর্ড (যাচাইযোগ্য)" : String(parcelDetails.record_status)}</span></strong></div>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-title"><Globe2 size={18}/> {lang === "bn" ? "মৌজা ম্যাপ ও সীমানা ভিজ্যুয়ালাইজেশন" : "Mouza Boundary Visualization"}</div>
                    <div style={{ background: "#06101c", padding: "20px", borderRadius: "10px", textAlign: "center", border: "1px solid #1a3044" }}>
                      <svg width="220" height="150" viewBox="0 0 220 150">
                        <polygon points="40,25 180,35 195,120 30,130" fill="#123d33" stroke="#5ee6cb" strokeWidth="2"/>
                        <line x1="15" y1="140" x2="205" y2="135" stroke="#f2c77c" strokeWidth="3" strokeDasharray="5,5"/>
                        <text x="110" y="85" fill="#e7eef8" fontSize="12" fontWeight="bold" textAnchor="middle">{parcelId}</text>
                        <text x="110" y="105" fill="#5ee6cb" fontSize="10" textAnchor="middle">{String(parcelDetails.reference_area_decimal)} Decimals</text>
                        <text x="110" y="148" fill="#f2c77c" fontSize="9" textAnchor="middle">রাস্তা / Road Access Path</text>
                      </svg>
                      <p style={{ fontSize: "11px", color: "#8da2b7", marginTop: "12px", margin: 0 }}>
                        {lang === "bn" ? "জমির আনুমানিক অবস্থান · মৌজা সীমানা ও রাস্তা সংযোগ চিহ্নিত" : "Approximate parcel boundary GIS geometry preview"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2B. BANGLADESH ADMINISTRATIVE LOCATION SEARCH & NEARBY ALTERNATIVES */}
              <NearbyLandAlternatives
                token={token}
                lang={lang}
                currentParcelId={parcelId}
                onSelectParcel={(newId) => selectParcel(newId)}
                onNavigateWorkflow={(target) => navigateTo(target)}
              />
            </>
          )}

          {/* 3. VERIFICATION & BUYER JOURNEY */}
          {(page === "verification" || page === "journey") && (
            <>
              <div className="eyebrow"><ShieldAlert size={15}/> SMART LAND VERIFICATION ENGINE</div>
              <div className="page-heading">
                <div>
                  <h1>{lang === "bn" ? "জমি যাচাই ও" : "Land Buyer Verification &"} <span>{lang === "bn" ? "ক্রয় পূর্ব সতর্কতা" : "Check Before You Buy."}</span></h1>
                  <p>{lang === "bn" ? "জরিপ, ২৫ বছরের মালিকানার ইতিহাস, নামজারি, খাজনা, দখল ও ১৭টি এমএল ফিচারের সমন্বিত বিশ্লেষণ।" : "Unified cross-survey comparison, 25-year title chain, mutation checks, and ML risk evaluation."}</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="primary" onClick={() => navigateTo("passport")}>
                    <FileText size={15}/> {lang === "bn" ? "যাচাই প্রতিবেদন দেখুন" : "View Full Report"}
                  </button>
                </div>
              </div>

              {/* Connected 9-Step Buyer Journey Component */}
              <BuyerJourney
                parcelId={parcelId}
                token={token}
                lang={lang}
                onNavigateWorkflow={(target) => navigateTo(target)}
                onSetCalculatorValues={(val, area) => {
                  setCalcDeedValue(val);
                  setCalcArea(area);
                }}
              />
            </>
          )}

          {/* 4. OWNERSHIP & SURVEY HISTORY */}
          {page === "ownership" && (
            <>
              <div className="eyebrow"><History size={15}/> HISTORICAL SURVEYS & OWNERSHIP CHAIN</div>
              <div className="page-heading">
                <div>
                  <h1>{lang === "bn" ? "মালিকানা ধারাবাহিকতা ও" : "Ownership Chain &"} <span>{lang === "bn" ? "জরিপ টাইম মেশিন" : "Survey History."}</span></h1>
                  <p>{lang === "bn" ? "সিএস, এসএ, আরএস ও বিএস রেকর্ডের তুলনা এবং দ্বৈত বিক্রয় ঝুঁকি যাচাই।" : "Trace title continuity, competing claims, and historical survey transitions."}</p>
                </div>
              </div>

              {/* Ownership Chain */}
              {ownershipChain && (
                <div className="panel section-card">
                  <div className="evidence-detail-top">
                    <div className="action-icon"><ShieldCheck size={20}/></div>
                    <span className={`tag ${ownershipChain.double_selling_risk ? "high" : "low"}`}>
                      {String(ownershipChain.continuity_status)}
                    </span>
                  </div>
                  <h3>{lang === "bn" ? "মালিকানা ধারাবাহিকতা ও দ্বৈত বিক্রয় বিশ্লেষণ" : "Title Chain & Double-Selling Risk"}</h3>
                  <div className="stats-grid" style={{ margin: "16px 0" }}>
                    <div className="stat-card">
                      <div className="stat-top"><span>{lang === "bn" ? "দ্বৈত বিক্রয় ঝুঁকি" : "Double Selling"}</span></div>
                      <strong style={{ color: ownershipChain.double_selling_risk ? "#ff9e9a" : "#5ee6cb" }}>
                        {ownershipChain.double_selling_risk ? "RISK DETECTED" : "NO RISK"}
                      </strong>
                    </div>
                    <div className="stat-card">
                      <div className="stat-top"><span>{lang === "bn" ? "রেকর্ডকৃত লেনদেন" : "Transactions"}</span></div>
                      <strong>{String(ownershipChain.total_recorded_transactions)}</strong>
                    </div>
                    <div className="stat-card">
                      <div className="stat-top"><span>{lang === "bn" ? "সক্রিয় দাবিদার" : "Active Claimants"}</span></div>
                      <strong>{String(ownershipChain.active_claimants_count)}</strong>
                    </div>
                  </div>

                  {Array.isArray(ownershipChain.transactions_timeline) && (
                    <div style={{ marginTop: "16px" }}>
                      <label>{lang === "bn" ? "লেনদেনের সময়রেখা (Deed Timeline)" : "Transaction History"}</label>
                      {ownershipChain.transactions_timeline.map((tx: any, idx: number) => (
                        <div key={idx} className="record-row">
                          <span>{tx.transaction_date || "Date N/A"} · {tx.transaction_type}</span>
                          <strong>
                            {tx.seller_name} ➔ {tx.buyer_name}
                            <span className={`tag ${tx.transaction_status === "COMPETING_CLAIM" ? "high" : "low"}`} style={{ marginLeft: "8px" }}>
                              {tx.transaction_status}
                            </span>
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Survey Time Machine */}
              {surveyComp && (
                <div className="panel">
                  <div className="evidence-detail-top">
                    <div className="action-icon"><Globe2 size={20}/></div>
                    <span className="tag info">CS ➔ SA ➔ RS ➔ BS</span>
                  </div>
                  <h3>{lang === "bn" ? "জরিপ টাইম মেশিন (Survey Comparison)" : "Survey Comparison"}</h3>
                  <div className="record-data">
                    {Array.isArray(surveyComp.surveys) && surveyComp.surveys.map((s: any, idx: number) => (
                      <div key={idx} className="record-row">
                        <span>{s.survey_type} ({s.record_presence})</span>
                        <strong>দাগ: {s.dag_no || "N/A"} · খতিয়ান: {s.khatian_no || "N/A"} · পরিমাণ: {s.area_decimal} শতাংশ</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 5. DOCUMENTS & OCR */}
          {page === "documents" && (
            <>
              <div className="eyebrow"><FileCheck2 size={15}/> DOCUMENT INTELLIGENCE & BANGLA OCR</div>
              <div className="page-heading">
                <div>
                  <h1>{lang === "bn" ? "দলিল ইন্টেলিজেন্স ও" : "Document Intelligence &"} <span>{lang === "bn" ? "বাংলা ওসিআর" : "Bangla OCR."}</span></h1>
                  <p>{lang === "bn" ? "বহুপৃষ্ঠা দলিল আপলোড, প্রাক-দর্শন, ঘূর্ণন, কাঠামোবদ্ধ ফিল্ড নিষ্কাশন ও পার্সেল ক্রস-ম্যাচিং।" : "Multi-page deed upload, previews, rotation, structured field extraction, and parcel matching."}</p>
                </div>
              </div>

              {/* Comprehensive Document Upload & OCR Pipeline */}
              <DocumentIntelligence
                token={token}
                lang={lang}
                currentParcelId={parcelId}
                onSelectParcel={(newId) => {
                  setParcelId(newId);
                  apiRequest<{ parcel?: Record<string, unknown> }>(`/api/v1/parcels/${encodeURIComponent(newId)}`, { token })
                    .then(d => setParcelDetails(d.parcel ?? d))
                    .catch(() => null);
                }}
                onNavigateWorkflow={(target) => setPage(target)}
                onSetCalculatorValues={(val, area) => {
                  setCalcDeedValue(val);
                  setCalcArea(area);
                }}
              />

              <div style={{ marginTop: "24px" }} />

              {/* Document Hash List */}
              {docsList && (
                <div className="panel section-card">
                  <div className="panel-title"><FileCheck2 size={18}/> {lang === "bn" ? "দলিল হ্যাশ ইন্টিগ্রিটি (SHA-256 Integrity)" : "Cryptographic Hash Validation"}</div>
                  {Array.isArray(docsList.documents) && docsList.documents.length > 0 ? (
                    <div className="record-data">
                      {docsList.documents.map((doc: any, i: number) => (
                        <div key={i} className="record-row">
                          <span>{doc.document_id} ({doc.document_type})</span>
                          <strong>
                            <span className={`tag ${doc.stored_integrity_status === "VALID" || doc.stored_integrity_status === "HASH_MATCH" ? "low" : "high"}`}>
                              {doc.stored_integrity_status}
                            </span>
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>{lang === "bn" ? "এই পার্সেলের কোনো আপলোডকৃত দলিল নথি পাওয়া যায়নি।" : "No stored documents for this parcel."}</p>
                  )}
                </div>
              )}

              {/* Transparent OCR Engine Status */}
              {ocrStatus && (
                <div className="panel">
                  <div className="evidence-detail-top">
                    <div className="action-icon"><Activity size={20}/></div>
                    <span className="tag medium">{String(ocrStatus.status)}</span>
                  </div>
                  <h3>{lang === "bn" ? "বাংলা ল্যান্ড ডকুমেন্ট এআই (ওসিআর ইঞ্জিন)" : "Bangla Land Document AI (OCR Status)"}</h3>
                  <div className="demo-banner" style={{ marginTop: "14px" }}>
                    <CircleAlert size={18}/> {String(ocrStatus.explanation_bn || ocrStatus.explanation_en)}
                  </div>
                  <div className="record-data">
                    <div className="record-row"><span>Engine Pipeline</span><strong>{String(ocrStatus.engine)}</strong></div>
                    <div className="record-row"><span>Required Memory</span><strong>{String(ocrStatus.memory_requirement)}</strong></div>
                    <div className="record-row"><span>Hosting Allocation</span><strong>{String(ocrStatus.environment_allocated)}</strong></div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 6. TAX & REGISTRATION COST */}
          {page === "tax_calc" && (
            <>
              <div className="eyebrow"><Calculator size={15}/> TAX VERIFICATION & REGISTRATION CALCULATOR</div>
              <div className="page-heading">
                <div>
                  <h1>{lang === "bn" ? "ভূমি উন্নয়ন কর ও" : "Land Tax &"} <span>{lang === "bn" ? "নিবন্ধন খরচ ক্যালকুলেটর" : "Registration Calculator."}</span></h1>
                  <p>{lang === "bn" ? "বাংলাদেশ রেজিস্ট্রেশন পরিদপ্তরের নীতিমালা অনুযায়ী দলিল নিবন্ধনের আনুমানিক সরকারি খরচ।" : "Verify digital tax receipt status and calculate statutory Bangladesh land registration fees."}</p>
                </div>
              </div>

              {/* Tax Verification */}
              {taxVerif && (
                <div className="panel section-card">
                  <div className="evidence-detail-top">
                    <div className="action-icon"><Database size={20}/></div>
                    <span className={`tag ${taxVerif.verified ? "low" : "medium"}`}>{String(taxVerif.status)}</span>
                  </div>
                  <h3>{lang === "bn" ? "ভূমি উন্নয়ন কর (LD Tax) অবস্থা" : "Land Development Tax Status"}</h3>
                  <p style={{ color: "#d8e5f0", fontSize: "12px", lineHeight: "1.7", margin: "12px 0" }}>
                    {String(taxVerif.message_bn || taxVerif.message_en)}
                  </p>
                  {Array.isArray(taxVerif.verification_checklist) && (
                    <div className="record-data">
                      {taxVerif.verification_checklist.map((item: any, i: number) => (
                        <div key={i} className="record-row">
                          <span>{item.item_bn}</span>
                          <strong><span className="tag info">{item.required ? "প্রয়োজনীয়" : "ঐচ্ছিক"}</span></strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Registration Cost Calculator */}
              <div className="panel">
                <div className="panel-title"><Calculator size={18}/> {lang === "bn" ? "আনুমানিক জমি নিবন্ধন ফি ক্যালকুলেটর" : "Registration Cost Calculator"}</div>
                <div className="grid-2col">
                  <div>
                    <label>{lang === "bn" ? "দলিল মূল্য (টাকায় / BDT)" : "Deed Value in BDT"}</label>
                    <input
                      type="number"
                      value={calcDeedValue}
                      onChange={e => setCalcDeedValue(Number(e.target.value) || 0)}
                      step={50000}
                    />
                  </div>
                  <div>
                    <label>{lang === "bn" ? "জমির পরিমাণ (শতাংশ)" : "Area in Decimals"}</label>
                    <input
                      type="number"
                      value={calcArea}
                      onChange={e => setCalcArea(Number(e.target.value) || 0)}
                      step={0.5}
                    />
                  </div>
                </div>

                <div className="grid-2col" style={{ marginTop: "12px" }}>
                  <div>
                    <label>{lang === "bn" ? "এলাকার ধরন" : "Jurisdiction Location"}</label>
                    <select
                      value={calcLocation}
                      onChange={e => setCalcLocation(e.target.value as any)}
                      style={{ width: "100%", padding: "12px", background: "#0a1625", color: "#e7eef8", border: "1px solid #2a4055", borderRadius: "9px" }}
                    >
                      <option value="dhaka_ctg_city">ঢাকা ও চট্টগ্রাম সিটি কর্পোরেশন (Dhaka/Ctg City)</option>
                      <option value="other_city_corporation">অন্যান্য সিটি কর্পোরেশন (Other City Corp)</option>
                      <option value="pourashava">পৌরসভা এলাকা (Pourashava)</option>
                      <option value="union_parishad">ইউনিয়ন পরিষদ (Union Parishad)</option>
                    </select>
                  </div>
                  <div>
                    <label>{lang === "bn" ? "ব্যবহারের ধরন" : "Property Use"}</label>
                    <select
                      value={calcResidential ? "res" : "com"}
                      onChange={e => setCalcResidential(e.target.value === "res")}
                      style={{ width: "100%", padding: "12px", background: "#0a1625", color: "#e7eef8", border: "1px solid #2a4055", borderRadius: "9px" }}
                    >
                      <option value="res">আবাসিক (Residential)</option>
                      <option value="com">বাণিজ্যিক (Commercial)</option>
                    </select>
                  </div>
                </div>

                <button className="primary" style={{ marginTop: "18px" }} onClick={runRegistrationCalculation}>
                  {lang === "bn" ? "হিসাব করুন" : "Calculate Estimated Cost"} <ArrowRight size={15}/>
                </button>

                {calcResult && (
                  <div style={{ marginTop: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3>{lang === "bn" ? "খরচের বিস্তারিত বিবরণ" : "Estimated Cost Breakdown"}</h3>
                      <span className="tag low">{String(calcResult.effective_rate_percent)}% Effective Rate</span>
                    </div>

                    <table className="calc-table">
                      <thead>
                        <tr>
                          <th>{lang === "bn" ? "খাত" : "Fee Item"}</th>
                          <th>{lang === "bn" ? "হার (%)" : "Rate (%)"}</th>
                          <th style={{ textAlign: "right" }}>{lang === "bn" ? "পরিমাণ (টাকা)" : "Amount (BDT)"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(calcResult.breakdown) && calcResult.breakdown.map((item: any, i: number) => (
                          <tr key={i}>
                            <td>{lang === "bn" ? item.title_bn : item.title_en}</td>
                            <td>{item.rate_percent !== null ? `${item.rate_percent}%` : "স্থির ফি"}</td>
                            <td style={{ textAlign: "right" }}>৳ {Number(item.amount_bdt).toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="calc-total">
                          <td>{lang === "bn" ? "সর্বমোট আনুমানিক সরকারি খরচ" : "Total Estimated Cost"}</td>
                          <td>{String(calcResult.effective_rate_percent)}%</td>
                          <td style={{ textAlign: "right" }}>৳ {Number(calcResult.total_estimated_cost_bdt).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="helper">{String(calcResult.disclaimer_bn || calcResult.disclaimer_en)}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 7. AI COPILOT */}
          {page === "copilot" && (
            <>
              <div className="eyebrow"><Bot size={15}/> LANDSURE AI COPILOT</div>
              <div className="page-heading">
                <div>
                  <h1>{lang === "bn" ? "এআই সহকারীকে" : "Ask LandSure"} <span>{lang === "bn" ? "প্রশ্ন করুন।" : "AI Copilot."}</span></h1>
                  <p>{lang === "bn" ? "বাংলা, ইংরেজি বা বাংলিশে জমির তথ্য জানতে চান? কোপাইলট প্রমাণসূত্র সহ উত্তর দেবে।" : "Evidence-linked assistant answering questions with SQLite database provenance."}</p>
                </div>
              </div>

              <div className="chat-layout">
                <div className="panel chat-panel" style={{ display: "flex", flexDirection: "column", height: "650px" }}>
                  <div className="chat-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="assistant-avatar"><Bot size={23}/></div>
                      <div>
                        <strong>LandSure Conversational AI</strong>
                        <span>Router V4 · Safety Gate V2 · Grounded Tools · Gemini Bridge</span>
                      </div>
                    </div>
                    {isSpeaking && (
                      <button
                        onClick={stopSpeaking}
                        style={{ background: "#732a35", border: "1px solid #ffaaa8", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}
                      >
                        <Square size={12}/> {lang === "bn" ? "থামুন" : "Stop Speaking"}
                      </button>
                    )}
                  </div>

                  {/* Chat Messages Thread */}
                  <div className="chat-body" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                    {chatMessages.length === 0 ? (
                      <div className="chat-intro">
                        <div className="chat-intro-icon"><Sparkles size={27}/></div>
                        <h3>{lang === "bn" ? "জমি সংক্রান্ত যেকোনো প্রশ্ন জিজ্ঞাসা করুন" : "Ask about Bangladesh land records"}</h3>
                        <p>{lang === "bn" ? "সাধারণ আইনি চেকলিস্ট, খতিয়ানের পার্থক্য বা নির্দিষ্ট পার্সেল সংক্রান্ত বিষয়ে প্রশ্ন করুন।" : "Ask about due diligence checklists, khatian history, or specific parcel evidence."}</p>

                        {/* Quick Prompts */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px", justifyContent: "center" }}>
                          {[
                            "এই জমির সব তথ্য সহজ করে বলো",
                            "এটার নামজারি হয়েছে?",
                            "আগের মালিক কে ছিলেন?",
                            "এই জমির কী ঝুঁকি আছে?",
                            "কোন দলিলগুলো এখনো দরকার?",
                            "এই জমি কেনার আগে আমার কী করা উচিত?",
                            "CS আর RS খতিয়ানের পার্থক্য কী?",
                            "এই জমির রেজিস্ট্রেশন খরচ কত হতে পারে?",
                          ].map((chip, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setQuestion(chip);
                                askCopilot(chip);
                              }}
                              style={{ background: "#16283b", border: "1px solid #234054", color: "#8da2b7", padding: "6px 12px", borderRadius: "16px", fontSize: "11px", cursor: "pointer" }}
                            >
                              💬 {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                            maxWidth: msg.role === "user" ? "80%" : "92%",
                          }}
                        >
                          {msg.role === "user" ? (
                            <div style={{ background: "#1c5d63", color: "#fff", padding: "12px 16px", borderRadius: "14px 14px 2px 14px", fontSize: "13px" }}>
                              {msg.content}
                              <div style={{ fontSize: "10px", color: "#a5d8d6", textAlign: "right", marginTop: "4px" }}>{msg.timestamp}</div>
                            </div>
                          ) : (
                            <div className="response-card" style={{ margin: 0 }}>
                              <div className="response-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Bot size={16}/>
                                  <strong>{lang === "bn" ? "ল্যান্ডসিওর সহকারী" : "LandSure Assistant"}</strong>
                                  {msg.status && <span className="response-status">{msg.status}</span>}
                                  {msg.geminiUsed && <span style={{ background: "#432874", color: "#d0bcff", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>Gemini-1.5</span>}
                                </div>
                                <button
                                  onClick={() => speakText(msg.content)}
                                  title="Listen to response"
                                  style={{ background: "transparent", border: "none", color: "#5ee6cb", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
                                >
                                  <Volume2 size={16}/> {lang === "bn" ? "শুনুন" : "Listen"}
                                </button>
                              </div>
                              <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.6", color: "#dce6f2" }}>
                                {msg.content}
                              </div>

                              {/* Follow-up Question Chips */}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #1a2f44" }}>
                                <span style={{ fontSize: "10px", color: "#8da2b7", alignSelf: "center" }}>{lang === "bn" ? "পরবর্তী প্রশ্ন:" : "Follow-up:"}</span>
                                {["কেন?", "আরও সহজ করে বলো", "এর প্রমাণ কোথায়?"].map((chip, i) => (
                                  <button
                                    key={i}
                                    onClick={() => askCopilot(chip)}
                                    style={{ background: "#112233", border: "1px solid #1f3a52", color: "#6fe9ce", padding: "3px 8px", borderRadius: "12px", fontSize: "10px", cursor: "pointer" }}
                                  >
                                    ↳ {chip}
                                  </button>
                                ))}
                              </div>

                              <div className="response-meta" style={{ marginTop: "8px" }}>
                                <span><Database size={13}/> {msg.evidence?.length || 0} Evidence Rows</span>
                                <span><ShieldCheck size={13}/> Synthetic Verification</span>
                                <span style={{ marginLeft: "auto", fontSize: "10px", color: "#8da2b7" }}>{msg.timestamp}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Speech Error Banner */}
                  {speechError && (
                    <div style={{ background: "#3d181e", color: "#ffaaa8", padding: "6px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <CircleAlert size={14}/> {speechError}
                    </div>
                  )}

                  {/* Chat Input Form */}
                  <form className="chat-form" onSubmit={askCopilot} style={{ padding: "12px 16px" }}>
                    <div className="chat-input-row" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder={isListening ? (lang === "bn" ? "মাইক্রোফোনে কথা বলুন (শুনছি...)" : "Listening to your voice...") : (lang === "bn" ? "বাংলা, ইংরেজি বা বাংলিশে প্রশ্ন লিখুন বা বলুন..." : "Ask in Bangla, English or Banglish...")}
                        style={{ flex: 1, borderColor: isListening ? "#ff5252" : undefined }}
                      />

                      {/* Microphone Voice Input Button */}
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        title={isListening ? "Stop Recording" : "Voice Input (Microphone)"}
                        style={{
                          background: isListening ? "#ff2a2a" : "#16283b",
                          border: isListening ? "2px solid #ff8888" : "1px solid #234054",
                          color: isListening ? "#fff" : "#5ee6cb",
                          padding: "10px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          animation: isListening ? "pulse 1.2s infinite" : undefined,
                        }}
                      >
                        {isListening ? <MicOff size={18}/> : <Mic size={18}/>}
                      </button>

                      {/* Send Button */}
                      <button className="send-button" disabled={busy || !question.trim()}>
                        <Send size={18}/>
                      </button>
                    </div>

                    <div className="chat-form-footer" style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "#8da2b7" }}>
                      <span>Parcel ID: {parcelId}</span>
                      <span>{isListening ? (lang === "bn" ? "🔴 ভয়েস রেকর্ডিং সক্রিয়" : "🔴 Voice Recording Active") : (lang === "bn" ? "ভয়েস ও টেক্সট উভয়েই প্রশ্ন করা যায়" : "Supports Voice & Text")}</span>
                    </div>
                  </form>
                </div>

                {/* Evidence Column */}
                <div className="panel side-panel">
                  <div className="panel-title"><FileSearch size={18}/> {lang === "bn" ? "সংযুক্ত প্রমাণসমূহ" : "Linked Provenance"}</div>
                  {copilotResult?.evidence?.length ? (
                    copilotResult.evidence.map((item, idx) => (
                      <div className="evidence-item" key={idx}>
                        <div className="evidence-icon"><FileCheck2 size={16}/></div>
                        <div>
                          <strong>{item.source_table}</strong>
                          <span>Record ID: {String(item.source_record_id)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-evidence">
                      <CircleHelp size={28}/>
                      <strong>{lang === "bn" ? "কোনো প্রমাণ লোড হয়নি" : "No evidence yet"}</strong>
                      <p>{lang === "bn" ? "প্রশ্ন করার পর সংশ্লিষ্ট ডাটাবেজ রেকর্ড এখানে প্রদর্শিত হবে।" : "Run a query to view provenance records."}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 8. LAWYER CONNECT */}
          {page === "lawyers" && (
            <>
              <div className="eyebrow"><Scale size={15}/> LEGAL EXPERT CONNECT</div>
              <div className="page-heading">
                <div>
                  <h1>{lang === "bn" ? "বিজ্ঞ আইনজীবী" : "Legal Expert"} <span>{lang === "bn" ? "সংযোগ ও পরামর্শ" : "Directory."}</span></h1>
                  <p>{lang === "bn" ? "৫০ জন সিন্থেটিক জমি বিশেষজ্ঞ বিজ্ঞ আইনজীবীর প্রোফাইল ও স্লট সূচি।" : "Browse 50 verified legal counsel profiles with appointment availability."}</p>
                </div>
              </div>

              <div className="panel section-card">
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ margin: 0 }}>{lang === "bn" ? "এলাকা অনুযায়ী ফিল্টার:" : "Filter by Location:"}</label>
                  {["", "Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna"].map(loc => (
                    <button
                      key={loc}
                      className={`lang-toggle ${lawyerLocationFilter === loc ? "active" : ""}`}
                      onClick={() => { setLawyerLocationFilter(loc); loadLawyers(loc); }}
                    >
                      {loc || (lang === "bn" ? "সকল এলাকা" : "All Locations")}
                    </button>
                  ))}
                </div>
              </div>

              {bookingSuccessMsg && (
                <div style={{ background: "#123d33", border: "1px solid #1c6d5b", color: "#5ee6cb", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                  ✓ {bookingSuccessMsg}
                </div>
              )}

              {selectedLawyerSlots && (
                <div className="panel section-card" style={{ borderColor: "#388d8b", background: "linear-gradient(135deg, #0d1e2e, #09131f)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px" }}>{lang === "bn" ? "উপলব্ধ পরামর্শ স্লট সমূহ" : "Available Consultation Slots"}</h3>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#8da2b7" }}>
                        {lang === "bn" ? "যেকোনো একটি স্লট নির্বাচন করে সরাসরি ডেমো কনসালটেশন বুক করুন।" : "Select any available slot to simulate a demonstration consultation."}
                      </p>
                    </div>
                    <button className="icon-button" onClick={() => setSelectedLawyerSlots(null)}><X size={16}/></button>
                  </div>
                  <div className="record-data">
                    {selectedLawyerSlots.slots.map((s: any, i: number) => {
                      const isAvail = s.availability_status === "AVAILABLE";
                      return (
                        <div key={i} className="record-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{s.start_time} — {s.end_time}</span>
                            <span className={`tag ${isAvail ? "low" : "high"}`} style={{ marginLeft: "10px" }}>
                              {s.availability_status}
                            </span>
                          </div>
                          {isAvail ? (
                            <button
                              className="primary"
                              disabled={bookingInProgress}
                              onClick={() => bookSlot(selectedLawyerSlots.lawyerId, s.availability_id, "CHAT")}
                              style={{ padding: "5px 12px", fontSize: "11px" }}
                            >
                              {bookingInProgress ? (lang === "bn" ? "বুকিং হচ্ছে..." : "Booking...") : (lang === "bn" ? "ডেমো বুকিং করুন" : "Book Demo Slot")}
                            </button>
                          ) : (
                            <span style={{ fontSize: "11px", color: "#8da2b7" }}>{lang === "bn" ? "বুকড" : "Reserved"}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* My Active & Past Consultation Bookings */}
              {myBookings.length > 0 && (
                <div className="panel section-card" style={{ borderColor: "#1f4e5b", background: "linear-gradient(135deg, #0c1c2e, #09131f)", marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Calendar size={18} style={{ color: "#5ee6cb" }}/>
                      <h3 style={{ margin: 0, fontSize: "15px" }}>{lang === "bn" ? "আমার পরামর্শ বুকিং তালিকা" : "My Consultation Bookings"}</h3>
                    </div>
                    <span className="tag info">{myBookings.length} {lang === "bn" ? "বুকিং" : "Bookings"}</span>
                  </div>

                  <div className="record-data">
                    {myBookings.map((b: any, idx: number) => (
                      <div key={idx} className="record-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <strong>{b.lawyer_name || b.lawyer_id}</strong>
                          <span style={{ color: "#8da2b7", marginLeft: "8px", fontSize: "11px" }}>{b.location} · মোড: {b.consultation_mode}</span>
                          <div style={{ fontSize: "11px", color: "#5ee6cb", marginTop: "3px" }}>
                            স্লট: {b.slot ? `${b.slot.start_time} - ${b.slot.end_time}` : "নির্ধারিত সময়"} · আইডি: {b.request_id}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className={`tag ${b.status === "CONFIRMED_DEMO" ? "low" : "high"}`}>
                            {b.status}
                          </span>
                          {b.status === "CONFIRMED_DEMO" && (
                            <button
                              className="secondary"
                              onClick={() => cancelBooking(b.request_id)}
                              style={{ background: "#3d181e", border: "1px solid #6b2e35", color: "#ffaaa8", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", cursor: "pointer" }}
                            >
                              {lang === "bn" ? "বাতিল করুন" : "Cancel"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "12px", background: "#112233", border: "1px solid #1c354d", borderRadius: "6px", padding: "8px 12px", fontSize: "11px", color: "#8da2b7" }}>
                    ℹ {lang === "bn"
                      ? "ডেমো সিমুলেশন নোটিশ: এটি একটি সিমুলেটেড বুকিং প্রদর্শনী। কোনো প্রকৃত আর্থিক লেনদেন বা উকিল-মক্কেল আইনি চুক্তি গঠিত হয় না।"
                      : "Simulation Notice: This is a synthetic demo booking workflow. No real financial transaction or attorney-client relationship is created."}
                  </div>
                </div>
              )}

              <div className="grid-3col">
                {lawyersList.map((lawyer: any) => (
                  <div key={lawyer.lawyer_id} className="lawyer-card">
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="tag info">{lawyer.location}</span>
                        <small style={{ color: "#778fa5" }}>{lawyer.experience_years} yrs exp</small>
                      </div>
                      <h4 style={{ margin: "14px 0 6px", fontSize: "15px" }}>{lawyer.name}</h4>
                      <p style={{ fontSize: "11px", color: "#8da2b7", margin: 0 }}>BAR ID: {lawyer.bar_council_id}</p>
                      <div className="badge-list">
                        {Array.isArray(lawyer.specializations) && lawyer.specializations.map((spec: string, i: number) => (
                          <span key={i} className="tag low">{spec}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      className="primary"
                      style={{ marginTop: "14px", width: "100%", padding: "9px" }}
                      onClick={() => viewLawyerSlots(lawyer.lawyer_id)}
                    >
                      {lang === "bn" ? "স্লট দেখুন" : "View Slots"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 9. WATCHLIST & CHANGE MONITOR */}
          {page === "watchlist" && (
            <>
              <div className="eyebrow"><Bell size={15}/> PARCEL CHANGE WATCH</div>
              <div className="page-heading">
                <div>
                  <h1>{lang === "bn" ? "পার্সেল ওয়াচলিস্ট ও" : "Parcel Change"} <span>{lang === "bn" ? "পরিবর্তন ট্র্যাকিং" : "Watch & History."}</span></h1>
                  <p>{lang === "bn" ? "জমির রেকর্ড, স্থানান্তর বা সীমানা নিয়ে যেকোনো সাম্প্রতিক পরিবর্তনের ইতিহাস।" : "Audit recorded transfers, mutation updates, and event logs."}</p>
                </div>
              </div>

              {/* Watched Parcels Manager */}
              <div className="panel section-card" style={{ borderColor: "#1f4e5b", background: "linear-gradient(135deg, #0c1c2e, #09131f)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Eye size={18} style={{ color: "#5ee6cb" }}/>
                    <h3 style={{ margin: 0, fontSize: "15px" }}>{lang === "bn" ? "সক্রিয় ওয়াচলিস্ট পার্সেলসমূহ" : "Active Watched Parcels"}</h3>
                  </div>
                  <button
                    className="primary"
                    onClick={() => toggleWatchlist(parcelId)}
                    style={{ padding: "6px 12px", fontSize: "11px" }}
                  >
                    {watchlist.includes(parcelId)
                      ? (lang === "bn" ? `✓ বর্তমান পার্সেল (${parcelId}) ওয়াচলিস্টে আছে` : `✓ Current (${parcelId}) is Watched`)
                      : (lang === "bn" ? `+ বর্তমান পার্সেল (${parcelId}) ওয়াচলিস্টে যোগ করুন` : `+ Add Current (${parcelId}) to Watchlist`)}
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {watchlist.map(pid => (
                    <div
                      key={pid}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: pid === parcelId ? "#123d33" : "#16283b",
                        border: pid === parcelId ? "1px solid #1c6d5b" : "1px solid #28445f",
                        borderRadius: "20px",
                        padding: "4px 12px",
                        fontSize: "12px",
                        color: pid === parcelId ? "#5ee6cb" : "#e7eef8",
                      }}
                    >
                      <button
                        onClick={() => selectParcel(pid)}
                        style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontWeight: 600, padding: 0 }}
                      >
                        {pid}
                      </button>
                      <button
                        onClick={() => toggleWatchlist(pid)}
                        title="Remove from watchlist"
                        style={{ background: "transparent", border: "none", color: "#8da2b7", cursor: "pointer", padding: "0 2px" }}
                      >
                        <X size={12}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Timeline */}
              <div className="panel">
                <div className="evidence-detail-top">
                  <div className="action-icon"><Activity size={20}/></div>
                  <span className="tag info">{String(eventsList?.total_events || watchedEvents.length || 0)} Total Events</span>
                </div>
                <h3>{lang === "bn" ? `${parcelId} — রেকর্ডকৃত পার্সেল পরিবর্তনের তালিকা` : `Event Timeline (${parcelId})`}</h3>
                
                {Array.isArray(eventsList?.events) && eventsList.events.length > 0 ? (
                  <div className="record-data">
                    {eventsList.events.map((ev: any, idx: number) => (
                      <div key={idx} className="record-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontWeight: 600, color: "#e7eef8" }}>{ev.event_description || ev.event_id}</span>
                          <div style={{ fontSize: "11px", color: "#8da2b7", marginTop: "2px" }}>
                            {ev.event_date || "Date N/A"} · ধরন: {ev.event_type}
                          </div>
                        </div>
                        <span className="tag low">{ev.event_type}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginTop: "14px", color: "#8da2b7" }}>{lang === "bn" ? "এই পার্সেলের কোনো সাম্প্রতিক পরিবর্তন রেকর্ড নেই।" : "No recorded events for this parcel."}</p>
                )}

                {/* Statutory Monitoring Disclaimer */}
                <div style={{ marginTop: "16px", background: "#112233", border: "1px solid #1c354d", borderRadius: "8px", padding: "12px", fontSize: "11px", color: "#8da2b7", lineHeight: 1.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ffd166", fontWeight: 700, marginBottom: "4px" }}>
                    <ShieldAlert size={14}/> {lang === "bn" ? "সরকারি রেকর্ড মনিটরিং নোটিশ:" : "Official Monitoring Notice:"}
                  </div>
                  {lang === "bn"
                    ? "এই ওয়াচলিস্ট সংরক্ষিত ডাটাবেজ ইভেন্ট লগের ভিত্তিতে পার্সেল পরিবর্তন প্রদর্শন করে। কোনো অননুমোদিত উপায়ে সরকারি সার্ভার স্ক্র্যাপ বা লাইভ মনিটর করা হয় না। প্রকৃত মালিকানা হালনাগাদের জন্য স্থানীয় ভূমি অফিসে অনুসন্ধান করুন।"
                    : "This change watch engine monitors database audit logs. Live government land portal surveillance is not claimed without authorized API gateway access."}
                </div>
              </div>
            </>
          )}

          {/* 10. TRUST PASSPORT & REPORTS */}
          {page === "passport" && (
            <>
              <div className="eyebrow"><FileText size={15}/> EVIDENCE-LINKED TRUST PASSPORT</div>
              <div className="page-heading">
                <div>
                  <h1>{lang === "bn" ? "ল্যান্ড ট্রাস্ট পাসপোর্ট ও" : "Evidence-Linked Land"} <span>{lang === "bn" ? "অডিট রিপোর্ট" : "Trust Passport."}</span></h1>
                  <p>{lang === "bn" ? "এক ক্লিকে ডাউনলোডযোগ্য প্রমাণসহ পূর্ণাঙ্গ পার্সেল ভেরিফিকেশন রিপোর্ট।" : "Complete verifiable audit passport for pre-purchase due diligence."}</p>
                </div>
                <button className="primary" onClick={downloadPassportPdf}>
                  <Download size={16}/> {lang === "bn" ? "পিডিএফ রিপোর্ট ডাউনলোড" : "Download PDF Report"}
                </button>
              </div>

              <div className="panel">
                <div className="evidence-detail-top">
                  <div className="action-icon"><Fingerprint size={22}/></div>
                  <span className="tag low">{lang === "bn" ? "যাচাই সারসংক্ষেপ প্রস্তুত" : "PDF ENGINE READY"}</span>
                </div>
                <h3>{parcelId} — {lang === "bn" ? "জমি যাচাই ও ট্রাস্ট পাসপোর্ট" : "Land Trust Passport Summary"}</h3>
                <p style={{ color: "#8da2b7", fontSize: "12px", margin: "8px 0 18px" }}>
                  {lang === "bn"
                    ? "এই প্রতিবেদনে সিএস, এসএ, আরএস, বিএস জরিপ রেকর্ড, মিউটেশন অবস্থা, দলিলের ক্রিপ্টোগ্রাফিক হ্যাশ এবং এমএল ঝুঁকি পূর্বাভাস অন্তর্ভুক্ত রয়েছে।"
                    : "Comprehensive multi-page audit combining survey history, mutation logs, deed hashes, and machine-learning review."}
                </p>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-top"><span>{lang === "bn" ? "জমির নাম" : "Display Label"}</span></div>
                    <strong style={{ fontSize: "13px" }}>{String(parcelDetails?.display_name_bn || (lang === "bn" ? "বিরুলিয়া আবাসিক জমি" : "Birulia Residential"))}</strong>
                    <small>{String(parcelDetails?.mouza_name_bn || "বিরুলিয়া")}, {String(parcelDetails?.upazila_name_bn || "সাভার")}</small>
                  </div>
                  <div className="stat-card">
                    <div className="stat-top"><span>{lang === "bn" ? "রেকর্ডকৃত আয়তন" : "Recorded Area"}</span></div>
                    <strong>{String(parcelDetails?.reference_area_decimal || 10.0)} শতাংশ</strong>
                    <small>~ {((Number(parcelDetails?.reference_area_decimal) || 10) / 1.65).toFixed(1)} কাঠা</small>
                  </div>
                  <div className="stat-card">
                    <div className="stat-top"><span>{lang === "bn" ? "ঝুঁকি ক্যাটাগরি" : "Risk Level"}</span></div>
                    <strong style={{ color: "#5ee6cb" }}>LOW RISK</strong>
                    <small>Readiness: 89 / 100</small>
                  </div>
                  <div className="stat-card">
                    <div className="stat-top"><span>{lang === "bn" ? "ডিজিটাল ইন্টিগ্রিটি" : "Integrity Hash"}</span></div>
                    <strong>SHA-256</strong>
                    <small>Tamper-Evident</small>
                  </div>
                </div>

                {/* Structured Verification Findings Checklist */}
                <div className="record-data" style={{ marginTop: "20px" }}>
                  <div className="record-row">
                    <span>{lang === "bn" ? "জরিপ ও খতিয়ান ফাইন্ডিং" : "Survey & Khatian"}</span>
                    <strong>{lang === "bn" ? "সিএস ➔ এসএ ➔ আরএস (খতিয়ান ১২৪, দাগ ১০০৭) সামঞ্জস্যপূর্ণ" : "CS/SA/RS khatian #124, dag #1007 matched"}</strong>
                  </div>
                  <div className="record-row">
                    <span>{lang === "bn" ? "মালিকানা ইতিহাসের পরিধি" : "Ownership History"}</span>
                    <strong>{lang === "bn" ? "২৫+ বছর (১৯৯৯ — ২০২৪) নিয়মিত হস্তান্তরের ইতিহাস পাওয়া গেছে" : "25+ years title chain continuity found"}</strong>
                  </div>
                  <div className="record-row">
                    <span>{lang === "bn" ? "দলিল যাচাই ও ফিল্ড তুলনা" : "Deed Verification"}</span>
                    <strong>{lang === "bn" ? "দলিল নম্বর, দাগ, খতিয়ান ও হস্তান্তরিত আয়তন রেকর্ডের সাথে মিল রয়েছে" : "Deed number, dag, and area match registered record"}</strong>
                  </div>
                  <div className="record-row">
                    <span>{lang === "bn" ? "নামজারি (মিউটেশন) অবস্থা" : "Mutation Status"}</span>
                    <strong><span className="tag low">{lang === "bn" ? "নামজারি অনুমোদিত ও ডিসিআর পরিশোধিত (খতিয়ান ৩১৮)" : "Mutation Approved"}</span></strong>
                  </div>
                  <div className="record-row">
                    <span>{lang === "bn" ? "ভূমি উন্নয়ন কর (খাজনা)" : "Land Development Tax"}</span>
                    <strong><span className="tag low">{lang === "bn" ? "সর্বশেষ দাখিলা হালনাগাদ (অনলাইন ভেরিফিকেশন সাপেক্ষে)" : "Tax Dakhila Updated"}</span></strong>
                  </div>
                  <div className="record-row">
                    <span>{lang === "bn" ? "আইনি বিরোধ ও ইনজাংশন" : "Court Injunctions"}</span>
                    <strong><span className="tag low">{lang === "bn" ? "কোনো সক্রিয় দেওয়ানি মামলা বা নিষেধাজ্ঞার প্রমাণ মেলেনি" : "No active court disputes recorded"}</span></strong>
                  </div>
                  <div className="record-row">
                    <span>{lang === "bn" ? "বাকি থাকা পদক্ষেপ" : "Outstanding Actions"}</span>
                    <strong style={{ color: "#f2c77c" }}>{lang === "bn" ? "সাব-রেজিস্ট্রি বালামে মূল তল্লাশি ও আমিন দিয়ে সীমানা মেপে দখল বুঝে নেওয়া" : "Sub-registry volume search and physical demarcation"}</strong>
                  </div>
                  <div className="record-row">
                    <span>{lang === "bn" ? "প্রতিবেদন তৈরির তারিখ" : "Generated Date"}</span>
                    <strong>{new Date().toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>
                  </div>
                </div>

                <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button className="primary" onClick={downloadPassportPdf}>
                    <Download size={16}/> {lang === "bn" ? "অফিশিয়াল পিডিএফ রিপোর্ট ডাউনলোড করুন" : "Download Official PDF"}
                  </button>
                  <button className="secondary" onClick={() => navigateTo("journey")} style={{ background: "#16283b", border: "1px solid #28445f", color: "#e7eef8", padding: "10px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <ShieldCheck size={16}/> {lang === "bn" ? "যাচাই প্রক্রিয়ায় ফিরে যান" : "Return to Journey"}
                  </button>
                </div>
              </div>
            </>
          )}

          <footer className="footer">
            <span>© 2026 LandSure AI · Bangladesh Land Intelligence Prototype</span>
            <span><ShieldCheck size={14}/> Synthetic Demonstration Dataset · Not a certified legal deed</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
