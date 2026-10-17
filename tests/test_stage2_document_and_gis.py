import os
import sys
import io
from pathlib import Path
from secrets import token_urlsafe
import pytest
import pymupdf as fitz
from PIL import Image

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.services.auth import create_demo_token
from app.services.document_processor import (
    process_uploaded_document,
    DocumentValidationError,
)
from app.services.bangla_ocr_engine import (
    normalize_bengali_digits,
    detect_script,
    run_document_ocr,
)
from app.services.deed_extractor import (
    normalize_area,
    extract_structured_fields,
    match_deed_with_synthetic_parcels,
)
from app.services.gis_service import (
    get_all_divisions,
    get_all_districts,
    search_locations,
    resolve_parcel_gis,
)


@pytest.fixture(autouse=True)
def test_env(monkeypatch):
    secret = token_urlsafe(32)
    monkeypatch.setenv("LANDSURE_JWT_SECRET", secret)
    monkeypatch.setenv("LANDSURE_DEMO_ONLY_MODE", "true")


@pytest.fixture
def auth_headers():
    token = create_demo_token()
    return {"Authorization": f"Bearer {token}"}


# -----------------------------------------------------------------------------
# TASK 1: Document Processing & Upload Validation
# -----------------------------------------------------------------------------

def test_document_processor_empty_file():
    with pytest.raises(DocumentValidationError) as exc:
        process_uploaded_document(b"", "empty.pdf")
    assert exc.value.code == "EMPTY_FILE"


def test_document_processor_invalid_magic_bytes():
    with pytest.raises(DocumentValidationError) as exc:
        process_uploaded_document(b"Random text without magic bytes", "test.pdf")
    assert exc.value.code == "SIGNATURE_MISMATCH"


def test_document_processor_valid_pdf_multi_page():
    # Create an in-memory 2-page PDF
    doc = fitz.open()
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((72, 100), "দলিল নং: ১২৩৪/২০২৪\nমৌজা: বিরুলিয়া", fontsize=14)
    p2 = doc.new_page(width=595, height=842)
    p2.insert_text((72, 100), "দ্বিতীয় পৃষ্ঠা - শর্তাবলী", fontsize=14)
    pdf_bytes = doc.tobytes()
    doc.close()

    result = process_uploaded_document(pdf_bytes, "deed_sample.pdf")
    assert result["status"] == "VALIDATED"
    assert result["format"].lower() == "pdf"
    assert result["page_count"] == 2
    assert len(result["sha256"]) == 64
    assert result["pages"][0]["has_text_layer"] is True
    assert "data:image/jpeg;base64," in result["pages"][0]["preview_image_b64"]


def test_document_processor_valid_image():
    # Create an in-memory test PNG
    img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    result = process_uploaded_document(png_bytes, "deed_photo.png")
    assert result["status"] == "VALIDATED"
    assert result["format"].lower() == "png"
    assert result["page_count"] == 1
    assert "preview_image_b64" in result["pages"][0]


