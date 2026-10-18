import React, { useState, useEffect } from "react";
import {
  MapPin, Compass, Search, ArrowRight, ShieldCheck, ShieldAlert,
  AlertTriangle, CheckCircle2, RotateCcw, Scale, PhoneCall,
  Flag, Info, X, DollarSign, Layers, Bookmark, BookmarkCheck, Sparkles, Eye
} from "lucide-react";
import { apiRequest } from "../api";
import { onSpotlightMove, onSpotlightLeave } from "./common/Spotlight";

interface NearbyLandAlternativesProps {
  token: string;
  currentParcelId: string;
  lang: "bn" | "en";
  onSelectParcel: (parcelId: string) => void;
  onNavigateToMap?: () => void;
  onNavigateWorkflow?: (target: string) => void;
  onVerifyParcel?: (parcelId: string) => void;
  watchlist?: string[];
  onToggleWatchlist?: (parcelId: string) => void;
}

interface LocationOption {
  id?: string;
  name_en: string;
  name_bn: string;
  division?: string;
  type?: string;
  has_parcels?: boolean;
}

interface MouzaOption {
  mouza_code: string;
  name_en: string;
  name_bn: string;
  jl_no?: number;
}

interface AlternativeParcel {
  parcel_id: string;
  listing_id?: string;
  distance_km: number;
  distance_bn: string;
  coordinates: { lat: number; lng: number };
  location: {
    division_bn: string;
    district_bn: string;
    district_en: string;
    upazila_bn: string;
    upazila_en: string;
    mouza_bn: string;
    mouza_en: string;
  };
  area_decimal: number;
  area_bn: string;
  asking_price_bdt: number | null;
  price_per_shotok_bdt: number | null;
  price_formatted_bn: string;
  price_disclaimer_bn: string;
  price_per_shotok_formatted_bn: string;
  evidence_completeness_pct: number;
  evidence_breakdown: string[];
  risk_label_bn: string;
  risk_badge: string;
  risk_color: "green" | "amber" | "rose" | "gray";
  seller_contact: {
    seller_name: string;
    seller_phone_placeholder: string;
    is_public_consent: boolean;
    is_synthetic_demo: boolean;
  };
}

interface ComparisonItem {
  parcel_id: string;
  location_bn: string;
  area_bn: string;
  area_decimal: number;
  asking_price_bdt: number | null;
  price_formatted_bn: string;
  price_per_shotok_formatted_bn: string;
  price_disclaimer_bn: string;
  survey_status_bn: string;
  mutation_status_bn: string;
  tax_status_bn: string;
  risk_label_bn: string;
  risk_class: string;
  evidence_score_pct: number;
  seller_name: string;
  seller_phone_placeholder: string;
}

