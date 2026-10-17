import React, { useState, useEffect } from "react";
import {
  Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, RotateCw,
  RefreshCw, Check, MapPin, Calculator, ShieldAlert, Sparkles, FileCheck2, Info, Eye
} from "lucide-react";
import { apiRequest } from "../api";

interface SampleDeed {
  id: string;
  title_bn: string;
  title_en: string;
  sample_text: string;
  target_parcel_id: string;
  quality: string;
}

interface PageInfo {
  page_number: number;
  width: number;
  height: number;
  rotation: number;
  has_text_layer: boolean;
  raw_text: string;
  preview_image_b64?: string;
}

interface UploadResponse {
  filename: string;
  format: string;
  size_bytes: number;
  sha256: string;
  page_count: number;
  pages: PageInfo[];
  status: string;
}

interface ExtractedField {
  field_name: string;
  raw_value: string | null;
  normalized_value: any;
  confidence: number;
  source_page?: number;
  bounding_box?: number[] | null;
  extraction_method: string;
  review_status: string;
  unit?: string;
}

interface ExtractionResponse {
  status: string;
  ocr_metrics: {
    total_lines: number;
    average_confidence: number;
    engine: string;
  };
  extracted_fields: Record<string, ExtractedField>;
  parcel_matching: {
    status: string;
    best_match?: {
      parcel_id: string;
      match_score: number;
      confidence_grade: string;
      district_code: string;
      upazila_code: string;
      mouza_code: string;
      reference_area_decimal: number;
      reasons: string[];
    };
    candidate_count: number;
    candidates: any[];
    discrepancies: string[];
    disclaimer_bn: string;
  };
  raw_text: string;
}

interface DocumentIntelligenceProps {
  token: string;
  lang: "bn" | "en";
  onSelectParcel: (parcelId: string) => void;
  onNavigateWorkflow: (target: "explorer" | "verification" | "tax_calc" | "ownership") => void;
  onSetCalculatorValues?: (deedValue: number, areaDecimal: number) => void;
}

