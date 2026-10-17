import io
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app
from app.services.auth import create_demo_token
from app.services.assistant_v3 import process_assistant_query, query_gemini_api
from app.services.deed_extractor import extract_structured_fields, match_deed_with_synthetic_parcels
from app.services.document_processor import validate_file_bytes, process_uploaded_document, DocumentValidationError


@pytest.fixture
def auth_headers(monkeypatch):
    monkeypatch.setenv("LANDSURE_JWT_SECRET", "test_secret_with_more_than_thirty_two_characters_long")
    token = create_demo_token()
    return {"Authorization": f"Bearer {token}"}


# -----------------------------------------------------------------------------
# TASK 1: Document Upload & Validation Tests
# -----------------------------------------------------------------------------

def test_document_upload_valid_pdf_multipart(auth_headers):
    import pymupdf as fitz
    doc = fitz.open()
    page = doc.new_page(width=400, height=600)
    page.insert_text((50, 50), "দলিল নং: ১২৩৪/২০২৪\nতারিখ: ১৫-০১-২০২৪", fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()

    with TestClient(app) as client:
        files = {"file": ("deed.pdf", pdf_bytes, "application/pdf")}
        resp = client.post("/api/v1/documents/upload", files=files, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["format"] == "pdf"
        assert data["page_count"] == 1
        assert "preview_image_b64" in data["pages"][0]
        assert data["status"] == "VALIDATED"


def test_document_upload_valid_image(auth_headers):
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (300, 300), color="white")
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    with TestClient(app) as client:
        files = {"file": ("deed_photo.png", png_bytes, "image/png")}
        resp = client.post("/api/v1/documents/upload", files=files, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["format"] == "png"
        assert data["page_count"] == 1


def test_document_upload_empty_file_rejected(auth_headers):
    with TestClient(app) as client:
        files = {"file": ("empty.pdf", b"", "application/pdf")}
        resp = client.post("/api/v1/documents/upload", files=files, headers=auth_headers)
        assert resp.status_code == 400
        assert "empty" in resp.json()["detail"].lower()


def test_document_upload_oversized_file_rejected(auth_headers):
    oversized = b"%PDF-" + b"0" * (16 * 1024 * 1024)
    with TestClient(app) as client:
        files = {"file": ("oversized.pdf", oversized, "application/pdf")}
        resp = client.post("/api/v1/documents/upload", files=files, headers=auth_headers)
        assert resp.status_code == 400
        assert "maximum allowed size" in resp.json()["detail"].lower()


def test_document_upload_signature_mismatch_rejected(auth_headers):
    fake_pdf = b"NOT_A_REAL_PDF_HEADER"
    with TestClient(app) as client:
        files = {"file": ("fake.pdf", fake_pdf, "application/pdf")}
        resp = client.post("/api/v1/documents/upload", files=files, headers=auth_headers)
        assert resp.status_code == 400
        assert "signature mismatch" in resp.json()["detail"].lower()


def test_document_upload_unauthenticated():
    with TestClient(app) as client:
        files = {"file": ("test.pdf", b"%PDF-dummy", "application/pdf")}
        resp = client.post("/api/v1/documents/upload", files=files)
        assert resp.status_code == 401


# -----------------------------------------------------------------------------
# TASK 2: Document Intelligence & Field Extraction Tests
# -----------------------------------------------------------------------------

def test_document_extraction_sample(auth_headers):
    with TestClient(app) as client:
        payload = {"sample_id": "sample-deed-clean"}
        resp = client.post("/api/v1/documents/extract", json=payload, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "EXTRACTION_SUCCESS"
        fields = data["extracted_fields"]
        assert fields["deed_number"]["raw_value"] == "১২৩৪/২০২৪"
        assert fields["sub_registry_office"]["raw_value"] is not None
        assert fields["seller_name"]["raw_value"] == "Demo Owner 0001"
        assert fields["land_area"]["normalized_value"] == 47.57
        assert "missing_critical_fields" in data


def test_document_user_confirmation(auth_headers):
    with TestClient(app) as client:
        payload = {
            "document_hash": "test_hash_123",
            "corrected_fields": {
                "deed_number": "৯৯৯৯/২০২৪",
                "seller_name": "Corrected Owner Name",
                "land_area": "৫০.০০ শতাংশ"
            },
            "target_parcel_id": "LS-PARCEL-000001"
        }
        resp = client.post("/api/v1/documents/confirm", json=payload, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "CONFIRMED_AND_VERIFIED"
        assert data["target_parcel_id"] == "LS-PARCEL-000001"


# -----------------------------------------------------------------------------
# TASK 3: Conversational Assistant Tests
# -----------------------------------------------------------------------------

def test_assistant_all_info_query():
    res = process_assistant_query("আমার জমি সম্পর্কে সব তথ্য দাও", parcel_id="LS-PARCEL-000001")
    assert res["status"] == "EVIDENCE_FOUND"
    assert "LS-PARCEL-000001" in res["answer"]
    assert len(res["evidence"]) > 0


def test_assistant_ownership_history_query():
    res = process_assistant_query("এই জমির মালিকানার ইতিহাস দেখাও", parcel_id="LS-PARCEL-000001")
    assert res["status"] == "EVIDENCE_FOUND"
    assert "মালিকানার ইতিহাস" in res["answer"]
    assert res["topic"] == "ownership"


def test_assistant_mutation_status_query():
    res = process_assistant_query("এই জমির নামজারি হয়েছে?", parcel_id="LS-PARCEL-000001")
    assert res["status"] == "EVIDENCE_FOUND"
    assert "নামজারি" in res["answer"]
    assert res["topic"] == "mutation"


def test_assistant_tax_query():
    res = process_assistant_query("খাজনা বকেয়া আছে কি?", parcel_id="LS-PARCEL-000001")
    assert "ভূমি উন্নয়ন কর" in res["answer"]


def test_assistant_general_cs_vs_rs():
    res = process_assistant_query("CS আর RS খতিয়ানের পার্থক্য কী?")
    assert res["status"] == "EDUCATIONAL_ANSWER"
    assert "সিএস" in res["answer"] and "আরএস" in res["answer"]
    assert res["topic"] == "cs_vs_rs"


def test_assistant_general_due_diligence_checklist():
    res = process_assistant_query("জমি কেনার আগে কী কী যাচাই করব?")
    assert res["status"] == "EDUCATIONAL_ANSWER"
    assert "চেকলিস্ট" in res["answer"]
    assert res["topic"] == "pre_purchase_checklist"


def test_assistant_dag_mismatch():
    res = process_assistant_query("দলিলের দাগ নম্বর আর খতিয়ানের দাগ নম্বর না মিললে কী করব?")
    assert res["status"] == "EDUCATIONAL_ANSWER"
    assert "দাগ নম্বর" in res["answer"]
    assert res["topic"] == "dag_mismatch"


def test_assistant_registration_cost():
    res = process_assistant_query("এই জমির রেজিস্ট্রেশন খরচ কত হতে পারে?")
    assert "স্ট্যাম্প শুল্ক" in res["answer"]


def test_assistant_lawyer_lookup():
    res = process_assistant_query("এই জমির জন্য একজন অভিজ্ঞ আইনজীবী খুঁজে দাও")
    assert "আইনজীবী" in res["answer"]


def test_assistant_followup_why():
    history = [
        {"role": "user", "content": "জমি কেনার আগে কী কী যাচাই করব?"},
        {"role": "assistant", "content": "মূল দলিল ও বায়া দলিল দেখা বাধ্যতামূলক।"}
    ]
    res = process_assistant_query("কেন?", history=history)
    assert res["status"] == "FOLLOWUP_ANSWERED"
    assert res["followup_type"] == "WHY_EXPLANATION"
    assert "বিশ্লেষণ ও আইনি কারণ" in res["answer"]


def test_assistant_followup_simplify():
    history = [
        {"role": "user", "content": "CS আর RS খতিয়ানের পার্থক্য কী?"},
        {"role": "assistant", "content": "সিএস হল ক্যাডাস্ট্রাল সার্ভে এবং আরএস রিভিশনাল সার্ভে।"}
    ]
    res = process_assistant_query("আরও সহজ করে বলো", history=history)
    assert res["status"] == "FOLLOWUP_ANSWERED"
    assert res["followup_type"] == "SIMPLIFIED_EXPLANATION"
    assert "সহজ বাংলায় সারসংক্ষেপ" in res["answer"]


def test_assistant_followup_evidence():
    history = [
        {"role": "user", "content": "এই জমির নামজারি অবস্থা কী?"},
        {"role": "assistant", "content": "নামজারি হালনাগাদ রয়েছে।"}
    ]
    res = process_assistant_query("এর প্রমাণ কোথায়?", parcel_id="LS-PARCEL-000001", history=history)
    assert res["status"] == "FOLLOWUP_ANSWERED"
    assert res["followup_type"] == "EVIDENCE_REFERENCE"


# -----------------------------------------------------------------------------
# TASK 4: Gemini Integration & Fallback Tests
# -----------------------------------------------------------------------------

def test_gemini_fallback_when_api_key_unset(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    res = process_assistant_query("CS আর RS খতিয়ানের পার্থক্য কী?")
    assert res["gemini_used"] is False
    assert "সিএস" in res["answer"]


def test_gemini_mocked_success(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "dummy_gemini_api_key_123456")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "candidates": [{
            "content": {"parts": [{"text": "সিএস ও আরএস জরিপ অত্যন্ত গুরুত্বপূর্ণ। (Gemini Verified)"}]}
        }]
    }

    with patch("httpx.Client.post", return_value=mock_response):
        res = process_assistant_query("CS আর RS খতিয়ানের পার্থক্য কী?")
        assert res["gemini_used"] is True
        assert "Gemini Verified" in res["answer"]


# -----------------------------------------------------------------------------
# TASK 5: GIS & Map Tests
# -----------------------------------------------------------------------------

def test_gis_parcel_valid_coordinates(auth_headers):
    with TestClient(app) as client:
        resp = client.get("/api/v1/gis/parcels/LS-PARCEL-000001", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "center_coordinates" in data
        lat, lng = data["center_coordinates"]
        # Bangladesh bounds: Lat ~ 20.5 to 26.7, Lng ~ 88.0 to 92.7
        assert 20.5 <= lat <= 26.7
        assert 88.0 <= lng <= 92.7
        coords = data["boundary_geojson"]["geometry"]["coordinates"][0]
        assert len(coords) >= 4  # closed polygon


def test_gis_parcel_invalid_id(auth_headers):
    with TestClient(app) as client:
        resp = client.get("/api/v1/gis/parcels/INVALID-ID-999", headers=auth_headers)
        assert resp.status_code in [404, 422]