export const NearbyLandAlternatives: React.FC<NearbyLandAlternativesProps> = ({
  token,
  currentParcelId,
  lang,
  onSelectParcel,
  onNavigateToMap,
  onNavigateWorkflow,
  onVerifyParcel,
  watchlist = [],
  onToggleWatchlist,
}) => {
  // Cascading Location Selector State
  const [divisions, setDivisions] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [upazilas, setUpazilas] = useState<LocationOption[]>([]);
  const [mouzas, setMouzas] = useState<MouzaOption[]>([]);

  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("Dhaka");
  const [selectedUpazila, setSelectedUpazila] = useState("Savar");
  const [selectedMouza, setSelectedMouza] = useState("");
  const [mouzaCoverageMsg, setMouzaCoverageMsg] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState("");

  // Nearby Alternatives State
  const [radiusKm, setRadiusKm] = useState<number>(5.0);
  const [sortBy, setSortBy] = useState<"distance" | "price_asc" | "completeness">("distance");
  const [alternatives, setAlternatives] = useState<AlternativeParcel[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState("");

  // Comparison State
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonItem[]>([]);
  const [isLoadingCompare, setIsLoadingCompare] = useState(false);

  // Seller Contact & Report Modal State
  const [contactModalItem, setContactModalItem] = useState<AlternativeParcel | null>(null);
  const [contactNote, setContactNote] = useState("");
  const [contactStatus, setContactStatus] = useState<string>("");
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);

  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // 1. Load Divisions & Initial Districts
  useEffect(() => {
    apiRequest<{ divisions: LocationOption[] }>("/api/v1/gis/divisions")
      .then((res) => setDivisions(res.divisions || []))
      .catch(() => null);

    apiRequest<{ districts: LocationOption[] }>("/api/v1/gis/districts")
      .then((res) => setDistricts(res.districts || []))
      .catch(() => null);
  }, []);

  // 2. Load Upazilas when District changes
  useEffect(() => {
    if (!selectedDistrict) {
      setUpazilas([]);
      setSelectedUpazila("");
      return;
    }
    apiRequest<{ upazilas: LocationOption[] }>(
      `/api/v1/gis/upazilas?district=${encodeURIComponent(selectedDistrict)}`
    )
      .then((res) => {
        const list = res.upazilas || [];
        setUpazilas(list);
        if (list.length > 0 && !list.some((u) => u.name_en === selectedUpazila)) {
          setSelectedUpazila(list[0].name_en);
        }
      })
      .catch(() => setUpazilas([]));
  }, [selectedDistrict]);

  // 3. Load Mouzas when Upazila changes
  useEffect(() => {
    if (!selectedUpazila) {
      setMouzas([]);
      setSelectedMouza("");
      setMouzaCoverageMsg("");
      return;
    }
    apiRequest<{ has_data: boolean; mouzas: MouzaOption[]; message_bn?: string }>(
      `/api/v1/gis/mouzas?upazila=${encodeURIComponent(selectedUpazila)}&district=${encodeURIComponent(selectedDistrict)}`
    )
      .then((res) => {
        if (res.has_data && res.mouzas?.length > 0) {
          setMouzas(res.mouzas);
          setMouzaCoverageMsg("");
        } else {
          setMouzas([]);
          setSelectedMouza("");
          setMouzaCoverageMsg(
            res.message_bn || "এই উপজেলায় বর্তমানে কোনো মৌজা রেকর্ড অন্তর্ভুক্ত নেই (তথ্য সীমাবদ্ধতা)।"
          );
        }
      })
      .catch(() => {
        setMouzas([]);
        setSelectedMouza("");
        setMouzaCoverageMsg("মৌজা তথ্য লোড করা যায়নি।");
      });
  }, [selectedUpazila, selectedDistrict]);

  // 4. Fetch Nearby Alternatives for current parcel
  useEffect(() => {
    if (!currentParcelId) return;
    setIsLoadingNearby(true);
    setNearbyError("");

    apiRequest<{ alternatives: AlternativeParcel[]; total_alternatives_found: number }>(
      `/api/v1/gis/parcels/${encodeURIComponent(currentParcelId)}/nearby?radius_km=${radiusKm}&sort_by=${sortBy}&limit=6`,
      { token }
    )
      .then((res) => {
        setAlternatives(res.alternatives || []);
      })
      .catch((err) => {
        setNearbyError(err instanceof Error ? err.message : "বিকল্প জমি লোড করা সম্ভব হয়নি");
        setAlternatives([]);
      })
      .finally(() => {
        setIsLoadingNearby(false);
      });
  }, [currentParcelId, radiusKm, sortBy, token]);

  // Execute Cascading Search
  const handleLocationSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setSearchFeedback("");

    const params = new URLSearchParams();
    if (selectedDistrict) params.set("district", selectedDistrict);
    if (selectedUpazila) params.set("upazila", selectedUpazila);
    if (selectedMouza) params.set("mouza", selectedMouza);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    params.set("limit", "10");

    try {
      const res = await apiRequest<{ parcels: any[]; total_count: number; message_bn?: string }>(
        `/api/v1/gis/parcels/search?${params.toString()}`
      );
      setSearchResults(res.parcels || []);
      if ((res.parcels || []).length === 0) {
        setSearchFeedback(res.message_bn || "কোনো পার্সেল রেকর্ড খুঁজে পাওয়া যায়নি।");
      }
    } catch (err) {
      setSearchFeedback("অনুসন্ধান সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedDivision("");
    setSelectedDistrict("Dhaka");
    setSelectedUpazila("Savar");
    setSelectedMouza("");
    setSearchQuery("");
    setSearchResults([]);
    setSearchFeedback("");
  };

  // Compare Handler
  const toggleCompare = (pid: string) => {
    if (compareList.includes(pid)) {
      setCompareList(compareList.filter((id) => id !== pid));
    } else {
      if (compareList.length >= 3) {
        alert("একসাথে সর্বোচ্চ ৩টি জমি তুলনা করা যাবে।");
        return;
      }
      setCompareList([...compareList, pid]);
    }
  };

  const openComparisonModal = async () => {
    if (compareList.length === 0) {
      alert("তুলনা করার জন্য অন্তত একটি বিকল্প জমি যোগ করুন।");
      return;
    }
    // Include current parcel and compare items
    const idsToCompare = Array.from(new Set([currentParcelId, ...compareList])).slice(0, 3);
    setIsLoadingCompare(true);
    setShowCompareModal(true);

    try {
      const res = await apiRequest<{ parcels: ComparisonItem[] }>("/api/v1/gis/parcels/compare", {
        method: "POST",
        token,
        body: JSON.stringify({ parcel_ids: idsToCompare }),
      });
      setComparisonData(res.parcels || []);
    } catch {
      alert("তুলনামূলক ডেটা প্রস্তুত করা যায়নি।");
      setShowCompareModal(false);
    } finally {
      setIsLoadingCompare(false);
    }
  };

  // Contact Seller Handler
  const submitContactRequest = async () => {
    if (!contactModalItem) return;
    setIsContactSubmitting(true);
    setContactStatus("");

    try {
      const res = await apiRequest<{ status: string; message_bn: string }>(
        `/api/v1/gis/listings/${encodeURIComponent(contactModalItem.parcel_id)}/contact-request`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            listing_id: contactModalItem.listing_id,
            note: contactNote.trim() || "আমি এই জমিটি সম্পর্কে আগ্রহী।",
          }),
        }
      );
      setContactStatus(res.message_bn || "যোগাযোগের অনুরোধ সফলভাবে পাঠানো হয়েছে (সিমুলেশন)।");
    } catch {
      setContactStatus("অনুরোধ পাঠানো সম্ভব হয়নি।");
    } finally {
      setIsContactSubmitting(false);
    }
  };

  // Report Listing Handler
  const submitReport = async () => {
    if (!contactModalItem) return;
    setIsSubmittingReport(true);
    setReportStatus("");

    try {
      const res = await apiRequest<{ message_bn: string }>(
        `/api/v1/gis/listings/${encodeURIComponent(contactModalItem.parcel_id)}/report`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            listing_id: contactModalItem.listing_id,
            reason: reportReason.trim() || "বিজ্ঞাপনে তথ্য বিভ্রান্তি",
          }),
        }
      );
      setReportStatus(res.message_bn || "অভিযোগ জমা হয়েছে।");
    } catch {
      setReportStatus("রিপোর্ট জমা দেওয়া সম্ভব হয়নি।");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const getRiskBadgeClass = (color: string) => {
    switch (color) {
      case "green":
        return "badge-clean";
      case "amber":
        return "badge-medium";
      case "rose":
        return "badge-high";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div className="nearby-discovery-wrapper" style={{ display: "grid", gap: "24px", marginTop: "16px" }}>
      {/* ------------------------------------------------------------- */}
      {/* 1. HIERARCHICAL ADMINISTRATIVE SEARCH & CASCADING SELECTOR     */}
      {/* ------------------------------------------------------------- */}
      <section className="card location-search-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Compass size={22} style={{ color: "#5ee6cb" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                বাংলাদেশ প্রশাসনিক এলাকা ও খতিয়ান/দাগ অনুসন্ধান
              </h3>
              <small style={{ color: "#8da2b7", fontSize: "11px" }}>
                বিভাগ ➔ জেলা ➔ উপজেলা/থানা ➔ মৌজা ➔ দাগ / খতিয়ান ফিল্টার
              </small>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="button secondary"
            style={{ fontSize: "11px", padding: "6px 10px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RotateCcw size={13} /> রিসেট
          </button>
        </div>

        <form onSubmit={handleLocationSearch} style={{ display: "grid", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
            {/* Division Selector */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#8da2b7", marginBottom: "4px" }}>বিভাগ</label>
              <select
                value={selectedDivision}
                onChange={(e) => {
                  setSelectedDivision(e.target.value);
                  setSelectedDistrict("");
                  setSelectedUpazila("");
                  setSelectedMouza("");
                }}
                className="input-select"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#0d1725", color: "#e7eef8", border: "1px solid #1e2d3d" }}
              >
                <option value="">সকল বিভাগ</option>
                {divisions.map((div) => (
                  <option key={div.id || div.name_en} value={div.name_en}>
                    {div.name_bn} ({div.name_en})
                  </option>
                ))}
              </select>
            </div>

            {/* District Selector */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#8da2b7", marginBottom: "4px" }}>জেলা (৬৪ জেলা)</label>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedUpazila("");
                  setSelectedMouza("");
                }}
                className="input-select"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#0d1725", color: "#e7eef8", border: "1px solid #1e2d3d" }}
              >
                <option value="">জেলা নির্বাচন করুন</option>
                {districts
                  .filter((d) => !selectedDivision || d.division?.toLowerCase() === selectedDivision.toLowerCase())
                  .map((d) => (
                    <option key={d.id || d.name_en} value={d.name_en}>
                      {d.name_bn} ({d.name_en})
                    </option>
                  ))}
              </select>
            </div>

            {/* Upazila Selector */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#8da2b7", marginBottom: "4px" }}>উপজেলা / থানা</label>
              <select
                value={selectedUpazila}
                onChange={(e) => {
                  setSelectedUpazila(e.target.value);
                  setSelectedMouza("");
                }}
                disabled={upazilas.length === 0}
                className="input-select"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#0d1725", color: "#e7eef8", border: "1px solid #1e2d3d" }}
              >
                <option value="">উপজেলা নির্বাচন করুন</option>
                {upazilas.map((u) => (
                  <option key={u.id || u.name_en} value={u.name_en}>
                    {u.name_bn} ({u.type || u.name_en})
                  </option>
                ))}
              </select>
            </div>

            {/* Mouza Selector */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#8da2b7", marginBottom: "4px" }}>মৌজা</label>
              <select
                value={selectedMouza}
                onChange={(e) => setSelectedMouza(e.target.value)}
                disabled={mouzas.length === 0}
                className="input-select"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#0d1725", color: "#e7eef8", border: "1px solid #1e2d3d" }}
              >
                <option value="">{mouzas.length > 0 ? "সকল মৌজা" : "মৌজা নেই"}</option>
                {mouzas.map((m) => (
                  <option key={m.mouza_code || m.name_en} value={m.name_en}>
                    {m.name_bn} {m.jl_no ? `(জেএল: ${m.jl_no})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Honest Coverage Warning if Mouza is unavailable */}
          {mouzaCoverageMsg && (
            <div style={{ padding: "8px 12px", background: "rgba(141, 162, 183, 0.1)", border: "1px solid #234054", borderRadius: "6px", fontSize: "11px", color: "#8da2b7", display: "flex", alignItems: "center", gap: "8px" }}>
              <Info size={15} style={{ color: "#f2c77c", flexShrink: 0 }} />
              <span>{mouzaCoverageMsg}</span>
            </div>
          )}

          {/* Search Input for Dag / Khatian / Text */}
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="text"
                placeholder="দাগ নম্বর, খতিয়ান নম্বর, পার্সেল আইডি (যেমন: ১০৭, ১১১, LS-PARCEL-000001)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0d1725", color: "#fff", border: "1px solid #1e2d3d", fontSize: "13px" }}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="button primary"
              style={{ padding: "0 20px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}
            >
              <Search size={16} /> {isSearching ? "অনুসন্ধান হচ্ছে..." : "খুঁজুন"}
            </button>
          </div>
        </form>

        {/* Search Results Display */}
        {searchFeedback && (
          <div style={{ marginTop: "14px", padding: "10px", background: "rgba(248, 113, 113, 0.1)", border: "1px solid #f87171", borderRadius: "6px", fontSize: "12px", color: "#f87171" }}>
            {searchFeedback}
          </div>
        )}

        {searchResults.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "12px", color: "#5ee6cb", fontWeight: 700, marginBottom: "8px" }}>
              খুঁজে পাওয়া পার্সেল রেকর্ডসমূহ ({searchResults.length}টি):
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
              {searchResults.map((p) => {
                const isSaved = watchlist.includes(p.parcel_id);
                return (
                  <div
                    key={p.parcel_id}
                    className="ls-spotlight-interactive"
                    onPointerMove={(e) => onSpotlightMove(e, "1")}
                    onPointerLeave={onSpotlightLeave}
                    style={{
                      padding: "14px",
                      background: p.parcel_id === currentParcelId ? "rgba(13, 148, 136, 0.15)" : "var(--ls-surface, #0B1513)",
                      border: `1px solid ${p.parcel_id === currentParcelId ? "var(--ls-mint, #5EEAD4)" : "rgba(13, 148, 136, 0.25)"}`,
                      borderRadius: "12px",
                      display: "grid",
                      gap: "8px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)", fontSize: "14px", fontFamily: "var(--font-mono, monospace)" }}>
                        {p.parcel_id}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#f2c77c", fontWeight: 600 }}>{p.area_bn}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--ls-text-secondary, #A6BDB5)" }}>
                      {p.location_hierarchy?.mouza_bn}, {p.location_hierarchy?.upazila_bn}, {p.location_hierarchy?.district_bn}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: p.asking_price_bdt ? "#4ade80" : "#8da2b7" }}>
                      {p.price_formatted_bn}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "4px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onVerifyParcel) {
                            onVerifyParcel(p.parcel_id);
                          } else {
                            onSelectParcel(p.parcel_id);
                            if (onNavigateWorkflow) onNavigateWorkflow("journey");
                          }
                        }}
                        className="button primary"
                        style={{
                          padding: "7px 10px",
                          fontSize: "11px",
                          fontWeight: 700,
                          justifyContent: "center",
                          background: "var(--ls-emerald, #0D9488)",
                          color: "#080D0C",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          cursor: "pointer",
                        }}
                      >
                        <ShieldAlert size={12} /> {lang === "bn" ? "এই জমি যাচাই" : "Verify"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectParcel(p.parcel_id);
                          if (onNavigateToMap) onNavigateToMap();
                        }}
                        className="button secondary"
                        style={{
                          padding: "7px 10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          justifyContent: "center",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          cursor: "pointer",
                          background: "var(--ls-elevated, #10231F)",
                          color: "#F4F7F5",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        {p.parcel_id === currentParcelId ? "✓ নির্বাচিত" : (lang === "bn" ? "মানচিত্রে ➔" : "View Map ➔")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. NEARBY LAND ALTERNATIVES ("কাছাকাছি বিকল্প জমি")             */}
      {/* ------------------------------------------------------------- */}
      <section className="card nearby-alternatives-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MapPin size={22} style={{ color: "#4ade80" }} />
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#fff" }}>
                কাছাকাছি বিকল্প জমি (Nearby Land Alternatives)
              </h3>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#8da2b7" }}>
              নির্বাচিত পার্সেল <strong>{currentParcelId}</strong>-এর কেন্দ্রবিন্দু থেকে জিওডেসিক দূরত্বের ভিত্তিতে প্রস্তাবিত বিকল্প জমি।
            </p>
          </div>

          {/* Radius Filter Chips & Sort */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "4px", background: "#0d1725", padding: "4px", borderRadius: "8px", border: "1px solid #1e2d3d" }}>
              {[1, 3, 5, 10].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  style={{
                    background: radiusKm === r ? "#087d84" : "transparent",
                    color: radiusKm === r ? "#fff" : "#8da2b7",
                    border: 0,
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {r === 1 ? "১" : r === 3 ? "৩" : r === 5 ? "৫" : "১০"} কিমি
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ padding: "6px 10px", borderRadius: "8px", background: "#0d1725", color: "#e7eef8", border: "1px solid #1e2d3d", fontSize: "11px" }}
            >
              <option value="distance">দূরত্ব অনুযায়ী (নিকটবর্তী)</option>
              <option value="price_asc">মূল্য অনুযায়ী (কম থেকে বেশি)</option>
              <option value="completeness">নথিপত্রের সম্পূর্ণতা (সর্বোচ্চ)</option>
            </select>

            {compareList.length > 0 && (
              <button
                type="button"
                onClick={openComparisonModal}
                className="button primary"
                style={{ fontSize: "11px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Scale size={14} /> তুলনা দেখুন ({compareList.length + 1}/3)
              </button>
            )}
          </div>
        </div>

        {/* Disclaimer for Synthetic Demonstration Data */}
        <div style={{ padding: "8px 12px", background: "rgba(242, 199, 124, 0.08)", border: "1px solid rgba(242, 199, 124, 0.3)", borderRadius: "6px", fontSize: "11px", color: "#f2c77c", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            <strong>সতর্কতা:</strong> প্রদর্শিত বিকল্প জমি ও মূল্য ডেমো তথ্যাবলী (বাস্তব বিক্রয় প্রস্তাব নয়)। কোনো জমিকে '১০০% নিরাপদ' বা 'জালিয়াতিমুক্ত নিশ্চয়তা' দেওয়া হচ্ছে না। কেনার পূর্বে সরেজমিন তদন্ত আবশ্যক।
          </span>
        </div>

        {/* Alternatives Grid */}
        {isLoadingNearby ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#8da2b7", fontSize: "13px" }}>
            কাছাকাছি বিকল্প জমি গণনা করা হচ্ছে (হাওয়ারসাইন জিওডেসিক পরিমাপ)...
          </div>
        ) : nearbyError ? (
          <div style={{ padding: "16px", color: "#f87171", fontSize: "12px", textAlign: "center" }}>
            {nearbyError}
          </div>
        ) : alternatives.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#8da2b7", fontSize: "12px" }}>
            {radiusKm} কিলোমিটার ব্যাসার্ধের মধ্যে কোনো বিকল্প জমি রেকর্ড পাওয়া যায়নি। পরিসীমা বাড়িয়ে দেখুন।
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
            {alternatives.map((alt) => {
              const isComparing = compareList.includes(alt.parcel_id);
              const isSaved = watchlist.includes(alt.parcel_id);
              return (
                <div
                  key={alt.parcel_id}
                  className="alternative-card ls-spotlight-interactive"
                  onPointerMove={(e) => onSpotlightMove(e, "1")}
                  onPointerLeave={onSpotlightLeave}
                  style={{
                    background: "var(--ls-surface, #0B1513)",
                    border: "1px solid rgba(13, 148, 136, 0.28)",
                    borderRadius: "14px",
                    padding: "18px",
                    display: "grid",
                    gap: "12px",
                    position: "relative",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                    transition: "all 0.22s ease",
                  }}
                >
                  {/* Header: ID, Distance & Risk Badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "15px", color: "var(--ls-mint, #5EEAD4)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "-0.01em" }}>
                          {alt.parcel_id}
                        </strong>
                        {isSaved && (
                          <span style={{ fontSize: "10px", background: "rgba(94, 234, 212, 0.15)", color: "var(--ls-mint, #5EEAD4)", border: "1px solid rgba(94, 234, 212, 0.3)", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>
                            {lang === "bn" ? "সংরক্ষিত" : "Saved"}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--ls-text-secondary, #A6BDB5)", display: "flex", alignItems: "center", gap: "4px", marginTop: "3px" }}>
                        <MapPin size={12} style={{ color: "#4ade80", flexShrink: 0 }} /> {alt.distance_bn}
                      </span>
                    </div>
                    <span className={`badge ${getRiskBadgeClass(alt.risk_color)}`} style={{ fontSize: "10.5px", padding: "3px 9px", fontWeight: 700, borderRadius: "6px" }}>
                      {alt.risk_label_bn}
                    </span>
                  </div>

                  {/* Location & Area */}
                  <div style={{ fontSize: "12px", color: "var(--ls-text-secondary, #A6BDB5)", lineHeight: 1.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Layers size={13} style={{ color: "var(--ls-emerald, #0D9488)", flexShrink: 0 }} />
                      <span className="truncate">{alt.location.mouza_bn}, {alt.location.upazila_bn}, {alt.location.district_bn}</span>
                    </div>
                    <div style={{ color: "#F4F7F5", fontWeight: 600, marginTop: "3px" }}>
                      {lang === "bn" ? "রেকর্ডকৃত জমির আয়তন:" : "Recorded Area:"}{" "}
                      <span style={{ color: "#f2c77c", fontWeight: 700 }}>{alt.area_bn}</span>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div style={{ padding: "10px 12px", background: "var(--ls-elevated, #10231F)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: alt.asking_price_bdt ? "#4ade80" : "#8da2b7" }}>
                      {alt.price_formatted_bn}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--ls-text-secondary, #A6BDB5)", marginTop: "2px" }}>
                      {alt.price_per_shotok_formatted_bn} · <span style={{ color: "#f2c77c" }}>{alt.price_disclaimer_bn}</span>
                    </div>
                  </div>

                  {/* Evidence Completeness Meter */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--ls-text-secondary, #A6BDB5)", marginBottom: "5px" }}>
                      <span>{lang === "bn" ? "নথিপত্র যাচাই সম্পন্নতা:" : "Evidence Completeness:"}</span>
                      <strong style={{ color: "var(--ls-mint, #5EEAD4)" }}>{alt.evidence_completeness_pct}%</strong>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${alt.evidence_completeness_pct}%`,
                          height: "100%",
                          background: alt.evidence_completeness_pct >= 75 ? "#4ade80" : alt.evidence_completeness_pct >= 50 ? "#f2c77c" : "#f87171",
                          borderRadius: "3px",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* Mandatory Primary & Secondary Card Actions */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "2px" }}>
                    {/* Primary Action: এই জমি যাচাই */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onVerifyParcel) {
                          onVerifyParcel(alt.parcel_id);
                        } else {
                          onSelectParcel(alt.parcel_id);
                          if (onNavigateWorkflow) onNavigateWorkflow("journey");
                        }
                      }}
                      className="button primary ls-spotlight-interactive"
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        padding: "9px 10px",
                        justifyContent: "center",
                        background: "var(--ls-emerald, #0D9488)",
                        color: "#080D0C",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 0 16px rgba(94, 234, 212, 0.25)",
                        border: 0,
                        cursor: "pointer",
                      }}
                    >
                      <ShieldAlert size={14} />
                      <span>{lang === "bn" ? "এই জমি যাচাই" : "Verify Land"}</span>
                      <ArrowRight size={13} />
                    </button>

                    {/* Secondary Action: সংরক্ষণ করুন (Watchlist Toggle) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onToggleWatchlist) {
                          onToggleWatchlist(alt.parcel_id);
                        }
                      }}
                      className="button secondary ls-spotlight-interactive"
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "9px 10px",
                        justifyContent: "center",
                        background: isSaved ? "rgba(94, 234, 212, 0.15)" : "var(--ls-elevated, #10231F)",
                        border: `1px solid ${isSaved ? "var(--ls-mint, #5EEAD4)" : "rgba(255,255,255,0.12)"}`,
                        color: isSaved ? "var(--ls-mint, #5EEAD4)" : "#F4F7F5",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      <span>{isSaved ? (lang === "bn" ? "সংরক্ষিত ✓" : "Saved ✓") : (lang === "bn" ? "সংরক্ষণ করুন" : "Save")}</span>
                    </button>
                  </div>

                  {/* Multi-parcel Comparison & Lead Action Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => toggleCompare(alt.parcel_id)}
                      className="button secondary"
                      style={{
                        fontSize: "11px",
                        padding: "6px 8px",
                        justifyContent: "center",
                        background: isComparing ? "rgba(13, 148, 136, 0.25)" : "transparent",
                        borderColor: isComparing ? "var(--ls-mint, #5EEAD4)" : "rgba(255,255,255,0.1)",
                        color: isComparing ? "var(--ls-mint, #5EEAD4)" : "var(--ls-text-secondary, #A6BDB5)",
                        borderRadius: "8px",
                      }}
                    >
                      <Scale size={12} />
                      <span>{isComparing ? "✓ তালিকায়" : "+ তুলনা"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setContactModalItem(alt);
                        setContactStatus("");
                        setContactNote("");
                        setReportStatus("");
                        setIsReporting(false);
                      }}
                      style={{
                        background: "transparent",
                        border: "1px dashed rgba(255,255,255,0.15)",
                        borderRadius: "8px",
                        color: "var(--ls-text-secondary, #A6BDB5)",
                        padding: "6px 8px",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        cursor: "pointer",
                      }}
                    >
                      <PhoneCall size={12} style={{ color: "var(--ls-mint, #5EEAD4)" }} />
                      <span>{lang === "bn" ? "যোগাযোগ" : "Contact"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. MULTI-PARCEL COMPARISON MODAL                              */}
      {/* ------------------------------------------------------------- */}
      {showCompareModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(9, 17, 30, 0.85)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "850px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              background: "#0d1725",
              border: "1px solid #1e2d3d",
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Scale size={24} style={{ color: "#5ee6cb" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#fff" }}>পাশাপাশি জমি তুলনা (Multi-Parcel Comparison)</h3>
                  <small style={{ color: "#8da2b7" }}>নির্বাচিত জমি ও বিকল্প সমূহের নথিপত্র এবং ঝুঁকি ম্যাট্রিক্স</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="icon-button"
                style={{ color: "#8da2b7", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {isLoadingCompare ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#8da2b7" }}>তুলনামূলক বিশ্লেষণ তৈরি হচ্ছে...</div>
            ) : comparisonData.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#f87171" }}>তুলনার ডেটা পাওয়া যায়নি।</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e2d3d", color: "#8da2b7" }}>
                      <th style={{ padding: "10px", width: "180px" }}>বৈশিষ্ট্য</th>
                      {comparisonData.map((p) => (
                        <th key={p.parcel_id} style={{ padding: "10px", color: p.parcel_id === currentParcelId ? "#5ee6cb" : "#fff" }}>
                          {p.parcel_id} {p.parcel_id === currentParcelId ? "(বর্তমান জমি)" : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
                      <td style={{ padding: "10px", color: "#8da2b7" }}>অবস্থান (মৌজা/উপজেলা)</td>
                      {comparisonData.map((p) => (
                        <td key={p.parcel_id} style={{ padding: "10px" }}>{p.location_bn}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
                      <td style={{ padding: "10px", color: "#8da2b7" }}>জমির আয়তন</td>
                      {comparisonData.map((p) => (
                        <td key={p.parcel_id} style={{ padding: "10px", fontWeight: 700, color: "#f2c77c" }}>{p.area_bn}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
                      <td style={{ padding: "10px", color: "#8da2b7" }}>নমুনা মূল্য (BDT)</td>
                      {comparisonData.map((p) => (
                        <td key={p.parcel_id} style={{ padding: "10px", fontWeight: 700, color: p.asking_price_bdt ? "#4ade80" : "#8da2b7" }}>
                          {p.price_formatted_bn}
                          <div style={{ fontSize: "10px", fontWeight: 400, color: "#8da2b7" }}>{p.price_per_shotok_formatted_bn}</div>
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
                      <td style={{ padding: "10px", color: "#8da2b7" }}>জরিপ ধারাবাহিকতা</td>
                      {comparisonData.map((p) => (
                        <td key={p.parcel_id} style={{ padding: "10px" }}>{p.survey_status_bn}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
                      <td style={{ padding: "10px", color: "#8da2b7" }}>নামজারি রেকর্ড</td>
                      {comparisonData.map((p) => (
                        <td key={p.parcel_id} style={{ padding: "10px" }}>{p.mutation_status_bn}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
                      <td style={{ padding: "10px", color: "#8da2b7" }}>খাজনা দাখিলা অবস্থা</td>
                      {comparisonData.map((p) => (
                        <td key={p.parcel_id} style={{ padding: "10px" }}>{p.tax_status_bn}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
                      <td style={{ padding: "10px", color: "#8da2b7" }}>শনাক্ত ঝুঁকি স্তর</td>
                      {comparisonData.map((p) => (
                        <td key={p.parcel_id} style={{ padding: "10px" }}>
                          <span className={`badge ${p.risk_class === "LOW" ? "badge-clean" : p.risk_class === "MODERATE" ? "badge-medium" : "badge-high"}`}>
                            {p.risk_label_bn}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", color: "#8da2b7" }}>অ্যাকশন</td>
                      {comparisonData.map((p) => (
                        <td key={p.parcel_id} style={{ padding: "10px" }}>
                          {p.parcel_id === currentParcelId ? (
                            <span style={{ fontSize: "11px", color: "#5ee6cb", fontWeight: 700 }}>✓ নির্বাচিত</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectParcel(p.parcel_id);
                                setShowCompareModal(false);
                              }}
                              className="button primary"
                              style={{ fontSize: "11px", padding: "4px 8px" }}
                            >
                              এই জমি বাছুন
                            </button>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: "16px", padding: "10px", background: "rgba(141, 162, 183, 0.08)", borderRadius: "6px", fontSize: "11px", color: "#8da2b7", textAlign: "center" }}>
              তুলনামূলক মূল্যায়নটি ডেমো তথ্যাবলী নির্ভর। কোনো জমিকে শতভাগ ঝুঁকিহীন বিবেচনা না করে সরকারি রেকর্ডপত্র নিশ্চিত করুন।
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. PRIVACY-SAFE SELLER CONTACT & REPORTING MODAL              */}
      {/* ------------------------------------------------------------- */}
      {contactModalItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(9, 17, 30, 0.85)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "24px",
              background: "#0d1725",
              border: "1px solid #1e2d3d",
              borderRadius: "14px",
              display: "grid",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <PhoneCall size={22} style={{ color: "#5ee6cb" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>
                    {isReporting ? "বিজ্ঞাপন রিপোর্ট জমা দিন" : "বিক্রেতার সাথে যোগাযোগ (ডেমো)"}
                  </h3>
                  <small style={{ color: "#8da2b7" }}>পার্সেল: {contactModalItem.parcel_id}</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContactModalItem(null)}
                className="icon-button"
                style={{ color: "#8da2b7", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {!isReporting ? (
              <>
                {/* Seller Info Card */}
                <div style={{ padding: "12px", background: "#132337", borderRadius: "8px", display: "grid", gap: "6px" }}>
                  <div style={{ fontSize: "12px", color: "#8da2b7" }}>লিস্টিং বিক্রেতার বিবরণ:</div>
                  <strong style={{ fontSize: "14px", color: "#fff" }}>
                    {contactModalItem.seller_contact.seller_name}
                  </strong>
                  <div style={{ fontSize: "13px", color: "#5ee6cb", fontWeight: 700 }}>
                    ফোন: {contactModalItem.seller_contact.seller_phone_placeholder}
                  </div>
                  <div style={{ fontSize: "10px", color: "#8da2b7", marginTop: "2px" }}>
                    নমুনা মূল্য: {contactModalItem.price_formatted_bn} ({contactModalItem.area_bn})
                  </div>
                </div>

                <div style={{ padding: "8px 10px", background: "rgba(74, 222, 128, 0.1)", border: "1px solid #4ade80", borderRadius: "6px", fontSize: "11px", color: "#4ade80" }}>
                  <strong>🔒 গোপনীয়তা নিশ্চিতকরণ:</strong> মূল দলিল বা সরকারি রেকর্ড থেকে কোনো ব্যক্তিগত ফোন নম্বর প্রকাশ করা হয় না। শুধুমাত্র অনুমোদিত নমুনা যোগাযোগের জন্য ডেমো নম্বর প্রদর্শিত হয়েছে।
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#8da2b7", marginBottom: "4px" }}>
                    বার্তা বা অনুসন্ধানের নোট:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="আমি এই জমির মৌজা ও মূল্য সম্পর্কে কথা বলতে চাই..."
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      background: "#091321",
                      border: "1px solid #1e2d3d",
                      color: "#fff",
                      fontSize: "12px",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                {contactStatus && (
                  <div style={{ padding: "8px", background: "rgba(94, 230, 203, 0.1)", border: "1px solid #5ee6cb", borderRadius: "6px", fontSize: "11px", color: "#5ee6cb" }}>
                    {contactStatus}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={submitContactRequest}
                    disabled={isContactSubmitting}
                    className="button primary"
                    style={{ flex: 1, padding: "8px", fontSize: "12px", justifyContent: "center" }}
                  >
                    {isContactSubmitting ? "পাঠানো হচ্ছে..." : "যোগাযোগ অনুরোধ পাঠান"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReporting(true);
                      setReportStatus("");
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid #f87171",
                      color: "#f87171",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                    }}
                  >
                    <Flag size={13} /> রিপোর্ট করুন
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: "10px", background: "rgba(248, 113, 113, 0.1)", border: "1px solid #f87171", borderRadius: "6px", fontSize: "11px", color: "#f87171" }}>
                  সন্দেহভাজন বিজ্ঞাপন বা ভুল তথ্য পরিলক্ষিত হলে অভিযোগ জমা দিন।
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#8da2b7", marginBottom: "4px" }}>
                    রিপোর্টের কারণ উল্লেখ করুন:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="সীমানা গড়মিল, অতিরিক্ত অসঙ্গতিপূর্ণ দাম বা অনুপযুক্ত তথ্য..."
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      background: "#091321",
                      border: "1px solid #1e2d3d",
                      color: "#fff",
                      fontSize: "12px",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                {reportStatus && (
                  <div style={{ padding: "8px", background: "rgba(94, 230, 203, 0.1)", border: "1px solid #5ee6cb", borderRadius: "6px", fontSize: "11px", color: "#5ee6cb" }}>
                    {reportStatus}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={submitReport}
                    disabled={isSubmittingReport}
                    className="button"
                    style={{ flex: 1, background: "#f87171", color: "#000", fontWeight: 700, padding: "8px", fontSize: "12px", justifyContent: "center", border: 0, borderRadius: "6px" }}
                  >
                    {isSubmittingReport ? "জমা হচ্ছে..." : "অভিযোগ নিশ্চিত করুন"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReporting(false)}
                    className="button secondary"
                    style={{ padding: "8px 12px", fontSize: "11px" }}
                  >
                    বাতিল
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
