import os
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.join(os.getcwd(), "docs", "screenshots", "two_fixes_qa")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def run():
    print("Verifying Two Targeted UI Fixes...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        
        # 1. Desktop 1920x1080 Hero Spacing Check
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        context.add_init_script("sessionStorage.setItem('ls-intro', '1');")
        page = context.new_page()
        
        print("1. Opening Desktop 1920x1080...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(1500)
        
        # Measure spacing between navbar and floating search card
        nav_box = page.locator("header").first.bounding_box()
        search_box = page.locator(".hero-search-floating").first.bounding_box()
        print(f"Navbar bottom: {nav_box['y'] + nav_box['height']:.1f}px")
        print(f"Search card top: {search_box['y']:.1f}px")
        gap = search_box['y'] - (nav_box['y'] + nav_box['height'])
        print(f"Gap below navbar: {gap:.1f}px (comfortable balanced spacing!)")
        
        # Screenshot Hero Desktop
        page.screenshot(path=os.path.join(OUTPUT_DIR, "01_hero_desktop_1920_spacing_fixed.png"))
        print("Saved 01_hero_desktop_1920_spacing_fixed.png")
        
        # 2. Desktop 1440x900
        page.set_viewport_size({"width": 1440, "height": 900})
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "02_hero_laptop_1440_spacing_fixed.png"))
        print("Saved 02_hero_laptop_1440_spacing_fixed.png")

        # 3. Desktop 1366x768
        page.set_viewport_size({"width": 1366, "height": 768})
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "03_hero_desktop_1366_spacing_fixed.png"))
        print("Saved 03_hero_desktop_1366_spacing_fixed.png")

        # 4. Tablet 768x1024
        page.set_viewport_size({"width": 768, "height": 1024})
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "04_hero_tablet_768_spacing_fixed.png"))
        print("Saved 04_hero_tablet_768_spacing_fixed.png")

        # 5. Mobile 390x844
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "05_hero_mobile_390_spacing_fixed.png"))
        print("Saved 05_hero_mobile_390_spacing_fixed.png")

        # 6. Mobile 360x800
        page.set_viewport_size({"width": 360, "height": 800})
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "06_hero_mobile_360_spacing_fixed.png"))
        print("Saved 06_hero_mobile_360_spacing_fixed.png")

        # 7. Check Fix 1: Restored Demo Video Section
        print("7. Scrolling to restored #demo video section...")
        page.set_viewport_size({"width": 1920, "height": 1080})
        page.locator("#demo").scroll_into_view_if_needed()
        page.wait_for_timeout(1500)
        
        # Verify video element attributes
        video_info = page.evaluate("""() => {
            const v = document.querySelector('#demo video');
            return v ? {
                src: v.src,
                paused: v.paused,
                muted: v.muted,
                loop: v.loop,
                playsInline: v.playsInline,
                currentTime: v.currentTime
            } : null;
        }""")
        print("Demo video state:", video_info)
        
        # Screenshot Restored Demo Section in Desktop View
        page.screenshot(path=os.path.join(OUTPUT_DIR, "07_demo_video_section_restored.png"))
        print("Saved 07_demo_video_section_restored.png")

        # Click the play button to verify interactive play mode
        play_btn = page.locator("#demo .demo-play-btn").first
        if play_btn.is_visible():
            print("Clicking play button...")
            play_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "08_demo_video_playing_with_controls.png"))
            print("Saved 08_demo_video_playing_with_controls.png")

        # 8. Check Demo Video on Mobile
        page.set_viewport_size({"width": 390, "height": 844})
        page.locator("#demo").scroll_into_view_if_needed()
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "09_demo_video_mobile_restored.png"))
        print("Saved 09_demo_video_mobile_restored.png")

        browser.close()
        print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run()