export const DocumentIntelligence: React.FC<DocumentIntelligenceProps> = ({
  token,
  lang,
  onSelectParcel,
  onNavigateWorkflow,
  onSetCalculatorValues,
}) => {
  const [samples, setSamples] = useState<SampleDeed[]>([]);
  const [selectedSample, setSelectedSample] = useState<SampleDeed | null>(null);
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [extractionResult, setExtractionResult] = useState<ExtractionResponse | null>(null);
  const [editableFields, setEditableFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Load safe synthetic sample deeds
  useEffect(() => {
    apiRequest<{ samples: SampleDeed[] }>("/api/v1/documents/samples")
      .then((res) => {
        setSamples(res.samples || []);
      })
      .catch((err) => {
        console.error("Failed to load sample deeds:", err);
      });
  }, []);

  // Handle Drag & Drop / File Upload
  const handleFileUpload = async (file: File) => {
    setError(null);
    setConfirmStatus(null);
    setExtractionResult(null);
    setSelectedSample(null);
    setBusy(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiRequest<UploadResponse>("/api/v1/documents/upload", {
        method: "POST",
        token,
        body: formData,
      });
      setUploadData(res);
      setCurrentPage(1);
      const initialRot: Record<number, number> = {};
      res.pages.forEach((p) => {
        initialRot[p.page_number] = p.rotation || 0;
      });
      setPageRotations(initialRot);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(formatErrorMessage(raw, lang));
    } finally {
      setBusy(false);
    }
  };

  // Rotate Page
  const rotatePage = (pageNum: number, direction: "cw" | "ccw") => {
    setPageRotations((prev) => {
      const current = prev[pageNum] || 0;
      const next = direction === "cw" ? (current + 90) % 360 : (current - 90 + 360) % 360;
      return { ...prev, [pageNum]: next };
    });
  };

  // Run Extraction for Uploaded Document or Synthetic Sample
  const runExtraction = async (sample?: SampleDeed) => {
    setError(null);
    setConfirmStatus(null);
    setBusy(true);

    try {
      const payload: any = {};
      if (sample) {
        payload.sample_id = sample.id;
      } else if (uploadData) {
        payload.document_hash = uploadData.sha256;
        payload.page_rotations = pageRotations;
        const textLayers = uploadData.pages.map((p) => p.raw_text).filter(Boolean);
        if (textLayers.length > 0) {
          payload.custom_text = textLayers.join("\n\n");
        }
      }

      const res = await apiRequest<ExtractionResponse>("/api/v1/documents/extract", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      setExtractionResult(res);

      // Initialize user-editable field values
      const initialForm: Record<string, string> = {};
      Object.entries(res.extracted_fields).forEach(([key, val]) => {
        initialForm[key] = val.raw_value ? String(val.raw_value) : "";
      });
      setEditableFields(initialForm);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(formatErrorMessage(raw, lang));
    } finally {
      setBusy(false);
    }
  };

  // User confirms corrections
  const confirmCorrections = async () => {
    if (!extractionResult) return;
    setBusy(true);
    setError(null);

    try {
      const targetParcel = extractionResult.parcel_matching.best_match?.parcel_id;
      const res = await apiRequest<{ status: string; target_parcel_id: string; message_bn: string }>("/api/v1/documents/confirm", {
        method: "POST",
        token,
        body: JSON.stringify({
          document_hash: uploadData?.sha256 || "synthetic_sample_hash",
          corrected_fields: editableFields,
          target_parcel_id: targetParcel,
        }),
      });

      setConfirmStatus(res.message_bn || "দলিল তথ্য সফলভাবে নিশ্চিত ও সংরক্ষিত হয়েছে।");
      if (res.target_parcel_id) {
        onSelectParcel(res.target_parcel_id);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(formatErrorMessage(raw, lang));
    } finally {
      setBusy(false);
    }
  };

function formatErrorMessage(rawError: string, lang: "bn" | "en"): string {
  const lower = rawError.toLowerCase();
  if (lower.includes("empty") || lower.includes("0 bytes")) {
    return lang === "bn" ? "আপলোড করা ফাইলটি ফাঁকা (০ বাইট)। অনুগ্রহ করে সঠিক ফাইল নির্বাচন করুন।" : "Uploaded file is empty (0 bytes).";
  }
  if (lower.includes("maximum allowed size") || lower.includes("15 mb") || lower.includes("too large")) {
    return lang === "bn" ? "ফাইলের আকার সর্বোচ্চ ১৫ মেগাবাইট অতিক্রম করেছে।" : "File size exceeds the 15 MB limit.";
  }
  if (lower.includes("unsupported file extension") || lower.includes("signature mismatch") || lower.includes("header signature")) {
    return lang === "bn" ? "অসমর্থিত ফাইল ফরম্যাট বা করাপ্টেড ফাইল। শুধুমাত্র PDF, JPG, PNG, WEBP সমর্থিত।" : "Unsupported file format. Please upload a valid PDF, JPG, PNG or WEBP.";
  }
  if (lower.includes("password-protected") || lower.includes("encrypted")) {
    return lang === "bn" ? "পাসওয়ার্ড-সংরক্ষিত পিডিএফ প্রক্রিয়া করা সম্ভব নয়। অনুগ্রহ করে আনলক করা দলিল আপলোড করুন।" : "Password-protected PDF cannot be processed. Please provide an unencrypted deed.";
  }
  if (lower.includes("corrupted") || lower.includes("malformed")) {
    return lang === "bn" ? "দলিল ফাইলের গঠন নষ্ট বা অপাঠ্য।" : "Document file structure is corrupted or unreadable.";
  }
  if (lower.includes("page count") || lower.includes("page limit")) {
    return lang === "bn" ? "দলিলের পৃষ্ঠা সংখ্যা সর্বোচ্চ সীমা (২০ পৃষ্ঠা) অতিক্রম করেছে।" : "Document exceeds the maximum 20-page limit.";
  }
  if (lower.includes("authentication required") || lower.includes("401")) {
    return lang === "bn" ? "দলিল আপলোড ও বিশ্লেষণের জন্য অনুগ্রহ করে লগইন বা ডেমো মোড চালু করুন।" : "Authentication required. Please sign in or use Demo Login.";
  }
  return rawError;
}

  // Key field labels
  const fieldLabels: Record<string, { bn: string; en: string }> = {
    deed_number: { bn: "দলিল নম্বর", en: "Deed Number" },
    deed_type: { bn: "দলিলের প্রকৃতি / ধরন", en: "Deed Type" },
    registration_date: { bn: "রেজিস্ট্রি তারিখ", en: "Registration Date" },
    sub_registry_office: { bn: "সাব-রেজিস্ট্রি কার্যালয়", en: "Sub-Registry Office" },
    seller_name: { bn: "দাতা / বিক্রেতার নাম", en: "Seller Name" },
    buyer_name: { bn: "গ্রহীতা / ক্রেতার নাম", en: "Buyer Name" },
    district: { bn: "জেলা", en: "District" },
    upazila: { bn: "উপজেলা / থানা", en: "Upazila" },
    mouza: { bn: "মৌজা", en: "Mouza" },
    jl_number: { bn: "জে এল নম্বর", en: "JL Number" },
    khatian_number: { bn: "খতিয়ান নম্বর", en: "Khatian Number" },
    dag_number: { bn: "দাগ নম্বর", en: "Dag Number" },
    survey_type: { bn: "জরিপের ধরন", en: "Survey Type" },
    land_area: { bn: "জমির পরিমাণ ও একক", en: "Land Area" },
    deed_value: { bn: "দলিল মূল্য (টাকা)", en: "Deed Value (BDT)" },
    land_classification: { bn: "জমির শ্রেণী (নাল/ভিটি)", en: "Land Classification" },
    previous_ownership_references: { bn: "বায়া দলিল / পূর্ববর্তী রেকর্ড", en: "Baya / Previous Deed" },
    boundaries: { bn: "চৌহদ্দি / সীমানা", en: "Boundaries" },
    mutation_reference: { bn: "নামজারি খতিয়ান", en: "Mutation Reference" },
  };

  return (
    <div className="doc-intel-module" style={{ display: "grid", gap: "20px" }}>
      {/* 1. Header & Safe Synthetic Demo Banner */}
      <div className="panel" style={{ padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontSize: "18px", margin: "0 0 6px", color: "#5ee6cb", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileCheck2 size={20} />
              {lang === "bn" ? "দলিল ইন্টেলিজেন্স ও বাংলা ওসিআর পাইপলাইন" : "Document Intelligence & Bangla OCR Pipeline"}
            </h2>
            <p style={{ fontSize: "12px", color: "#8da2b7", margin: 0 }}>
              {lang === "bn"
                ? "পিডিএফ বা দলিলের ছবি আপলোড করুন অথবা ডেমো পরীক্ষার জন্য সিন্থেটিক দলিল বেছে নিন।"
                : "Upload PDF / Deed photo or test with safe synthetic deed samples."}
            </p>
          </div>
          <div style={{ background: "#11332f", border: "1px solid #1b6258", padding: "6px 12px", borderRadius: "20px", fontSize: "11px", color: "#64dfc5", fontWeight: 700 }}>
            {lang === "bn" ? "নিরাপদ সিন্থেটিক পরিবেশ" : "Safe Synthetic Sandbox"}
          </div>
        </div>

        {/* Quick Sample Deed Selector */}
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#8da2b7", marginBottom: "8px", textTransform: "uppercase" }}>
            {lang === "bn" ? "⚡ দ্রুত ডেমো পরীক্ষা করুন (নিরাপদ নমুনা দলিল):" : "⚡ Quick Demo Test (Safe Synthetic Samples):"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {samples.map((s) => (
              <button
                key={s.id}
                className="action-card"
                style={{
                  padding: "10px 14px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: selectedSample?.id === s.id ? "1px solid #5ee6cb" : "1px solid #213449",
                  background: selectedSample?.id === s.id ? "#12382f" : "#101d2d",
                  color: selectedSample?.id === s.id ? "#5ee6cb" : "#e7eef8",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSelectedSample(s);
                  setUploadData(null);
                  runExtraction(s);
                }}
              >
                <strong>{lang === "bn" ? s.title_bn : s.title_en}</strong>
                <span style={{ display: "block", fontSize: "10px", color: "#8da2b7", marginTop: "3px" }}>
                  {s.quality} · {s.target_parcel_id}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Upload Dropzone Area */}
      <div
        className="panel"
        style={{
          padding: "30px",
          border: dragOver ? "2px dashed #5ee6cb" : "2px dashed #234054",
          background: dragOver ? "#0d2627" : "#0a1626",
          textAlign: "center",
          borderRadius: "12px",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
          }
        }}
      >
        <Upload size={38} style={{ color: "#5ee6cb", margin: "auto", marginBottom: "12px" }} />
        <h3 style={{ fontSize: "16px", margin: "0 0 8px" }}>
          {lang === "bn" ? "দলিল ফাইল ড্র্যাগ করুন অথবা ক্লিক করে নির্বাচন করুন" : "Drag and drop Deed file or browse to upload"}
        </h3>
        <p style={{ fontSize: "12px", color: "#8da2b7", margin: "0 0 16px" }}>
          {lang === "bn"
            ? "সমর্থিত ফরম্যাট: PDF, JPG, PNG, WEBP (সর্বোচ্চ ১৫ মেগাবাইট এবং ২০ পৃষ্ঠা পর্যন্ত)"
            : "Supported: PDF, JPG, PNG, WEBP (Max 15MB, up to 20 pages)"}
        </p>

        <label className="primary" style={{ cursor: "pointer", display: "inline-flex" }}>
          {lang === "bn" ? "কম্পিউটার থেকে ফাইল বাছুন" : "Choose File"}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
        </label>
      </div>

      {/* Error or Notice Display */}
      {error && (
        <div style={{ background: "#3d181e", border: "1px solid #732a35", color: "#ffaaa8", padding: "14px 18px", borderRadius: "10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* 3. Uploaded Document Preview & Rotation Carousel */}
      {uploadData && (
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <strong style={{ fontSize: "14px", color: "#e7eef8" }}>{uploadData.filename}</strong>
              <div style={{ fontSize: "11px", color: "#8da2b7", marginTop: "3px" }}>
                SHA-256: <code>{uploadData.sha256.slice(0, 24)}...</code> · {uploadData.page_count} {lang === "bn" ? "পৃষ্ঠা" : "pages"} · {(uploadData.size_bytes / 1024).toFixed(1)} KB
              </div>
            </div>

            <button
              className="primary"
              disabled={busy}
              onClick={() => runExtraction()}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <Sparkles size={16} />
              {lang === "bn" ? "ওসিআর ও তথ্য বিশ্লেষণ শুরু করুন" : "Run Bangla OCR Extraction"}
            </button>
          </div>

          {/* Page Carousel & Rotation Controls */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 260px))", gap: "16px" }}>
            {uploadData.pages.map((p) => {
              const rot = pageRotations[p.page_number] || 0;
              return (
                <div key={p.page_number} style={{ background: "#0b1725", border: "1px solid #1a3044", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#8da2b7", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                    <span>{lang === "bn" ? `পৃষ্ঠা ${p.page_number}` : `Page ${p.page_number}`}</span>
                    <span className={`tag ${p.has_text_layer ? "low" : "medium"}`}>
                      {p.has_text_layer ? (lang === "bn" ? "ডিজিটাল টেক্সট" : "Text Layer") : (lang === "bn" ? "স্ক্যান ছবি" : "Scanned Image")}
                    </span>
                  </div>

                  {/* Preview Image with rotation CSS */}
                  <div style={{ width: "100%", height: "220px", display: "grid", placeItems: "center", overflow: "hidden", background: "#050d18", borderRadius: "6px" }}>
                    {p.preview_image_b64 ? (
                      <img
                        src={p.preview_image_b64}
                        alt={`Page ${p.page_number}`}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                          transform: `rotate(${rot}deg)`,
                          transition: "transform 0.3s ease",
                        }}
                      />
                    ) : (
                      <div style={{ color: "#546a80", fontSize: "11px" }}>
                        <FileText size={34} style={{ margin: "auto", marginBottom: "6px" }} />
                        No preview
                      </div>
                    )}
                  </div>

                  {/* Rotation Toolbar */}
                  <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "10px" }}>
                    <button
                      className="icon-button"
                      title="Rotate Counter-Clockwise"
                      onClick={() => rotatePage(p.page_number, "ccw")}
                      style={{ background: "#16283b", borderRadius: "6px", padding: "6px" }}
                    >
                      <RotateCcw size={15} /> ⟲ 90°
                    </button>
                    <button
                      className="icon-button"
                      title="Rotate Clockwise"
                      onClick={() => rotatePage(p.page_number, "cw")}
                      style={{ background: "#16283b", borderRadius: "6px", padding: "6px" }}
                    >
                      ⟳ 90° <RotateCw size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Structured Extraction Results & Verification Cross-Check */}
      {extractionResult && (
        <div style={{ display: "grid", gap: "18px" }}>
          {/* Top OCR Metrics */}
          <div className="panel" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="action-icon"><Sparkles size={18} /></div>
                <div>
                  <strong style={{ fontSize: "14px", color: "#5ee6cb" }}>
                    {lang === "bn" ? "ওসিআর ও কাঠামোবদ্ধ তথ্য নিষ্কাশন সম্পন্ন" : "Bangla OCR Extraction Complete"}
                  </strong>
                  <div style={{ fontSize: "11px", color: "#8da2b7" }}>
                    ইঞ্জিন: {extractionResult.ocr_metrics.engine} · লাইন সংখ্যা: {extractionResult.ocr_metrics.total_lines} · গড় নির্ভুলতা: {(extractionResult.ocr_metrics.average_confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <span className="tag low">
                  <CheckCircle2 size={12} /> {lang === "bn" ? "প্রমাণযোগ্য নিষ্কাশন" : "Evidence-Linked"}
                </span>
              </div>
            </div>
          </div>

          {/* Synthetic Parcel Matching Card */}
          {extractionResult.parcel_matching && (
            <div className="panel" style={{ padding: "20px", border: "1px solid #1c6d5b", background: "linear-gradient(130deg, #0e2a2c, #0a1727)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="tag low">{extractionResult.parcel_matching.best_match?.parcel_id || "PARCEL_MATCH"}</span>
                  <strong style={{ fontSize: "14px", color: "#e7eef8" }}>
                    {lang === "bn" ? "সিন্থেটিক পার্সেল ক্রস-রেকর্ড ম্যাচ" : "Cross-Record Parcel Match"}
                  </strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#8da2b7" }}>{lang === "bn" ? "ম্যাচ স্কোর:" : "Match Score:"}</span>
                  <strong style={{ fontSize: "16px", color: "#5ee6cb" }}>
                    {extractionResult.parcel_matching.best_match?.match_score || 0}%
                  </strong>
                </div>
              </div>

              {/* Match Reasons */}
              {extractionResult.parcel_matching.best_match?.reasons && (
                <div style={{ display: "grid", gap: "6px", margin: "10px 0" }}>
                  {extractionResult.parcel_matching.best_match.reasons.map((r, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6fe9ce" }}>
                      <Check size={14} /> {r}
                    </div>
                  ))}
                </div>
              )}

              {/* Discrepancies if any */}
              {extractionResult.parcel_matching.discrepancies.length > 0 && (
                <div style={{ marginTop: "12px", background: "#331a1d", border: "1px solid #6b2e35", padding: "10px 14px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#ffaaa8", marginBottom: "4px" }}>
                    {lang === "bn" ? "সম্ভাব্য অমিল / ক্রস-চেক সংকেত:" : "Potential Discrepancies:"}
                  </div>
                  {extractionResult.parcel_matching.discrepancies.map((d, i) => (
                    <div key={i} style={{ fontSize: "11px", color: "#ffccd0" }}>• {d}</div>
                  ))}
                </div>
              )}

              {/* Connected Workflows Toolbar */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "16px" }}>
                {extractionResult.parcel_matching.best_match && (
                  <>
                    <button
                      className="primary"
                      onClick={() => {
                        const pid = extractionResult.parcel_matching.best_match!.parcel_id;
                        onSelectParcel(pid);
                        onNavigateWorkflow("explorer");
                      }}
                      style={{ padding: "8px 14px", fontSize: "11px" }}
                    >
                      <MapPin size={14} /> {lang === "bn" ? "মানচিত্রে পার্সেল দেখুন" : "View on Map"}
                    </button>

                    <button
                      className="action-card"
                      onClick={() => {
                        const pid = extractionResult.parcel_matching.best_match!.parcel_id;
                        onSelectParcel(pid);
                        onNavigateWorkflow("verification");
                      }}
                      style={{ padding: "8px 14px", fontSize: "11px", cursor: "pointer", background: "#16283b" }}
                    >
                      <ShieldAlert size={14} /> {lang === "bn" ? "এমএল ঝুঁকি পর্যালোচনা" : "ML Risk Review"}
                    </button>

                    <button
                      className="action-card"
                      onClick={() => {
                        const deedVal = extractionResult.extracted_fields.deed_value?.normalized_value || 5000000;
                        const areaDec = extractionResult.extracted_fields.land_area?.normalized_value || 5.0;
                        if (onSetCalculatorValues) {
                          onSetCalculatorValues(Number(deedVal), Number(areaDec));
                        }
                        onNavigateWorkflow("tax_calc");
                      }}
                      style={{ padding: "8px 14px", fontSize: "11px", cursor: "pointer", background: "#16283b" }}
                    >
                      <Calculator size={14} /> {lang === "bn" ? "নিবন্ধন খরচ হিসাব" : "Calculate Registration"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* User Review & Editable Field Form */}
          <div className="panel" style={{ padding: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ fontSize: "15px", margin: "0 0 4px", color: "#e7eef8" }}>
                  {lang === "bn" ? "দলিল তথ্যের সঠিকতা যাচাই ও ব্যবহারকারীর সংশোধন" : "Review Extracted Values & User Corrections"}
                </h3>
                <p style={{ fontSize: "11px", color: "#8da2b7", margin: 0 }}>
                  {lang === "bn"
                    ? "কোনো ঘরে ভুল তথ্য থাকলে সরাসরি এডিট করে সংরক্ষণ করুন। এটি পার্সেল ভেরিফিকেশনে ব্যবহৃত হবে।"
                    : "Edit any low-confidence or incorrect values before saving to parcel verification."}
                </p>
              </div>

              <button
                className="primary"
                disabled={busy}
                onClick={confirmCorrections}
                style={{ padding: "10px 18px", fontSize: "12px" }}
              >
                <Check size={16} />
                {lang === "bn" ? "সংশোধন সংরক্ষণ ও নিশ্চিত করুন" : "Confirm & Save Corrections"}
              </button>
            </div>

            {confirmStatus && (
              <div style={{ background: "#123d33", border: "1px solid #1c6d5b", color: "#5ee6cb", padding: "12px 16px", borderRadius: "8px", fontSize: "12px", marginBottom: "16px" }}>
                ✓ {confirmStatus}
              </div>
            )}

            {/* Field Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
              {Object.entries(fieldLabels).map(([key, label]) => {
                const meta = extractionResult.extracted_fields[key];
                const conf = meta ? meta.confidence : 0;
                const isLowConf = conf < 0.8 && conf > 0;
                const isNotFound = !meta || conf === 0;

                return (
                  <div
                    key={key}
                    style={{
                      background: "#0c1827",
                      border: isLowConf ? "1px solid #735324" : isNotFound ? "1px solid #3d2328" : "1px solid #1a2f44",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#d8e5f0" }}>
                        {lang === "bn" ? label.bn : label.en}
                      </span>

                      {/* Confidence Tag */}
                      <span
                        className={`tag ${conf >= 0.85 ? "low" : isLowConf ? "medium" : "high"}`}
                        style={{ fontSize: "9px" }}
                      >
                        {isNotFound
                          ? (lang === "bn" ? "অনুপস্থিত" : "Missing")
                          : `${(conf * 100).toFixed(0)}% কনফিডেন্স`}
                      </span>
                    </div>

                    <input
                      value={editableFields[key] || ""}
                      onChange={(e) => setEditableFields({ ...editableFields, [key]: e.target.value })}
                      placeholder={lang === "bn" ? `${label.bn} লিখুন...` : `Enter ${label.en}...`}
                      style={{
                        width: "100%",
                        background: "#06101c",
                        border: "1px solid #1f354c",
                        color: "#e7eef8",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />

                    {/* Normalized or secondary hint */}
                    {meta?.normalized_value && key === "land_area" && (
                      <div style={{ fontSize: "10px", color: "#5ee6cb", marginTop: "4px" }}>
                        রূপান্তরিত একক: <strong>{meta.normalized_value} শতাংশ (Decimals)</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
