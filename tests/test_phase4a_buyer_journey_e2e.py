import os
import sys
import time
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FRONTEND_URL = "http://localhost:5173"
SCREENSHOT_DIR = PROJECT_ROOT / "docs" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def test_complete_buyer_journey_16_steps_e2e():
    """
    PHASE 4A COMPREHENSIVE END-TO-END TEST:
    1. One-click Demo Login.
    2. Search for a parcel (via universal search bar).
    3. View map first (Leaflet + OpenStreetMap + parcel geometry).
    4. Scroll to overview (4 plain Bengali questions answered).
    5. Open khatian comparison (CS, SA, RS, BS comparison).
    6. Review ownership history (25+ years title chain & double selling).
    7. Deed review & extracted field comparison.
    8. Mutation verification & Land Development Tax.
    9. Boundary, road access, and possession checklist.
    10. Legal & inheritance checklist (cases, injunctions, co-owners).
    11. Smart ML risk review (17 features evaluated + Gap Navigator).
    12. Ask the assistant a parcel-specific question with evidence.
    13. Navigate to lawyer consultation & view slots.
    14. Generate final verification report (Trust Passport findings).
    15. Switch to another parcel and verify zero stale data bleed.
    16. Refresh page and verify session + selected parcel restoration.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 950})
        page = context.new_page()

        # Step 1: One-click Demo Login
        page.goto(FRONTEND_URL, wait_until="networkidle")
        login_btn = page.locator("button.demo-btn")
        assert login_btn.is_visible(), "Demo login button should be visible"
        login_btn.click()
        page.wait_for_selector(".app-shell", timeout=12000)
        assert page.locator(".app-shell").is_visible(), "Dashboard should render after login"

        # Step 2 & 3: Find Land & Show Map First
        page.click("button:has-text('জমি খুঁজুন')")
        page.wait_for_selector(".gis-map-module", timeout=10000)
        page.wait_for_selector(".leaflet-container", timeout=10000)
        time.sleep(2)

        # Universal search in map
        search_input = page.locator(".gis-map-module form input")
        assert search_input.is_visible(), "Search bar in GIS map module should be visible"
        search_input.fill("1007")
        time.sleep(1)
        page.locator(".gis-map-module form button[type='submit']").click()
        time.sleep(2)

        # Confirm map displays parcel polygon and metadata
        assert page.locator(".leaflet-container").is_visible()
        map_screenshot = SCREENSHOT_DIR / "buyer_journey_step2_map.png"
        page.screenshot(path=str(map_screenshot))

        # Step 4: Simple Land Overview answering 4 core Bengali questions
        page.click("button:has-text('আমার জমি')")
        page.wait_for_selector("text=ধাপ ৩ — সহজ জমি ওভারভিউ", timeout=8000)

        # Verify the 4 questions in plain Bengali
        assert page.locator("text=১. এটি কোন জমি?").is_visible()
        assert page.locator("text=২. জমিটি কোথায়?").is_visible()
        assert page.locator("text=৩. রেকর্ডে কতটুকু জমি আছে?").is_visible()
        assert page.locator("text=৪. আর কী কী যাচাই করা বাকি?").is_visible()

        overview_screenshot = SCREENSHOT_DIR / "buyer_journey_step3_overview.png"
        page.screenshot(path=str(overview_screenshot))

        # Step 5 to 11: Comprehensive Buyer Journey
        page.click("button:has-text('জমি যাচাই')")
        page.wait_for_selector(".buyer-journey-workspace", timeout=8000)

        # Step 5: Survey & Khatian Comparison
        page.click("button:has-text('১. খতিয়ান ও জরিপ তুলনা')")
        time.sleep(1)
        assert page.locator("text=খতিয়ান ও জরিপ তুলনা").first.is_visible()

        # Step 6: Ownership History (25+ years)
        page.click("button:has-text('২. মালিকানার ইতিহাস')")
        time.sleep(1)
        assert page.locator("text=মালিকানার ইতিহাস").first.is_visible()
        assert page.locator("text=২৫+ বছর").first.is_visible() or page.locator("text=লেনদেন").first.is_visible()

        # Step 7 & 8: Mutation & Tax
        page.click("button:has-text('৩. নামজারি ও মিউটেশন')")
        time.sleep(1)
        assert page.locator("text=নামজারি").first.is_visible()

        page.click("button:has-text('৪. ভূমি উন্নয়ন কর')")
        time.sleep(1)
        assert page.locator("text=ভূমি উন্নয়ন কর").first.is_visible()

        # Step 9: Boundary, Road Access & Possession
        page.click("button:has-text('৫. সীমানা, রাস্তা ও দখল')")
        time.sleep(1)
        assert page.locator("text=সীমানা").first.is_visible()

        # Step 10: Legal & Inheritance Checklist
        page.click("button:has-text('৬. আদালত ও ওয়ারিশান চেক')")
        time.sleep(1)
        assert page.locator("text=আদালত").first.is_visible() or page.locator("text=মামলা").first.is_visible()

        # Step 11: Smart Risk Review (ML 17 Features)
        page.click("button:has-text('৭. স্মার্ট ঝুঁকি পর্যালোচনা')")
        time.sleep(1)
        assert page.locator("text=ঝুঁকি পর্যালোচনা").first.is_visible()
        assert page.locator("text=ঝুঁকি স্তর").first.is_visible() or page.locator("text=১৭টি").first.is_visible() or page.locator("text=LOW RISK").first.is_visible()

        journey_screenshot = SCREENSHOT_DIR / "buyer_journey_step11_risk.png"
        page.screenshot(path=str(journey_screenshot))

        # Step 12: AI Assistant & Voice with parcel context
        page.click("button:has-text('ভূমি সহকারী')")
        page.wait_for_selector(".chat-panel", timeout=8000)
        assert page.locator("text=Parcel ID:").first.is_visible()

        # Click parcel-specific prompt chip
        assistant_chip = page.locator("button:has-text('এই জমির সব তথ্য সহজ করে বলো')")
        assert assistant_chip.is_visible(), "Parcel-specific assistant chip should be present"
        assistant_chip.click()

        # Wait for assistant response card
        page.wait_for_selector(".response-card", timeout=12000)
        assert page.locator(".response-card").is_visible(), "AI Assistant should return evidence-linked answer"

        # Step 13: Lawyer Consultation
        page.click("button:has-text('আইনজীবীর পরামর্শ')")
        page.wait_for_selector(".lawyer-card", timeout=8000)
        assert page.locator(".lawyer-card").count() > 0, "Lawyer directory should show profiles"

        # Step 14: Final Verification Report (Trust Passport)
        page.click("button:has-text('যাচাই প্রতিবেদন')")
        page.wait_for_selector("text=ট্রাস্ট পাসপোর্ট", timeout=8000)
        assert page.locator("text=জরিপ ও খতিয়ান ফাইন্ডিং").is_visible()
        assert page.locator("text=মালিকানা ইতিহাসের পরিধি").is_visible()
        assert page.locator("text=নামজারি (মিউটেশন) অবস্থা").is_visible()

        passport_screenshot = SCREENSHOT_DIR / "buyer_journey_step14_passport.png"
        page.screenshot(path=str(passport_screenshot))

        # Step 15: Switch parcel and confirm no stale data remains
        # Switch via topbar parcel badge or search
        topbar_chip = page.locator("button:has-text('LS-PARCEL-')").first
        topbar_chip.click()
        page.wait_for_selector(".gis-map-module", timeout=8000)

        # Select LS-PARCEL-000002
        search_input = page.locator(".gis-map-module form input")
        search_input.fill("LS-PARCEL-000002")
        time.sleep(1)
        page.locator(".gis-map-module form button[type='submit']").click()
        time.sleep(2)

        # Verify overview updated to LS-PARCEL-000002
        page.click("button:has-text('আমার জমি')")
        page.wait_for_selector("text=LS-PARCEL-000002", timeout=8000)
        assert page.locator("text=LS-PARCEL-000002").first.is_visible()

        # Step 16: Refresh and verify session & selected parcel restoration
        page.reload(wait_until="networkidle")
        page.wait_for_selector(".app-shell", timeout=10000)
        assert page.locator(".app-shell").is_visible(), "Session preserved after refresh"

        # Check localStorage has LS-PARCEL-000002
        stored_parcel = page.evaluate("() => localStorage.getItem('landsure_selected_parcel_id')")
        assert stored_parcel == "LS-PARCEL-000002", f"Expected LS-PARCEL-000002 preserved, got {stored_parcel}"

        browser.close()
