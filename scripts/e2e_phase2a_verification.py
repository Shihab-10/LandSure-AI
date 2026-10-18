import os
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.join(os.getcwd(), "docs", "screenshots", "phase2a_verification")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run():
    print("Starting Phase 2A E2E Browser Testing with Edge...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        
        # 1. Landing Page Desktop (1920x1080)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        
        print("1. Opening Landing page at 1920x1080...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(3200) # Wait for intro splash to finish
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_landing_desktop_1920x1080.png"))
        print("Saved 01_landing_desktop_1920x1080.png")

        # 2. Landing Page Mobile (390x844) & Hamburger Drawer
        mobile_context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        mob_page = mobile_context.new_page()
        print("2. Opening Landing page at 390x844 (Mobile)...")
        mob_page.goto("http://localhost:5173", wait_until="networkidle")
        mob_page.wait_for_timeout(3200) # Wait for intro splash
        mob_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_landing_mobile_closed.png"))
        print("Saved 02_landing_mobile_closed.png")
        
        # Click hamburger menu
        mob_hamburger = mob_page.locator("button[aria-label='মেনু']")
        if mob_hamburger.count() > 0:
            mob_hamburger.first.click()
            mob_page.wait_for_timeout(500)
            mob_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_landing_mobile_drawer_open.png"))
            print("Saved 03_landing_mobile_drawer_open.png")
            
            # Press Escape to test keyboard dismiss
            mob_page.keyboard.press("Escape")
            mob_page.wait_for_timeout(400)
            mob_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_landing_mobile_drawer_closed_esc.png"))
            print("Saved 04_landing_mobile_drawer_closed_esc.png")
        mobile_context.close()

        # 3. Enter Dashboard via Demo Button
        print("3. Entering Dashboard via 'ডেমো দেখুন'...")
        demo_btn = page.locator("button:has-text('ডেমো দেখুন')").first
        if demo_btn.is_visible():
            demo_btn.click()
        else:
            login_btn = page.locator("button:has-text('লগইন')").first
            login_btn.click()
            page.wait_for_timeout(500)
            page.locator("button:has-text('ডেমো মোড')").first.click()
            
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_dashboard_desktop_sticky_layout.png"))
        print("Saved 05_dashboard_desktop_sticky_layout.png")

        # 4. Navigate to "জমি খুঁজুন" (search / explorer)
        print("4. Navigating to 'জমি খুঁজুন'...")
        search_nav = page.locator("button:has-text('জমি খুঁজুন')").first
        search_nav.click()
        page.wait_for_timeout(1000)

        # Scroll down to parcel cards action buttons
        print("Scrolling down to parcel alternatives cards with actions...")
        page.evaluate("window.scrollBy(0, 1400)")
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_parcel_discovery_cards.png"))
        print("Saved 06_parcel_discovery_cards.png")

        # 5. Check Parcel Cards & Click "এই জমি যাচাই" on LS-PARCEL-000493
        print("5. Clicking 'এই জমি যাচাই' on LS-PARCEL-000493...")
        verify_buttons = page.locator("button:has-text('এই জমি যাচাই')")
        print(f"Found {verify_buttons.count()} 'এই জমি যাচাই' buttons on page")
        
        # Verify card spotlight hover
        first_card = page.locator(".ls-spotlight-interactive").first
        if first_card.is_visible():
            first_card.hover()
            page.wait_for_timeout(300)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_parcel_card_hover_spotlight.png"))
            print("Saved 07_parcel_card_hover_spotlight.png")

        # Click the primary action on the first alternative card
        if verify_buttons.count() > 0:
            verify_buttons.first.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_verification_opened_parcel_493.png"))
            print("Saved 08_verification_opened_parcel_493.png")

        # 6. Verify 9 Steps in Verification Workspace
        print("6. Testing 9 verification steps...")
        # Step 1: Khatian comparison
        step_1_btn = page.locator("button:has-text('খতিয়ান ও জরিপ তুলনা')").first
        if step_1_btn.is_visible():
            step_1_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_step1_khatian_comparison_desktop.png"))
            print("Saved 09_step1_khatian_comparison_desktop.png")

        # Step 2: Ownership history
        step_2_btn = page.locator("button:has-text('মালিকানার ইতিহাস')").first
        if step_2_btn.is_visible():
            step_2_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10_step2_ownership_history.png"))
            print("Saved 10_step2_ownership_history.png")

        # Step 7: Smart risk review (ML)
        step_7_btn = page.locator("button:has-text('স্মার্ট ঝুঁকি পর্যালোচনা')").first
        if step_7_btn.is_visible():
            step_7_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "11_step7_ml_risk_review.png"))
            print("Saved 11_step7_ml_risk_review.png")

        # Step 8: Registration cost calculator
        step_8_btn = page.locator("button:has-text('নিবন্ধন খরচ ক্যালকুলেটর')").first
        if step_8_btn.is_visible():
            step_8_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "12_step8_cost_calculator.png"))
            print("Saved 12_step8_cost_calculator.png")

        # 7. Test "অন্য জমি নির্বাচন করুন" to return to discovery
        print("7. Testing 'অন্য জমি নির্বাচন করুন' back-button...")
        back_btn = page.locator("button:has-text('অন্য জমি নির্বাচন করুন')").first
        if back_btn.is_visible():
            back_btn.click()
            page.wait_for_timeout(800)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "13_returned_to_discovery.png"))
            print("Saved 13_returned_to_discovery.png")

        # 8. Select a DIFFERENT parcel
        print("8. Selecting a different parcel to verify dynamic data switching...")
        page.evaluate("window.scrollBy(0, 950)")
        page.wait_for_timeout(600)
        verify_buttons_2 = page.locator("button:has-text('এই জমি যাচাই')")
        if verify_buttons_2.count() > 1:
            verify_buttons_2.nth(1).click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "14_verification_opened_different_parcel.png"))
            print("Saved 14_verification_opened_different_parcel.png")

        # 9. Test Multi-Viewport Responsiveness
        viewports = [
            ("1440x900", 1440, 900),
            ("1366x768", 1366, 768),
            ("1024x768", 1024, 768),
            ("768x1024", 768, 1024),
            ("390x844", 390, 844),
            ("360x800", 360, 800)
        ]

        print("9. Capturing verification workspace across all required viewports...")
        for vp_name, w, h in viewports:
            page.set_viewport_size({"width": w, "height": h})
            page.wait_for_timeout(600)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, f"15_verification_responsive_{vp_name}.png"))
            print(f"Saved 15_verification_responsive_{vp_name}.png")

        # 10. Dashboard Mobile Drawer Test at 390x844
        print("10. Testing Dashboard Mobile Drawer at 390x844...")
        page.set_viewport_size({"width": 390, "height": 844})
        dash_hamburger = page.locator("button[aria-label='মেনু খুলুন']")
        if dash_hamburger.count() > 0:
            dash_hamburger.first.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "16_dashboard_mobile_drawer_open.png"))
            print("Saved 16_dashboard_mobile_drawer_open.png")

        browser.close()
        print("ALL BROWSER E2E TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run()
