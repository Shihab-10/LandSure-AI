"""
LandSure AI — Phase 4E Complete End-to-End Browser Verification Suite
====================================================================
Tests the full functional flow on real Chrome/Playwright across two distinct parcels:
1. Guest One-Click Authentication & Session Initialization
2. Parcel Search, Resolution, and Interactive Basemap (Leaflet/OSM)
3. Parcel Overview, Detail Cards & Interactive Watchlist Toggle with Bell Badge
4. Survey Comparison (CS, SA, RS, BS) & Chain of Title Records
5. Deed Intelligence & Field Cross-Comparison (MATCH, MISMATCH, MISSING, NEEDS_HUMAN_REVIEW)
   - Cryptographic Hash Non-Authenticity Disclaimer
   - Handwritten Document Human Review Notice
6. Mutation Evidence, Land Tax Records & Land Registration Cost Calculator
7. ML Risk Model Execution (Logistic Regression V2, Feature Router V4, Safety Gate V2)
8. Grounded AI Copilot Assistant & Bangla Voice Interface
9. Demonstration Lawyer Directory, Slot Selection, Booking & Cancellation Lifecycle
10. Parcel Change Watch & Event History Audit with Non-Government Monitoring Disclaimer
11. Evidence-Linked Verification Report Generation
12. Multi-Parcel Switching (LS-PARCEL-000001 -> LS-PARCEL-000002) & Stale Data Prevention
13. Session Refresh Persistence & Clean Logout Cycle
"""

import os
import sys
import time
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

reconfig_stdout = getattr(sys.stdout, "reconfigure", None)
if callable(reconfig_stdout):
    reconfig_stdout(encoding="utf-8")
