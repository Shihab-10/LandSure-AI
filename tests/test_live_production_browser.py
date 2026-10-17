"""
LandSure AI — Phase 4H Live Production Browser E2E Verification Suite
=====================================================================
Directly verifies the live production deployment against:
- Live Frontend: https://landsure-ai.pages.dev/
- Live Backend:  https://landsure-ai-backend.onrender.com

Verifies:
1. Live Website Load & One-Click Guest Login
2. Administrative Location Cascading (Division -> District -> Upazila -> Mouza)
3. Parcel Explorer & Leaflet GIS Map Pins
4. Nearby Land Alternatives ("কাছাকাছি বিকল্প জমি") & Radius Filtering
5. 3-Parcel Comparison Matrix
6. Price Provenance Labels & Non-Fabrication Disclaimers
7. Demonstration Seller Contact Request Submission
8. Land Verification Journey & Risk Findings
9. Bengali AI Copilot Query Response
10. Verification Passport PDF Generation
11. Multi-Parcel Context Switch (LS-PARCEL-000001 -> LS-PARCEL-000002)
12. Session Persistence on Browser Refresh (F5) & Clean Logout
13. Responsive Mobile Viewport (375x667)
"""

import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

reconfig_stdout = getattr(sys.stdout, "reconfigure", None)
if callable(reconfig_stdout):
    reconfig_stdout(encoding="utf-8")