def test_upload_api_endpoint(auth_headers):
    with TestClient(app) as client:
        # Create a small valid PDF
        doc = fitz.open()
        p = doc.new_page(width=400, height=600)
        p.insert_text((50, 50), "দলিল নং: ৯৯৯/২০২৪", fontsize=12)
        pdf_bytes = doc.tobytes()
        doc.close()

        files = {"file": ("test.pdf", pdf_bytes, "application/pdf")}
        resp = client.post("/api/v1/documents/upload", files=files, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["format"].lower() == "pdf"
        assert data["page_count"] == 1


# -----------------------------------------------------------------------------
# TASK 2: Bangla OCR & Normalization Engine
# -----------------------------------------------------------------------------

def test_bengali_digits_normalization():
    assert normalize_bengali_digits("১২৩৪৫৬৭৮৯০") == "1234567890"
    assert normalize_bengali_digits("দাগ নং ৪৭.৫৭") == "দাগ নং 47.57"
    assert normalize_bengali_digits("English 12345") == "English 12345"


def test_script_detection():
    assert detect_script("বাংলাদেশ ভূমি রেকর্ড") == "BANGLA"
    assert detect_script("Bangladesh Land Record") == "ENGLISH"
    assert detect_script("খতিয়ান 45 No Survey") == "MIXED"


def test_area_unit_normalization():
    # 1 Katha = 1.65 Decimals
    raw, norm, unit = normalize_area("২", "কাঠা")
    assert norm == round(2 * 1.65, 4)

    # 1 Bigha = 33.0 Decimals
    raw, norm, unit = normalize_area("১.৫", "বিঘা")
    assert norm == round(1.5 * 33.0, 4)

    # 1 Acre = 100.0 Decimals
    raw, norm, unit = normalize_area("০.৫", "একর")
    assert norm == 50.0

    # 1 Decimal = 1.0 Decimal
    raw, norm, unit = normalize_area("৪৭.৫৭", "শতাংশ")
    assert norm == 47.57


# -----------------------------------------------------------------------------
# TASK 3: Structured Deed Information Extraction
# -----------------------------------------------------------------------------

def test_extract_structured_fields_clean_scan():
    sample_tokens = [
        {"text": "দলিল নং: ১২৩৪/২০২৪", "confidence": 0.95, "page": 1, "bounding_box": [10, 10, 200, 30]},
        {"text": "তারিখ: ১৫-০১-২০২৪ ইং", "confidence": 0.94, "page": 1, "bounding_box": [10, 35, 200, 55]},
        {"text": "সাব-রেজিস্ট্রি অফিস: সাভার, ঢাকা", "confidence": 0.92, "page": 1, "bounding_box": [10, 60, 250, 80]},
        {"text": "মৌজা: বিরুলিয়া, জে এল নং: ৪৫", "confidence": 0.93, "page": 1, "bounding_box": [10, 85, 250, 105]},
        {"text": "খতিয়ান নং: ১০২, দাগ নং: ১২৪", "confidence": 0.91, "page": 1, "bounding_box": [10, 110, 250, 130]},
        {"text": "জরিপের ধরন: আর এস", "confidence": 0.90, "page": 1, "bounding_box": [10, 135, 200, 155]},
        {"text": "জমির পরিমাণ: ৪৭.৫৭ শতাংশ", "confidence": 0.95, "page": 1, "bounding_box": [10, 160, 200, 180]},
        {"text": "দলিল মূল্য: ৫০,০০,০০০ টাকা", "confidence": 0.93, "page": 1, "bounding_box": [10, 185, 200, 205]},
        {"text": "দাতা: Demo Owner 0001", "confidence": 0.88, "page": 1, "bounding_box": [10, 210, 200, 230]},
        {"text": "গ্রহীতা: Buyer Applicant 0001", "confidence": 0.89, "page": 1, "bounding_box": [10, 235, 200, 255]},
    ]

    extracted = extract_structured_fields(sample_tokens)

    assert extracted["deed_number"]["raw_value"] == "১২৩৪/২০২৪"
    assert extracted["deed_number"]["normalized_value"] == "1234/2024"
    assert extracted["sub_registry_office"]["raw_value"] == "সাভার"
    assert extracted["mouza"]["raw_value"] == "বিরুলিয়া"
    assert extracted["land_area"]["normalized_value"] == 47.57
    assert extracted["deed_value"]["normalized_value"] == 5000000
    assert extracted["seller_name"]["raw_value"] == "Demo Owner 0001"
    assert extracted["buyer_name"]["raw_value"] == "Buyer Applicant 0001"


def test_extract_missing_fields_graceful_handling():
    # Tokens missing critical fields like dag_number and mutation
    sparse_tokens = [{"text": "কেবলমাত্র কিছু সাধারণ টেক্সট", "confidence": 0.80, "page": 1, "bounding_box": None}]
    extracted = extract_structured_fields(sparse_tokens)

    assert extracted["dag_number"]["raw_value"] is None
    assert extracted["dag_number"]["extraction_method"] == "NOT_FOUND"
    assert extracted["dag_number"]["review_status"] == "REQUIRES_MANUAL_INPUT"
    assert extracted["dag_number"]["confidence"] == 0.0


# -----------------------------------------------------------------------------
# TASK 4: Bangladesh Interactive GIS
# -----------------------------------------------------------------------------

def test_gis_divisions():
    divs = get_all_divisions()
    assert len(divs) == 8
    names_en = [d["name_en"] for d in divs]
    assert "Dhaka" in names_en
    assert "Chattogram" in names_en
    assert "Sylhet" in names_en


def test_gis_districts_count_and_centroids():
    districts = get_all_districts()
    assert len(districts) == 64
    for d in districts:
        assert 20.0 <= d["lat"] <= 27.0, f"Latitude out of Bangladesh bounds for {d['district_name_en']}"
        assert 88.0 <= d["lng"] <= 93.0, f"Longitude out of Bangladesh bounds for {d['district_name_en']}"
        assert "classification" in d


def test_gis_search():
    # Search by English
    res_en = search_locations("Savar")
    assert len(res_en) >= 1
    assert any("Savar" in r["name_en"] for r in res_en)

    # Search by Bangla
    res_bn = search_locations("ঢাকা")
    assert len(res_bn) >= 1
    assert any("ঢাকা" in r["name_bn"] for r in res_bn)


def test_gis_parcel_resolution():
    res = resolve_parcel_gis("LS-PARCEL-000001")
    assert res["parcel_id"] == "LS-PARCEL-000001"
    assert res["area_decimal"] == 47.57
    assert res["boundary_geojson"]["type"] == "Feature"
    assert res["boundary_geojson"]["geometry"]["type"] == "Polygon"
    assert len(res["boundary_geojson"]["geometry"]["coordinates"][0]) >= 4
    assert res["provenance"]["accuracy_disclaimer_bn"] is not None


def test_gis_parcel_invalid_format():
    with pytest.raises(ValueError):
        resolve_parcel_gis("INVALID-PARCEL-ID")


# -----------------------------------------------------------------------------
# TASK 5: Document Extraction to Parcel Matching Integration
# -----------------------------------------------------------------------------

def test_deed_parcel_cross_matching():
    extracted = {
        "mouza": {"raw_value": "বিরুলিয়া"},
        "khatian_number": {"normalized_value": "102"},
        "dag_number": {"normalized_value": "124"},
        "land_area": {"normalized_value": 47.57},
    }

    match_result = match_deed_with_synthetic_parcels(extracted)
    assert match_result["status"] in ("MATCH_FOUND", "PARTIAL_MATCH", "MATCHES_FOUND")
    assert match_result["best_match"] is not None
    assert match_result["best_match"]["parcel_id"] == "LS-PARCEL-000001"
    assert match_result["best_match"]["match_score"] >= 60


def test_extract_and_confirm_api(auth_headers):
    with TestClient(app) as client:
        # 1. Samples endpoint (public)
        s_resp = client.get("/api/v1/documents/samples")
        assert s_resp.status_code == 200
        samples = s_resp.json()["samples"]
        assert len(samples) >= 3

        # 2. Extract from clean scan sample
        ext_resp = client.post(
            "/api/v1/documents/extract",
            json={"sample_id": "sample-deed-clean"},
            headers=auth_headers
        )
        assert ext_resp.status_code == 200
        ext_data = ext_resp.json()
        assert ext_data["status"] == "EXTRACTION_SUCCESS"
        assert ext_data["extracted_fields"]["mouza"]["raw_value"] == "বিরুলিয়া"

        # 3. Confirm user corrections
        confirm_resp = client.post(
            "/api/v1/documents/confirm",
            json={
                "document_hash": "sample_hash_test_123",
                "corrected_fields": ext_data["extracted_fields"],
                "target_parcel_id": "LS-PARCEL-000001"
            },
            headers=auth_headers
        )
        assert confirm_resp.status_code == 200
        conf_data = confirm_resp.json()
        assert conf_data["status"] == "CONFIRMED_AND_VERIFIED"
        assert conf_data["target_parcel_id"] == "LS-PARCEL-000001"
