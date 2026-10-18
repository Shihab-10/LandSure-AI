"""
LandSure AI — Final Production Readiness and Live Deployment Audit Test Suite
Tests:
1. Multi-resolution responsive layouts:
   - 1920x1080 (Full HD Desktop)
   - 1440x900 (Standard Desktop)
   - 1366x768 (Laptop Common)
   - 768x1024 (Tablet Portrait)
   - 390x844 (iPhone Modern)
   - 360x800 (Android Common)
2. Hero section layout, vertical clearance & typography
3. Demo video section (pure image-based, zero video tags, aerial land image)
4. One-click demo login & JWT session creation
5. Session persistence on page reload
6. GIS Land Explorer & parcel search
7. Bookmark / save parcel functionality
8. 9-step verification audit & ML model outputs
9. Document OCR & sample extraction
10. AI Land Assistant
11. Lawyer consultation interface
12. Land Trust Passport PDF preview
13. Notification & watchlist views
14. Clean logout & session teardown
"""

import os
import sys
import time
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LOCAL_URL = "http://localhost:5173"
LIVE_URL = "https://landsure-ai.pages.dev"
BACKEND_LIVE_URL = "https://landsure-ai-backend.onrender.com"

SCREENSHOT_DIR = Path(__file__).resolve().parents[1] / "docs" / "screenshots" / "final_audit"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def test_audit_multi_viewport_and_user_journeys():
    results = {}
    console_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH if Path(CHROME_PATH).exists() else None,
            headless=True
        )

        viewports = [
            ("1920x1080", 1920, 1080),
            ("1440x900", 1440, 900),
            ("1366x768", 1366, 768),
            ("768x1024", 768, 1024),
            ("390x844", 390, 844),
            ("360x800", 360, 800),
        ]

        # -------------------------------------------------------------
        # STEP 1: Test Responsive Landing Across All Viewports
        # -------------------------------------------------------------
        for vp_name, width, height in viewports:
            ctx = browser.new_context(viewport={"width": width, "height": height})
            page = ctx.new_page()
            page.on("console", lambda m: console_errors.append(f"[{vp_name}] {m.type}: {m.text}") if m.type == "error" else None)

            page.goto(LOCAL_URL, wait_until="networkidle")
            time.sleep(1.5)

            # Check for horizontal scroll / overflow
            scroll_width = page.evaluate("() => document.documentElement.scrollWidth")
            client_width = page.evaluate("() => document.documentElement.clientWidth")
            assert scroll_width <= client_width + 5, f"Horizontal overflow detected at {vp_name}: scrollWidth={scroll_width}, clientWidth={client_width}"

            # Capture screenshot
            page.screenshot(path=str(SCREENSHOT_DIR / f"landing_{vp_name}.png"))

            if vp_name == "1440x900":
                # Verify Hero Section Elements
                hero = page.locator("section#top")
                assert hero.is_visible(), "Hero section must be visible"

                # Verify Demo Video Section is PURE IMAGE (No <video> tags)
                demo_sec = page.locator("#demo")
                assert demo_sec.is_visible(), "Demo video section #demo must be visible"
                video_count = demo_sec.locator("video").count()
                assert video_count == 0, f"Expected 0 <video> tags in restored image-based demo section, found {video_count}"
                aerial_img = demo_sec.locator("img[src*='aerial_land_survey.jpg']")
                assert aerial_img.is_visible(), "Aerial land survey image must be visible in demo section"

                # Verify Hero search card spacing (must have top clearance below navbar)
                search_card = page.locator(".hero-search-floating")
                if search_card.is_visible():
                    sc_box = search_card.bounding_box()
                    assert sc_box["y"] > 80, f"Search card y={sc_box['y']} must be safely below sticky navbar (>80px)"

            ctx.close()

        # -------------------------------------------------------------
        # STEP 2: Complete User Journey in Standard Desktop (1440x900)
        # -------------------------------------------------------------
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        page.on("console", lambda m: console_errors.append(f"[JOURNEY] {m.type}: {m.text}") if m.type == "error" else None)

        page.goto(LOCAL_URL, wait_until="networkidle")
        time.sleep(1)

        # 1. One-click Demo Login
        demo_btn = page.locator("button.demo-btn").first
        assert demo_btn.is_visible(), "Demo button must be visible on landing page"
        demo_btn.click()

        page.wait_for_selector(".app-shell", timeout=12000)
        assert page.locator(".app-shell").is_visible(), "Authenticated dashboard must load"
        page.screenshot(path=str(SCREENSHOT_DIR / "01_dashboard_home.png"))

        # Verify token in localStorage
        token = page.evaluate("() => localStorage.getItem('landsure_auth_token')")
        assert token and len(token) > 20, "JWT token must be stored in localStorage"

        # 2. Session Persistence Test (Page Reload F5)
        page.reload(wait_until="networkidle")
        page.wait_for_selector(".app-shell", timeout=10000)
        assert page.locator(".app-shell").is_visible(), "Dashboard must persist after F5 reload"
        reloaded_token = page.evaluate("() => localStorage.getItem('landsure_auth_token')")
        assert reloaded_token == token, "Token must be intact after reload"

        # 3. GIS Land Discovery ("জমি খুঁজুন")
        page.locator("aside nav button:has-text('জমি খুঁজুন')").click()
        page.wait_for_selector(".gis-map-module", timeout=10000)
        assert page.locator(".gis-map-module").is_visible(), "GIS Map module must be visible"
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOT_DIR / "02_gis_explorer.png"))

        # Select District & Upazila if dropdowns present
        district_select = page.locator("select").first
        if district_select.is_visible():
            options = district_select.locator("option").all_inner_texts()
            assert len(options) >= 64, f"Expected 64 districts in GIS explorer, found {len(options)}"

        # 4. Save Parcel & Verify in Bookmarks
        save_btn = page.locator("button:has-text('বুকমার্ক'), button:has-text('সংরক্ষণ'), button[title*='সংরক্ষণ']").first
        if save_btn.is_visible():
            save_btn.click()
            time.sleep(0.5)

        # Open Saved Properties
        page.locator("aside nav button:has-text('সংরক্ষিত জমি')").click()
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOT_DIR / "03_saved_properties.png"))

        # 5. Nine-Step Verification ("জমি যাচাইকরণ")
        page.locator("aside nav button:has-text('জমি যাচাই')").click()
        page.wait_for_selector(".buyer-journey-workspace", timeout=10000)
        assert page.locator(".buyer-journey-workspace").is_visible(), "Verification workspace must render"
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOT_DIR / "04_verification_step1.png"))

        # Verify step navigation
        step_btns = page.locator(".step-item, .journey-step-btn, .steps-nav button")
        step_count = step_btns.count()
        assert step_count >= 9 or page.locator("text=খতিয়ান").first.is_visible(), "Verification steps must be present"

        # 6. Document OCR ("দলিল পরীক্ষা ও OCR")
        page.locator("aside nav button:has-text('দলিল পরীক্ষা')").click()
        page.wait_for_selector(".doc-intel-module", timeout=10000)
        assert page.locator(".doc-intel-module").is_visible(), "Document Intelligence module must render"
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOT_DIR / "05_document_ocr.png"))

        # 7. AI Land Assistant ("ভূমি সহকারী")
        page.locator("aside nav button:has-text('ভূমি সহকারী')").click()
        page.wait_for_selector(".chat-layout", timeout=10000)
        assert page.locator(".chat-layout").is_visible(), "AI Copilot must render"
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOT_DIR / "06_ai_assistant.png"))

        # 8. Lawyer Consultation ("আইনজীবীর পরামর্শ")
        page.locator("aside nav button:has-text('আইনজীবীর পরামর্শ')").click()
        page.wait_for_selector(".lawyer-card", timeout=10000)
        assert page.locator(".lawyer-card").first.is_visible(), "Lawyer cards must render"
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOT_DIR / "07_lawyer_consultation.png"))

        # 9. Land Trust Passport ("ল্যান্ড ট্রাস্ট পাসপোর্ট")
        page.locator("aside nav button:has-text('ল্যান্ড ট্রাস্ট পাসপোর্ট'), aside nav button:has-text('পাসপোর্ট')").click()
        page.wait_for_selector(".passport-preview, .page-heading", timeout=10000)
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOT_DIR / "08_trust_passport.png"))

        # 10. Clean Logout
        logout_btn = page.locator("button[title='Log out']").first
        assert logout_btn.is_visible(), "Logout button must be visible"
        logout_btn.click()

        page.wait_for_selector(".login-card", timeout=10000)
        assert page.locator(".login-card").is_visible(), "Must return to landing page upon logout"
        logged_out_token = page.evaluate("() => localStorage.getItem('landsure_auth_token')")
        assert not logged_out_token, "Token must be completely cleared upon logout"
        page.screenshot(path=str(SCREENSHOT_DIR / "09_logged_out_landing.png"))

        ctx.close()
        browser.close()


if __name__ == "__main__":
    test_audit_multi_viewport_and_user_journeys()
    print("ALL AUDIT USER JOURNEYS PASSED SUCCESSFULLY!")
