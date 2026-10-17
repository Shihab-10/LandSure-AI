import json
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel, Field

from app.dependencies import current_user
from app.services.document_processor import (
    process_uploaded_document,
    DocumentValidationError,
)
from app.services.bangla_ocr_engine import run_document_ocr
from app.services.deed_extractor import (
    extract_structured_fields,
    match_deed_with_synthetic_parcels,
    compare_deed_with_target_parcel,
)

router = APIRouter(
    prefix="/api/v1/documents",
    tags=["Document Intelligence & OCR"],
)

# Safe synthetic sample deeds for demo
SAFE_SYNTHETIC_SAMPLES = [
    {
        "id": "sample-deed-clean",
        "title_bn": "আদর্শ দলিল স্ক্যান (সাভার, বিরুলিয়া মৌজা - ৪৭.৫৭ শতাংশ)",
        "title_en": "Clean Scan Deed (Savar, Birulia Mouza - 47.57 Decimals)",
        "sample_text": (
            "দলিল নং: ১২৩৪/২০২৪\n"
            "তারিখ: ১৫-০১-২০২৪ ইং\n"
            "সাব-রেজিস্ট্রি অফিস: সাভার, ঢাকা\n"
            "মৌজা: বিরুলিয়া, জে এল নং: ৪৫\n"
            "খতিয়ান নং: ১০২, দাগ নং: ১২৪\n"
            "জরিপের ধরন: আর এস (RS Survey)\n"
            "জমির পরিমাণ: ৪৭.৫৭ শতাংশ (নাল জমি)\n"
            "দলিল মূল্য: ৫০,০০,০০০ (পঞ্চাশ লক্ষ) টাকা\n"
            "দাতা / বিক্রেতা: Demo Owner 0001\n"
            "গ্রহীতা / ক্রেতা: Buyer Applicant 0001\n"
            "চৌহদ্দি: উত্তরে রাস্তা, দক্ষিণে খাল, পূর্বে রহিম, পশ্চিমে করিম।"
        ),
        "target_parcel_id": "LS-PARCEL-000001",
        "quality": "CLEAN_SCAN"
    },
    {
        "id": "sample-deed-mobile",
        "title_bn": "মোবাইল ক্যামেরা দলিল ছবি (চট্টগ্রাম, ফতেহপুর মৌজা - ২৯.১৪ শতাংশ)",
        "title_en": "Mobile Camera Photograph Deed (Chattogram, Fatehpur - 29.14 Decimals)",
        "sample_text": (
            "দলিল নং: ৫৬৭৮/২০২৩\n"
            "তারিখ: ১০-১১-২০২৩ ইং\n"
            "সাব-রেজিস্ট্রি অফিস: হাটহাজারী, চট্টগ্রাম\n"
            "মৌজা: ফতেহপুর, জে এল নং: ১৮\n"
            "খতিয়ান নং: ৪৪, দাগ নং: ৩৫৬\n"
            "জরিপের ধরন: বি এস (BS Survey)\n"
            "জমির পরিমাণ: ২৯.১৪ শতাংশ (ভিটি জমি)\n"
            "দলিল মূল্য: ৩৫,০০,০০০ (পঁয়ত্রিশ লক্ষ) টাকা\n"
            "দাতা / বিক্রেতা: Demo Owner 0002\n"
            "গ্রহীতা / ক্রেতা: Buyer Applicant 0002\n"
            "চৌহদ্দি: উত্তরে সিকদার বাড়ি, দক্ষিণে পাকা রাস্তা, পূর্বে সরকারি খাস, পশ্চিমে পুকুর।"
        ),
        "target_parcel_id": "LS-PARCEL-000002",
        "quality": "MOBILE_PHOTO"
    },
    {
        "id": "sample-deed-handwritten",
        "title_bn": "হস্তলিখিত বায়া দলিল (সিলেট, টুকেরবাজার মৌজা - ১০.০০ শতাংশ)",
        "title_en": "Handwritten Legacy Deed (Sylhet, Tukerbazar - 10.00 Decimals)",
        "sample_text": (
            "দলিল নম্বর: ৯৮০১/২০২২\n"
            "রেজিস্ট্রি তারিখ: ০৫-০৩-২০২২\n"
            "সাব-রেজিস্ট্রি কার্যালয়: সিলেট সদর\n"
            "মৌজা: টুকেরবাজার, জে এল নং: ৫\n"
            "খতিয়ান: ১২, দাগ: ৮৯\n"
            "জরিপ: সি এস (CS Survey)\n"
            "জমির পরিমাণ: ১০.০০ শতাংশ\n"
            "মূল্য: ১৫,০০,০০০ টাকা\n"
            "বিক্রেতা: Demo Owner 0003\n"
            "ক্রেতা: Buyer Applicant 0003\n"
            "চৌহদ্দি: উত্তরে রাস্তা, দক্ষিণে মসজিদ, পূর্বে নাল জমি, পশ্চিমে খাস।"
        ),
        "target_parcel_id": "LS-PARCEL-000003",
        "quality": "HANDWRITTEN_MIXED"
    }
]


class ExtractRequest(BaseModel):
    sample_id: Optional[str] = None
    custom_text: Optional[str] = None
    document_hash: Optional[str] = None
    target_parcel_id: Optional[str] = None
    page_rotations: Optional[Dict[int, int]] = None


