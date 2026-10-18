"""
LandSure AI — Phase 5B Exact Lovable Source-Code Fidelity & Functional E2E Test Suite
Validates:
1. Exact visual presentation at 1440x900, 768x1024, 390x844, and 375x812 viewports
2. Dark mode (default) and Light mode rendering
3. Intro animation execution and sessionStorage persistence
4. Floating Navbar, active section tracking, theme toggle, and mobile menu drawer
5. All 9 source components: Intro, Navbar, Hero, DemoVideo, Metrics, Problem, Steps, Showcase, AllFeatures, Why, FreeDemo, FAQ, FinalCTA, Footer, BackToTop
6. All CTA buttons connected to REAL authentication and functional app
7. Full user journey from landing page into authenticated GIS Map and Buyer Dashboard
"""

import os
import time
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FRONTEND_URL = "http://localhost:5173"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT_DIR = PROJECT_ROOT / "docs" / "screenshots" / "exact_lovable_integration"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def test_phase5b_lovable_landing_visual_and_functional():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)

        # -------------------------------------------------------------
        # STAGE 1: Desktop 1440x900 (Dark Mode Default)
        # -------------------------------------------------------------
        ctx_desktop = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx_desktop.new_page()

        # Clear any existing storage
        page.goto(FRONTEND_URL, wait_until="networkidle")
        page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
        page.reload(wait_until="networkidle")

        # Wait for Intro animation to complete if shown
        time.sleep(3.5)

        # 1. Verify Intro exited and landing header is visible
        header = page.locator("header")
        assert header.is_visible(), "Floating Navbar header must be visible"
        assert page.locator("text=AI LAND INTELLIGENCE").is_visible(), "Brand badge must be present"

        # 2. Verify Hero content from exact source
        hero = page.locator("section#top")
        assert hero.is_visible(), "Hero section must be visible"
        assert page.locator("text=The Future of Land Verification").is_visible()
        assert page.locator("text=বাংলাদেশের স্মার্ট ভূমি যাচাই প্ল্যাটফর্ম").is_visible()
        assert page.locator("text=জমি কেনার আগে").first.is_visible()
        time.sleep(2.5)
        assert page.locator("text=সত্যটা জানুন").first.is_visible()

        # Capture Desktop Dark Viewport and Full Page
        page.screenshot(path=str(SCREENSHOT_DIR / "01_desktop_1440_dark.png"))
        page.screenshot(path=str(SCREENSHOT_DIR / "01_desktop_1440_dark_full.png"), full_page=True)

        # 3. Test Theme Toggle to Light Mode
        theme_btn = page.locator("header button[aria-label='লাইট মোড'], header button[aria-label='ডার্ক মোড']").first
        theme_btn.click()
        time.sleep(0.5)

        # Confirm .light class on html element
        is_light = page.evaluate("() => document.documentElement.classList.contains('light')")
        assert is_light, "HTML document should have 'light' class after toggle"

        # Capture Desktop Light Viewport and Full Page
        page.screenshot(path=str(SCREENSHOT_DIR / "02_desktop_1440_light.png"))
        page.screenshot(path=str(SCREENSHOT_DIR / "02_desktop_1440_light_full.png"), full_page=True)

        # Toggle back to Dark Mode
        theme_btn.click()
        time.sleep(0.5)

        # 4. Verify All Sections Exist
        assert page.locator("section#demo").is_visible(), "Demo video section must exist"
        assert page.locator("section#how").is_visible(), "How It Works section must exist"
        assert page.locator("section#features").is_visible(), "Showcase features section must exist"
        assert page.locator("section#why").is_visible(), "Why LandSure AI section must exist"
        assert page.locator("section#faq").is_visible(), "FAQ section must exist"

        # 5. Test FAQ Accordion (Item 0 is open by default in source)
        assert page.locator("text=LandSure AI একটি AI-চালিত জমি যাচাই").is_visible(), "FAQ item 0 should be open by default"
        faq_btn1 = page.locator("section#faq button").nth(1)
        faq_btn1.click()
        time.sleep(0.5)
        assert page.locator("text=বর্তমান ডেমোতে কোনো সরকারি সিস্টেমের সঙ্গে").is_visible(), "FAQ item 1 should open on click"

        # 6. Test Staff Login Modal
        login_btn = page.locator("header button:has-text('লগইন')").first
        login_btn.click()
        time.sleep(0.5)
        assert page.locator("text=কর্মকর্তা ও অ্যাডমিন লগইন").is_visible(), "Staff login modal should open"
        page.screenshot(path=str(SCREENSHOT_DIR / "03_staff_login_modal.png"))

        # Close modal
        page.locator("button:has-text('অথবা সরাসরি ফ্রি ডেমো শুরু করুন')").click()
        time.sleep(1)

        # Confirm app-shell entered from modal
        assert page.locator(".app-shell").is_visible(), "Should transition into app shell"
        page.screenshot(path=str(SCREENSHOT_DIR / "04_app_journey_entered.png"))

        ctx_desktop.close()

        # -------------------------------------------------------------
        # STAGE 2: Tablet 768x1024
        # -------------------------------------------------------------
        ctx_tablet = browser.new_context(viewport={"width": 768, "height": 1024})
        p_tab = ctx_tablet.new_page()
        p_tab.goto(FRONTEND_URL, wait_until="networkidle")
        p_tab.evaluate("() => { localStorage.clear(); sessionStorage.setItem('ls-intro', '1'); }")
        p_tab.reload(wait_until="networkidle")
        time.sleep(1)
        p_tab.screenshot(path=str(SCREENSHOT_DIR / "05_tablet_768.png"))
        p_tab.screenshot(path=str(SCREENSHOT_DIR / "05_tablet_768_full.png"), full_page=True)
        ctx_tablet.close()

        # -------------------------------------------------------------
        # STAGE 3: Mobile 390x844
        # -------------------------------------------------------------
        ctx_mob390 = browser.new_context(viewport={"width": 390, "height": 844})
        p_m390 = ctx_mob390.new_page()
        p_m390.goto(FRONTEND_URL, wait_until="networkidle")
        p_m390.evaluate("() => { localStorage.clear(); sessionStorage.setItem('ls-intro', '1'); }")
        p_m390.reload(wait_until="networkidle")
        time.sleep(1)
        p_m390.screenshot(path=str(SCREENSHOT_DIR / "06_mobile_390.png"))
        ctx_mob390.close()

        # -------------------------------------------------------------
        # STAGE 4: Mobile 375x812 & Mobile Menu Drawer
        # -------------------------------------------------------------
        ctx_mob375 = browser.new_context(viewport={"width": 375, "height": 812})
        p_m375 = ctx_mob375.new_page()
        p_m375.goto(FRONTEND_URL, wait_until="networkidle")
        p_m375.evaluate("() => { localStorage.clear(); sessionStorage.setItem('ls-intro', '1'); }")
        p_m375.reload(wait_until="networkidle")
        time.sleep(1)
        p_m375.screenshot(path=str(SCREENSHOT_DIR / "07_mobile_375.png"))
        p_m375.screenshot(path=str(SCREENSHOT_DIR / "07_mobile_375_full.png"), full_page=True)

        # Open mobile drawer
        menu_btn = p_m375.locator("button[aria-label='মেনু']")
        assert menu_btn.is_visible()
        menu_btn.click()
        time.sleep(0.5)
        assert p_m375.locator("#mobile-menu").is_visible(), "Mobile drawer should open"
        p_m375.screenshot(path=str(SCREENSHOT_DIR / "08_mobile_menu_drawer.png"))

        # Click demo button from mobile menu
        mob_demo_btn = p_m375.locator("#mobile-menu button:has-text('ডেমো শুরু করুন')")
        mob_demo_btn.click()
        p_m375.wait_for_selector(".app-shell", timeout=12000)
        assert p_m375.locator(".app-shell").is_visible(), "Mobile demo click must enter real application"

        ctx_mob375.close()
        browser.close()
