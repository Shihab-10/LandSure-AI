import os
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.join(os.getcwd(), "docs", "screenshots", "hero_redesign_qa")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run():
    print("Testing Redesigned Landing Page Hero with Edge...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        
        # 1. Desktop 1920x1080
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        # Bypass intro splash by setting sessionStorage flag on entire context
        context.add_init_script("sessionStorage.setItem('ls-intro', '1');")
        page = context.new_page()
        
        print("1. Opening Desktop 1920x1080...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(1500)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_hero_desktop_1920x1080.png"))
        print("Saved 01_hero_desktop_1920x1080.png")

        # 2. Laptop 1440x900
        page.set_viewport_size({"width": 1440, "height": 900})
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_hero_laptop_1440x900.png"))
        print("Saved 02_hero_laptop_1440x900.png")

        # 3. Tablet Landscape 1024x768
        page.set_viewport_size({"width": 1024, "height": 768})
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_hero_tablet_1024x768.png"))
        print("Saved 03_hero_tablet_1024x768.png")

        # 4. Tablet Portrait 768x1024
        page.set_viewport_size({"width": 768, "height": 1024})
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_hero_tablet_768x1024.png"))
        print("Saved 04_hero_tablet_768x1024.png")

        # 5. Mobile iPhone 390x844
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_hero_mobile_390x844.png"))
        print("Saved 05_hero_mobile_390x844.png")

        # 6. Mobile Android 360x800
        page.set_viewport_size({"width": 360, "height": 800})
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_hero_mobile_360x800.png"))
        print("Saved 06_hero_mobile_360x800.png")

        # 7. Test Primary CTA: "জমি যাচাই শুরু করুন"
        print("7. Testing Primary CTA 'জমি যাচাই শুরু করুন'...")
        page.set_viewport_size({"width": 1920, "height": 1080})
        primary_cta = page.locator("button[aria-label='জমি যাচাই শুরু করুন']").first
        if primary_cta.is_visible():
            primary_cta.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_primary_cta_navigation_success.png"))
            print("Saved 07_primary_cta_navigation_success.png")

        # 8. Test Secondary CTA: "ডেমো দেখুন" from landing
        print("8. Testing Secondary CTA 'ডেমো দেখুন'...")
        page.evaluate("() => { localStorage.clear(); sessionStorage.setItem('ls-intro', '1'); }")
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(1000)
        secondary_cta = page.locator("button:has-text('ডেমো দেখুন')").first
        if secondary_cta.is_visible():
            secondary_cta.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_secondary_cta_navigation_success.png"))
            print("Saved 08_secondary_cta_navigation_success.png")

        # 9. Test Result Card Action: "জমি দেখুন"
        print("9. Testing Floating Result Card button 'জমি দেখুন'...")
        page.evaluate("() => { localStorage.clear(); sessionStorage.setItem('ls-intro', '1'); }")
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(1000)
        result_btn = page.locator("button[title='জমি দেখুন']").first
        if result_btn.is_visible():
            result_btn.click(force=True)
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_result_card_navigation_success.png"))
            print("Saved 09_result_card_navigation_success.png")

        browser.close()
        print("ALL HERO TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run()