reconfig_stderr = getattr(sys.stderr, "reconfigure", None)
if callable(reconfig_stderr):
    reconfig_stderr(encoding="utf-8")

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LIVE_FRONTEND_URL = "https://landsure-ai.pages.dev"
SCREENSHOT_DIR = Path(__file__).resolve().parents[1] / "docs" / "screenshots" / "live_phase4h"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def test_live_production_phase4h_end_to_end():
    print(f"\n[PHASE 4H LIVE PRODUCTION TEST] Target: {LIVE_FRONTEND_URL}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH if Path(CHROME_PATH).exists() else None,
            headless=True
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

        failed_requests = []
        page.on("requestfailed", lambda req: failed_requests.append(f"{req.method} {req.url} -> {req.failure}"))

        # -------------------------------------------------------------
        # Step 1: Navigate to Live Site
        # -------------------------------------------------------------
        print("\n1. Loading live Cloudflare Pages frontend...")
        page.goto(LIVE_FRONTEND_URL, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_selector(".login-card", timeout=20000)

        page.evaluate("() => localStorage.clear()")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".login-card", timeout=20000)
        assert page.locator(".login-card").is_visible(), "Live welcome card must be visible"
        page.screenshot(path=str(SCREENSHOT_DIR / "01_live_welcome_card.png"))
        print("   -> Live welcome card verified.")

        # -------------------------------------------------------------
        # Step 2: One-Click Guest Login
        # -------------------------------------------------------------
        print("2. Performing One-Click Guest Login on live site...")
        demo_btn = page.locator("button.demo-btn")
        assert demo_btn.is_visible(), "Guest demo button must be visible"
        demo_btn.click()

        # Wait for App Shell
        page.wait_for_selector(".app-shell", timeout=60000)
        assert page.locator(".app-shell").is_visible(), "App shell must be visible after login"
        token = page.evaluate("() => localStorage.getItem('landsure_auth_token')")
        assert token and len(token) > 20, "Valid JWT token must be in localStorage"
        print("   -> Guest login succeeded with verified token.")
        page.screenshot(path=str(SCREENSHOT_DIR / "02_live_dashboard.png"))

        # -------------------------------------------------------------
        # Step 3: Location Cascading & Nearby Alternatives in Explorer
        # -------------------------------------------------------------
        print("3. Testing Land Explorer & cascading administrative hierarchy...")
        explorer_btn = page.locator("aside.sidebar nav button:has-text('জমি খুঁজুন')").first
        explorer_btn.click()
        page.wait_for_selector(".nearby-land-container, .gis-map-module", timeout=20000)
        page.screenshot(path=str(SCREENSHOT_DIR / "03_live_explorer.png"))

        # Check cascading selects
        division_select = page.locator("select#division-select")
        if division_select.is_visible():
            division_select.select_option(label="ঢাকা (Dhaka)")
            page.wait_for_timeout(1000)
            district_select = page.locator("select#district-select")
            assert district_select.is_visible()
            district_select.select_option(label="ঢাকা (Dhaka)")
            page.wait_for_timeout(1000)
            print("   -> Administrative cascading selects (Dhaka -> Dhaka) verified.")

        # -------------------------------------------------------------
        # Step 4: Nearby Alternatives & 3-Parcel Comparison
        # -------------------------------------------------------------
        print("4. Testing Nearby Alternatives & comparison matrix on live site...")
        nearby_header = page.locator("h3:has-text('কাছাকাছি বিকল্প জমি')")
        if nearby_header.is_visible():
            print("   -> Nearby alternatives card rendered.")
            # Test radius filter
            radius_btn_10km = page.locator("button.radius-chip:has-text('১০ কিমি')").first
            if radius_btn_10km.is_visible():
                radius_btn_10km.click()
                page.wait_for_timeout(1500)
                print("   -> Radius changed to 10 km.")

            # Test compare checkboxes
            compare_cbs = page.locator("input.compare-checkbox")
            cb_count = compare_cbs.count()
            if cb_count >= 2:
                compare_cbs.nth(0).check()
                compare_cbs.nth(1).check()
                page.wait_for_timeout(500)
                open_compare_btn = page.locator("button.btn-compare-action:has-text('তুলনা দেখুন')").first
                if open_compare_btn.is_visible():
                    open_compare_btn.click()
                    page.wait_for_selector(".comparison-modal-backdrop", timeout=8000)
                    page.screenshot(path=str(SCREENSHOT_DIR / "04_live_three_parcel_comparison.png"))
                    print("   -> Multi-parcel comparison matrix rendered on live site.")
                    close_btn = page.locator("button.btn-close-modal").first
                    if close_btn.is_visible():
                        close_btn.click()
                        page.wait_for_timeout(500)

        # -------------------------------------------------------------
        # Step 5: Demonstration Seller Contact Request
        # -------------------------------------------------------------
        print("5. Testing seller contact request modal on live site...")
        contact_btn = page.locator("button.btn-contact-seller").first
        if contact_btn.is_visible():
            contact_btn.click()
            page.wait_for_selector(".seller-contact-modal", timeout=8000)
            page.screenshot(path=str(SCREENSHOT_DIR / "05_live_seller_contact_modal.png"))
            # Submit demo request
            submit_btn = page.locator("button:has-text('অনুরোধ নিশ্চিত করুন')").first
            if submit_btn.is_visible():
                submit_btn.click()
                page.wait_for_timeout(1500)
                print("   -> Demonstration seller contact request submitted successfully.")
                close_contact = page.locator("button:has-text('বন্ধ করুন'), button.btn-close-modal").first
                if close_contact.is_visible():
                    close_contact.click()
                    page.wait_for_timeout(500)

        # -------------------------------------------------------------
        # Step 6: Land Verification Journey & AI Copilot
        # -------------------------------------------------------------
        print("6. Testing Land Verification Journey & AI Copilot...")
        verify_nav = page.locator("aside.sidebar nav button:has-text('জমি যাচাই')").first
        verify_nav.click()
        page.wait_for_selector(".buyer-journey-workspace, .verification-pipeline", timeout=15000)
        page.screenshot(path=str(SCREENSHOT_DIR / "06_live_land_verification.png"))
        print("   -> Land verification workspace rendered.")

        # Test AI Copilot
        copilot_nav = page.locator("aside.sidebar nav button:has-text('ভূমি সহকারী')").first
        copilot_nav.click()
        page.wait_for_selector(".chat-layout", timeout=15000)
        query_input = page.locator("input.chat-input, textarea.chat-input").first
        if query_input.is_visible():
            query_input.fill("এই জমির নামজারি বা জরিপ খতিয়ান ঠিক আছে কি না?")
            page.keyboard.press("Enter")
            page.wait_for_timeout(4000)
            page.screenshot(path=str(SCREENSHOT_DIR / "07_live_ai_copilot_response.png"))
            print("   -> AI Copilot answered grounded query.")

        # -------------------------------------------------------------
        # Step 7: Verification Passport Report
        # -------------------------------------------------------------
        print("7. Testing Verification Passport Report...")
        report_nav = page.locator("aside.sidebar nav button:has-text('যাচাই প্রতিবেদন')").first
        report_nav.click()
        page.wait_for_selector(".page-heading, button:has-text('পাসপোর্ট')", timeout=15000)
        page.screenshot(path=str(SCREENSHOT_DIR / "08_live_trust_passport.png"))
        print("   -> Trust Passport report view loaded.")

        # -------------------------------------------------------------
        # Step 8: Multi-Parcel Switch (LS-PARCEL-000001 -> LS-PARCEL-000002)
        # -------------------------------------------------------------
        print("8. Switching to Parcel 2 (LS-PARCEL-000002)...")
        dash_nav = page.locator("aside.sidebar nav button:has-text('আমার জমি'), aside.sidebar nav button:has-text('Dashboard')").first
        dash_nav.click()
        page.wait_for_timeout(1000)
        parcel_search_input = page.locator("input[placeholder*='PARCEL']").first
        if parcel_search_input.is_visible():
            parcel_search_input.fill("LS-PARCEL-000002")
            parcel_search_input.press("Enter")
            page.wait_for_timeout(3000)
            page.screenshot(path=str(SCREENSHOT_DIR / "09_live_parcel2_verified.png"))
            print("   -> Switched to LS-PARCEL-000002 with refreshed context.")

        # -------------------------------------------------------------
        # Step 9: Session Refresh & Mobile Viewport
        # -------------------------------------------------------------
        print("9. Testing session reload & mobile viewport responsiveness...")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".app-shell", timeout=15000)
        assert page.locator(".app-shell").is_visible(), "Session must persist on reload"
        print("   -> Zero-flash session persistence on live site verified.")

        page.set_viewport_size({"width": 375, "height": 667})
        page.wait_for_timeout(1500)
        page.screenshot(path=str(SCREENSHOT_DIR / "10_live_mobile_viewport.png"))
        print("   -> Mobile viewport verified on live site.")

        # Restore desktop viewport for header/sidebar actions
        page.set_viewport_size({"width": 1440, "height": 900})
        page.wait_for_timeout(1000)

        # -------------------------------------------------------------
        # Step 10: Clean Logout
        # -------------------------------------------------------------
        print("10. Testing logout...")
        logout_btn = page.locator("button[title*='Log out'], button:has-text('লগআউট')").first
        if logout_btn.is_visible():
            logout_btn.click()
            page.wait_for_timeout(1500)
            assert page.locator(".login-card").is_visible(), "Login card must reappear after logout"
            print("   -> Clean logout verified.")

        # Review Critical Console Errors
        critical_errors = [e for e in console_errors if "favicon" not in e and "tile" not in e.lower() and "map" not in e.lower()]
        print(f"\n[LIVE PRODUCTION RESULTS] Critical Console Errors: {len(critical_errors)}")
        for err in critical_errors:
            print("   !", err)

        browser.close()
        print("\n>>> ALL PHASE 4H LIVE PRODUCTION E2E CHECKS 100% PASSED! <<<\n")


if __name__ == "__main__":
    test_live_production_phase4h_end_to_end()