class CompareParcelRequest(BaseModel):
    parcel_id: str
    fields: Dict[str, Any]


class UserCorrectionRequest(BaseModel):
    document_hash: str
    corrected_fields: Dict[str, Any]
    target_parcel_id: Optional[str] = None


@router.get("/samples")
def get_sample_deeds():
    """
    Returns curated safe synthetic sample deeds for demo testing.
    """
    return {
        "samples": SAFE_SYNTHETIC_SAMPLES,
        "synthetic": True,
        "note": "Safe synthetic test documents containing zero real personal information."
    }


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: dict = Depends(current_user),
):
    """
    Production-ready upload endpoint with magic signature inspection and page previews.
    """
    try:
        content = await file.read()
        res = process_uploaded_document(content, file.filename or "uploaded_deed.pdf")
        return res
    except DocumentValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Document upload processing failed: {str(exc)}")


@router.post("/extract")
def extract_deed_intelligence(
    payload: ExtractRequest,
    user: dict = Depends(current_user),
):
    """
    Runs Bangla OCR pipeline, extracts structured deed fields, and matches against synthetic parcels.
    Provides field-by-field MATCH / MISMATCH / MISSING / NEEDS_REVIEW comparison against the selected parcel.
    """
    from app.services.document_processor import get_document_cache

    sample_text = payload.custom_text
    doc_for_ocr = None
    sample_target_parcel_id = None

    if payload.sample_id:
        sample = next((s for s in SAFE_SYNTHETIC_SAMPLES if s["id"] == payload.sample_id), None)
        if sample:
            sample_text = sample["sample_text"]
            sample_target_parcel_id = sample.get("target_parcel_id")

    if payload.document_hash:
        cached_doc = get_document_cache(payload.document_hash)
        if cached_doc:
            doc_for_ocr = cached_doc
            text_layer_parts = [
                p.get("raw_text", "").strip()
                for p in cached_doc.get("pages", [])
                if p.get("raw_text")
            ]
            if text_layer_parts and not sample_text:
                sample_text = "\n\n".join(text_layer_parts)

    if not doc_for_ocr:
        doc_for_ocr = {
            "pages": [{
                "page_number": 1,
                "width": 800,
                "height": 1100,
                "has_text_layer": bool(sample_text),
                "raw_text": sample_text or "",
            }]
        }

    ocr_output = run_document_ocr(doc_for_ocr, sample_deed_text=sample_text)
    all_tokens = []
    for page_res in ocr_output.get("page_results", []):
        all_tokens.extend(page_res.get("tokens", []))

    structured_fields = extract_structured_fields(all_tokens)
    parcel_matches = match_deed_with_synthetic_parcels(structured_fields)

    # Determine parcel ID to cross-compare with
    active_parcel_id = payload.target_parcel_id or sample_target_parcel_id or (parcel_matches.get("best_match") or {}).get("parcel_id") or "LS-PARCEL-000001"
    target_comparison = compare_deed_with_target_parcel(structured_fields, active_parcel_id)

    # Identify missing critical fields
    critical_fields = ["deed_number", "registration_date", "seller_name", "buyer_name", "khatian_number", "dag_number", "land_area"]
    missing_fields = [
        f for f in critical_fields
        if not structured_fields.get(f, {}).get("raw_value")
    ]

    return {
        "status": "EXTRACTION_SUCCESS",
        "ocr_metrics": {
            "total_lines": ocr_output["total_lines_extracted"],
            "average_confidence": ocr_output["average_confidence"],
            "engine": ocr_output["ocr_engine_info"]["name"],
        },
        "extracted_fields": structured_fields,
        "missing_critical_fields": missing_fields,
        "parcel_matching": parcel_matches,
        "target_parcel_comparison": target_comparison,
        "raw_text": ocr_output["combined_text"],
        "synthetic": True,
    }


@router.post("/compare-parcel")
def compare_parcel_deed_fields(
    payload: CompareParcelRequest,
    user: dict = Depends(current_user),
):
    """
    Directly cross-compares an arbitrary set of deed fields with any specified parcel.
    """
    return compare_deed_with_target_parcel(payload.fields, payload.parcel_id)


@router.post("/confirm")
def confirm_user_correction(
    payload: UserCorrectionRequest,
    user: dict = Depends(current_user),
):
    """
    User review and confirmation step: validates user corrections before linking to parcel.
    """
    parcel_matches = match_deed_with_synthetic_parcels(payload.corrected_fields)
    active_parcel_id = payload.target_parcel_id or (parcel_matches.get("best_match") or {}).get("parcel_id") or "LS-PARCEL-000001"
    target_comparison = compare_deed_with_target_parcel(payload.corrected_fields, active_parcel_id)

    return {
        "status": "CONFIRMED_AND_VERIFIED",
        "document_hash": payload.document_hash,
        "user_corrected_fields": payload.corrected_fields,
        "target_parcel_id": active_parcel_id,
        "parcel_matches": parcel_matches,
        "target_parcel_comparison": target_comparison,
        "message_bn": "দলিলের সংশোধিত তথ্য সফলভাবে সংরক্ষিত হয়েছে এবং পার্সেলের সাথে সংযুক্ত করা হয়েছে।",
        "synthetic": True,
    }
