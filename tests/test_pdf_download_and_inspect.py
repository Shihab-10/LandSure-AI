"""
LandSure AI — Verification Report PDF Download & Structural Inspection Suite
=============================================================================
Tests both:
1. Backend direct PDF generation via authenticated API endpoint (/trust-passport)
2. In-memory / on-disk inspection with PyMuPDF to verify valid PDF headers, pages,
   metadata, and honest synthetic disclaimer.
3. Real browser Playwright download lifecycle (expect_download event) to ensure the
   frontend button triggers real PDF binary delivery and valid local persistence.
"""

import os
import sys
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
import pymupdf

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app
from app.services.auth import create_demo_token

reconfig_stdout = getattr(sys.stdout, "reconfigure", None)
if callable(reconfig_stdout):
    reconfig_stdout(encoding="utf-8")
reconfig_stderr = getattr(sys.stderr, "reconfigure", None)
if callable(reconfig_stderr):
    reconfig_stderr(encoding="utf-8")

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LOCAL_FRONTEND_URL = "http://localhost:5173"


def test_backend_pdf_generation_and_pymupdf_open():
    """
    Directly tests the ReportLab PDF rendering pipeline for parcel LS-PARCEL-000001,
    opens it with PyMuPDF, and asserts structural validity and essential contents.
    """
    client = TestClient(app)
    token = create_demo_token()
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/parcels/LS-PARCEL-000001/trust-passport", headers=headers)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"
    assert response.headers.get("content-type") == "application/pdf"

    pdf_bytes = response.content
    assert len(pdf_bytes) > 2000, f"PDF byte length too small ({len(pdf_bytes)} bytes)"
    assert pdf_bytes.startswith(b"%PDF-"), "Binary must start with valid PDF header signature"

    # Open with PyMuPDF
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    assert doc.page_count >= 1, f"Expected at least 1 page, got {doc.page_count}"

    full_text = ""
    for page_idx in range(doc.page_count):
        page = doc.load_page(page_idx)
        full_text += page.get_text()

    # Verify critical parcel identifiers and safety disclaimers
    assert "LandSure AI" in full_text or "LANDSURE" in full_text, "Report must identify LandSure AI"
    assert "LS-PARCEL-000001" in full_text, "Report must contain the target parcel ID"
    assert (
        "Demonstration" in full_text or
        "Synthetic" in full_text or
        "Not a certified" in full_text or
        "প্রদর্শনী" in full_text
    ), "Report must clearly disclose synthetic demonstration status"

    doc.close()


def test_playwright_browser_pdf_download_and_verify():
    """
    Executes a real Playwright headless Chrome browser session, navigates to the
    Verification Passport page, clicks the PDF download button, intercepts the
    browser download event, saves the file to a temporary location, and opens it
    with PyMuPDF.
    """
    from playwright.sync_api import sync_playwright

    # Try local frontend first; if not reachable, skip browser part gracefully
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH if Path(CHROME_PATH).exists() else None,
            headless=True
        )
        context = browser.new_context(accept_downloads=True, viewport={"width": 1440, "height": 900})
        page = context.new_page()

        try:
            page.goto(LOCAL_FRONTEND_URL, timeout=8000)
        except Exception:
            # Fallback to live URL if local dev server is inactive
            page.goto("https://landsure-ai.pages.dev", timeout=30000)

        # Login
        page.wait_for_selector(".login-card", timeout=15000)
        page.locator("button.demo-btn").click()
        page.wait_for_selector(".app-shell", timeout=30000)

        # Navigate to Verification Report / Trust Passport
        report_btn = page.locator("aside.sidebar nav button:has-text('যাচাই প্রতিবেদন')").first
        report_btn.click()
        page.wait_for_selector("button:has-text('পিডিএফ')", timeout=15000)

        # Intercept download
        download_btn = page.locator("button:has-text('পিডিএফ')").first
        with page.expect_download(timeout=25000) as download_info:
            download_btn.click()

        download = download_info.value
        suggested_filename = download.suggested_filename
        assert "Trust_Passport" in suggested_filename or ".pdf" in suggested_filename

        with tempfile.TemporaryDirectory() as tmpdir:
            download_path = Path(tmpdir) / suggested_filename
            download.save_as(str(download_path))
            assert download_path.exists(), "Downloaded PDF must be saved on disk"
            file_size = download_path.stat().st_size
            assert file_size > 2000, f"Saved PDF size is too small ({file_size} bytes)"

            # Open with PyMuPDF
            doc = pymupdf.open(str(download_path))
            assert doc.page_count >= 1, "Downloaded PDF must have at least 1 page"
            text = doc[0].get_text()
            assert "LandSure" in text or "LS-PARCEL" in text or len(text) > 50
            doc.close()

        browser.close()
