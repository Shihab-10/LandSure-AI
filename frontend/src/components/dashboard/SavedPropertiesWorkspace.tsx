import { useState, useEffect } from "react";
import {
  BookmarkCheck, MapPinned, ShieldAlert, Trash2, ArrowRight,
  ExternalLink, Layers, Sparkles
} from "lucide-react";
import { apiRequest } from "../../api";
import type { ParcelDetails } from "../../types/dashboard";

interface SavedPropertiesWorkspaceProps {
  savedIds: string[];
  selectedParcelId: string;
  onSelectParcel: (id: string) => void;
  onStartVerification: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onRemoveSaved: (id: string) => void;
  token?: string;
  lang: "bn" | "en";
}

export function SavedPropertiesWorkspace({
  savedIds,
  selectedParcelId,
  onSelectParcel,
  onStartVerification,
  onViewOnMap,
  onRemoveSaved,
  token,
  lang,
}: SavedPropertiesWorkspaceProps) {
  const [parcelsData, setParcelsData] = useState<Record<string, ParcelDetails>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (savedIds.length === 0) return;

    let isMounted = true;
    setLoading(true);

    async function loadAll() {
      const results: Record<string, ParcelDetails> = {};
      for (const id of savedIds) {
        try {
          const res = await apiRequest<{ parcel?: ParcelDetails } | ParcelDetails>(
            `/api/v1/parcels/${encodeURIComponent(id)}`,
            { token }
          );
          const details = (res as { parcel?: ParcelDetails }).parcel ?? (res as ParcelDetails);
          results[id] = details;
        } catch {
          results[id] = { parcel_id: id };
        }
      }
      if (isMounted) {
        setParcelsData((prev) => ({ ...prev, ...results }));
        setLoading(false);
      }
    }

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [savedIds, token]);

  if (savedIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-surface/40 p-12 text-center my-6">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-4">
          <BookmarkCheck className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-foreground">
          {lang === "bn" ? "কোনো সংরক্ষিত জমি পাওয়া যায়নি" : "No Saved Properties Yet"}
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          {lang === "bn"
            ? "আপনার পছন্দের জমি সংরক্ষণ করে রাখতে 'জমি খুঁজুন' মডিউলে গিয়ে যেকোনো জমির পাশে 'সংরক্ষণ করুন' বাটনে ক্লিক করুন।"
            : "Explore available parcels in the Find Land explorer and save properties to monitor and verify them later."}
        </p>
        <button
          type="button"
          onClick={() => onViewOnMap("LS-PARCEL-000001")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
        >
          <MapPinned className="h-4 w-4" />
          <span>{lang === "bn" ? "জমি খুঁজুন ও ব্রাউজ করুন" : "Browse Land Explorer"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
            <BookmarkCheck className="h-4 w-4" />
            <span>{lang === "bn" ? "মডিউল ২ — সংরক্ষিত জমি" : "MODULE 2 — SAVED PROPERTIES"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
            {lang === "bn" ? "সংরক্ষিত জমির তালিকা" : "Your Saved Land Portfolio"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? `মোট ${savedIds.length}টি জমি সংরক্ষিত রয়েছে। যেকোনো জমি নির্বাচন করে বিস্তারিত বা যাচাই শুরু করতে পারেন।`
              : `${savedIds.length} properties saved. Select any parcel to inspect details or start due diligence.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onViewOnMap(selectedParcelId)}
          className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-elevated/70 px-4 py-2.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-elevated"
        >
          <MapPinned className="h-4 w-4 text-primary" />
          <span>{lang === "bn" ? "মানচিত্রে নতুন জমি খুঁজুন" : "Explore Map Listings"}</span>
        </button>
      </div>

      {/* Grid of Saved Property Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {savedIds.map((id) => {
          const parcel = parcelsData[id];
          const isSelected = id === selectedParcelId;

          const title =
            parcel?.display_name_bn ||
            parcel?.display_name_en ||
            (lang === "bn" ? "বিরুলিয়া নাল জমি" : "Birulia Agricultural Land");

          const locationText =
            parcel?.district_name_bn && parcel?.upazila_name_bn
              ? `${parcel.district_name_bn} › ${parcel.upazila_name_bn} › ${parcel.mouza_name_bn || ""}`
              : parcel?.district_name_en && parcel?.upazila_name_en
              ? `${parcel.district_name_en} › ${parcel.upazila_name_en}`
              : lang === "bn" ? "ঢাকা › সাভার › বিরুলিয়া" : "Dhaka › Savar › Birulia";

          const area = parcel?.reference_area_decimal
            ? `${parcel.reference_area_decimal} ${lang === "bn" ? "শতাংশ" : "Decimals"}`
            : lang === "bn" ? "৪৭.৫৭ শতাংশ" : "47.57 Dec";

          const landClass =
            parcel?.land_classification_bn ||
            (lang === "bn" ? "নাল জমি (কৃষি)" : "Agricultural Land");

          return (
            <div
              key={id}
              className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 ${
                isSelected
                  ? "border-primary/50 bg-surface/90 shadow-glow"
                  : "border-border/60 bg-surface/60 hover:border-border hover:bg-surface/80"
              }`}
            >
              {/* Card Top: Badges & Remove */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-elevated border border-primary/25 text-primary">
                      {id}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                        {lang === "bn" ? "নির্বাচিত" : "Active"}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveSaved(id)}
                    title={lang === "bn" ? "সংরক্ষণ থেকে সরান" : "Remove from saved"}
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground/70 transition hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Title & Classification */}
                <h4 className="text-base font-bold text-foreground line-clamp-1">{title}</h4>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                  <span className="truncate">{locationText}</span>
                </div>

                {/* Key Metrics */}
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-background/50 border border-border/40 p-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      {lang === "bn" ? "জমির আয়তন" : "Recorded Area"}
                    </span>
                    <strong className="text-foreground font-semibold">{area}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      {lang === "bn" ? "শ্রেণী" : "Classification"}
                    </span>
                    <span className="text-foreground/90 font-medium truncate block">{landClass}</span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="mt-5 pt-4 border-t border-border/40 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectParcel(id);
                      onViewOnMap(id);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-elevated/50 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:bg-elevated hover:text-foreground"
                  >
                    <MapPinned className="h-3.5 w-3.5 text-primary" />
                    <span>{lang === "bn" ? "মানচিত্রে দেখুন" : "View on Map"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectParcel(id)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-elevated/50 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:bg-elevated hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{lang === "bn" ? "বিবরণ দেখুন" : "Overview"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectParcel(id);
                    onStartVerification(id);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-glow transition hover:scale-[1.01]"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>{lang === "bn" ? "যাচাই শুরু করুন" : "Start Verification"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
          <Sparkles className="h-4 w-4 text-primary animate-spin" />
          <span>{lang === "bn" ? "সংরক্ষিত জমির তথ্য সিঙ্ক হচ্ছে..." : "Syncing saved properties..."}</span>
        </div>
      )}
    </div>
  );
}