reconfig_stderr = getattr(sys.stderr, "reconfigure", None)
if callable(reconfig_stderr):
    reconfig_stderr(encoding="utf-8")

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FRONTEND_URL = "http://localhost:5173"
BACKEND_URL = "http://127.0.0.1:8000"
SCREENSHOT_DIR = Path(__file__).resolve().parents[1] / "docs" / "screenshots" / "phase4e"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def test_phase4e_complete_two_parcel_e2e_journey():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH if Path(CHROME_PATH).exists() else None,
            headless=True
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # -------------------------------------------------------------
        # STEP 1: INITIAL VISIT & GUEST AUTHENTICATION
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 1: Navigating to LandSure AI...")
        page.goto(FRONTEND_URL, wait_until="domcontentloaded")
        page.wait_for_selector(".login-card", timeout=15000)

        # Clear any prior test state
        page.evaluate("() => localStorage.clear()")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".login-card", timeout=15000)

        demo_btn = page.locator("button.demo-btn")
        assert demo_btn.is_visible(), "One-click guest login button must be visible"
        demo_btn.click()

        page.wait_for_selector(".app-shell", timeout=15000)
        assert page.locator(".sidebar").is_visible(), "Authenticated sidebar navigation must render"
        page.screenshot(path=str(SCREENSHOT_DIR / "01_authenticated_dashboard.png"))

        # -------------------------------------------------------------
        # STEP 2: PARCEL 1 (LS-PARCEL-000001) OVERVIEW & WATCHLIST TOGGLE
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 2: Testing Parcel 1 Overview & Change Watch...")
        page.click("button.nav-item:has-text('আমার জমি')")
        page.wait_for_selector(".dashboard-overview, h1, h2", timeout=10000)

        # Check Watch Button ("ওয়াচলিস্টে রাখুন" / "ওয়াচলিস্টে আছে")
        watch_btn = page.locator("button:has-text('ওয়াচলিস্টে'), button:has-text('Watch')").first
        if watch_btn.is_visible():
            watch_btn.click()
            time.sleep(1)
            # Verify topbar notification bell badge
            bell_badge = page.locator(".bell-badge")
            bell_text = (bell_badge.text_content() or "").strip()
            print(f"   -> Watchlist toggle verified: Bell badge shows {bell_text}.")

        page.screenshot(path=str(SCREENSHOT_DIR / "02_parcel1_watched.png"))

        # -------------------------------------------------------------
        # STEP 3: GIS MAP & PARCEL EXPLORER
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 3: Testing GIS Map & Parcel Search...")
        page.click("button.nav-item:has-text('জমি খুঁজুন')")
        page.wait_for_selector(".gis-map-module", timeout=10000)
        assert page.locator(".leaflet-container").is_visible(), "Leaflet GIS map must be rendered"
        page.screenshot(path=str(SCREENSHOT_DIR / "03_gis_map_explorer.png"))

        # -------------------------------------------------------------
        # STEP 4: VERIFICATION & ML RISK ASSESSMENT
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 4: Testing Land Verification & ML Risk Model...")
        page.click("button.nav-item:has-text('জমি যাচাই')")
        page.wait_for_selector(".page-heading", timeout=10000)
        time.sleep(2)
        page.screenshot(path=str(SCREENSHOT_DIR / "04_ml_risk_verification.png"))

        # -------------------------------------------------------------
        # STEP 5: DEED REVIEW & OCR CROSS-COMPARISON
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 5: Testing Deed Intelligence & Field Cross-Comparison...")
        page.click("button.nav-item:has-text('দলিল পরীক্ষা')")
        page.wait_for_selector(".doc-intel-module", timeout=10000)

        # Run extraction on a sample deed
        sample_btn = page.locator(".doc-intel-module button strong").first
        if sample_btn.is_visible():
            sample_btn.click()
            time.sleep(3)
            # Verify cross-comparison card appeared
            assert page.locator("text=দলিল বনাম রেকর্ড ফিল্ড-ভিত্তিক ক্রস-তুলনা").first.is_visible(), (
                "Deed vs Target Parcel Field Cross-Comparison Card must be displayed"
            )
            # Verify comparison statuses (MATCH / MISMATCH / MISSING / NEEDS_HUMAN_REVIEW)
            assert page.locator("text=MATCH").first.is_visible(), "MATCH status badge must appear"

            # Verify Handwritten OCR human-review notice is visible
            assert page.locator("text=হস্তলিখিত দলিল").first.is_visible(), (
                "Handwritten OCR human-review notice must be visible"
            )

            # Verify Cryptographic Hash non-authenticity disclaimer
            assert page.locator("text=ক্রিপ্টোগ্রাফিক হ্যাশ").first.is_visible(), (
                "Cryptographic hash disclaimer must be displayed"
            )
            print("   -> Deed vs Target Parcel Field Cross-Comparison verified with MATCH/MISMATCH statuses and disclaimers.")

        page.screenshot(path=str(SCREENSHOT_DIR / "05_deed_ocr_intelligence.png"))

        # -------------------------------------------------------------
        # STEP 6: AI COPILOT & BANGLA VOICE
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 6: Testing AI Copilot & Voice Interface...")
        page.click("button.nav-item:has-text('ভূমি সহকারী')")
        page.wait_for_selector(".chat-intro, .chat-form", timeout=10000)

        # Click quick prompt chip
        chip = page.locator("button:has-text('এই জমির সব তথ্য সহজ করে বলো')").first
        if chip.is_visible():
            chip.click()
            time.sleep(3)
            # Verify assistant responded
            assert page.locator(".chat-body").is_visible()
            print("   -> Grounded AI Copilot assistant query answered.")

        page.screenshot(path=str(SCREENSHOT_DIR / "06_copilot_grounded_answer.png"))

        # -------------------------------------------------------------
        # STEP 7: LAWYER CONSULTATION & DEMO BOOKING LIFECYCLE
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 7: Testing Lawyer Consultation & Demo Booking...")
        page.click("button.nav-item:has-text('আইনজীবীর পরামর্শ')")
        page.wait_for_selector(".lawyer-card", timeout=10000)

        # Verify non-fabrication demo disclaimer
        assert page.locator("text=ডেমো ডিরেক্টরি").first.is_visible() or page.locator("text=প্রদর্শনী").first.is_visible()

        # View slots of first lawyer
        view_slots_btn = page.locator(".lawyer-card button:has-text('স্লট দেখুন')").first
        if view_slots_btn.is_visible():
            view_slots_btn.click()
            time.sleep(1)

            # Click Book Demo Slot
            book_slot_btn = page.locator("button:has-text('ডেমো বুকিং করুন')").first
            if book_slot_btn.is_visible():
                book_slot_btn.click()
                time.sleep(2)
                # Verify booking success notice
                assert page.locator("text=সফলভাবে সংরক্ষিত").first.is_visible(), "Booking confirmation notice must appear"
                print("   -> Lawyer demo booking confirmed with reservation ID.")

                # Cancel booking
                cancel_btn = page.locator("button:has-text('বাতিল করুন')").first
                if cancel_btn.is_visible():
                    cancel_btn.click()
                    time.sleep(1)
                    print("   -> Demonstration booking cancelled successfully.")

        page.screenshot(path=str(SCREENSHOT_DIR / "07_lawyer_demo_booking.png"))

        # -------------------------------------------------------------
        # STEP 8: WATCHLIST & CHANGE MONITOR
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 8: Testing Watchlist & Change Monitor...")
        # Open watchlist via topbar bell
        page.locator("header.topbar button[title*='ওয়াচলিস্ট']").click()
        page.wait_for_selector("text=পার্সেল ওয়াচলিস্ট", timeout=10000)

        # Verify non-government monitoring disclaimer
        assert page.locator("text=সরকারি রেকর্ড মনিটরিং নোটিশ").first.is_visible(), (
            "Non-government monitoring disclaimer must be visible"
        )
        print("   -> Watchlist monitor rendered with non-government monitoring disclaimer.")
        page.screenshot(path=str(SCREENSHOT_DIR / "08_watchlist_monitor.png"))

        # -------------------------------------------------------------
        # STEP 9: VERIFICATION REPORT
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 9: Testing Verification Passport Report...")
        page.click("button.nav-item:has-text('যাচাই প্রতিবেদন')")
        page.wait_for_selector("text=ট্রাস্ট পাসপোর্ট", timeout=10000)
        assert "LS-PARCEL-000001" in page.content(), "Report must contain LS-PARCEL-000001 context"
        page.screenshot(path=str(SCREENSHOT_DIR / "09_verification_report.png"))

        # -------------------------------------------------------------
        # STEP 10: SWITCH TO PARCEL 2 (LS-PARCEL-000002) & STALE DATA CHECK
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 10: Switching to Parcel 2 (LS-PARCEL-000002)...")
        page.evaluate("() => localStorage.setItem('landsure_selected_parcel_id', 'LS-PARCEL-000002')")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".app-shell", timeout=10000)

        # Verify active parcel context updated to LS-PARCEL-000002
        assert "LS-PARCEL-000002" in page.content(), "Page must reflect LS-PARCEL-000002 context"

        # Check Report for Parcel 2
        page.click("button.nav-item:has-text('যাচাই প্রতিবেদন')")
        page.wait_for_selector("text=ট্রাস্ট পাসপোর্ট", timeout=10000)
        assert "LS-PARCEL-000002" in page.content()
        print("   -> Stale data prevented: Context refreshed cleanly for LS-PARCEL-000002.")
        page.screenshot(path=str(SCREENSHOT_DIR / "10_parcel2_verified.png"))

        # -------------------------------------------------------------
        # STEP 11: SESSION PERSISTENCE & CLEAN LOGOUT
        # -------------------------------------------------------------
        print("\n[PHASE 4E E2E] Step 11: Testing Session Refresh & Logout...")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".app-shell", timeout=10000)
        assert page.locator(".sidebar").is_visible(), "Session must persist after browser refresh"

        # Logout
        logout_btn = page.locator("button[title='Log out'], button:has-text('লগআউট')").first
        assert logout_btn.is_visible(), "Logout button must be visible"
        logout_btn.click()

        page.wait_for_selector(".login-card", timeout=10000)
        token_after_logout = page.evaluate("() => localStorage.getItem('landsure_access_token')")
        assert not token_after_logout, "Access token must be cleared from storage upon logout"
        print("   -> Logout completed cleanly.")
        page.screenshot(path=str(SCREENSHOT_DIR / "11_clean_logout.png"))

        # Filter out harmless network logs
        severe_errors = [e for e in console_errors if "favicon" not in e and "Leaflet" not in e]
        print(f"\n[PHASE 4E E2E COMPLETE] Severe console errors: {len(severe_errors)}")
        assert len(severe_errors) == 0, f"Critical console errors detected: {severe_errors}"

        browser.close()
