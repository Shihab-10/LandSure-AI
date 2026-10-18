import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

OUTPUT_DIR = os.path.join(os.getcwd(), "docs", "screenshots", "pure_image_demo_restored")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        context.add_init_script("sessionStorage.setItem('ls-intro', '1');")
        page = context.new_page()

        print("1. Opening local site...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(1000)

        page.locator("#demo").scroll_into_view_if_needed()
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "01_desktop_demo_image_restored.png"))
        print("Saved 01_desktop_demo_image_restored.png")

        video_count = page.evaluate("() => document.querySelectorAll('#demo video').length")
        img_src = page.evaluate("() => document.querySelector('#demo img') ? document.querySelector('#demo img').src : null")
        img_complete = page.evaluate("() => document.querySelector('#demo img') ? document.querySelector('#demo img').complete : false")
        img_natural_w = page.evaluate("() => document.querySelector('#demo img') ? document.querySelector('#demo img').naturalWidth : 0")

        print(f"Video element count in #demo: {video_count} (Must be 0)")
        print(f"Image source: {img_src}")
        print(f"Image load status: complete={img_complete}, naturalWidth={img_natural_w}")

        # Check mobile as well
        page.set_viewport_size({"width": 390, "height": 844})
        page.locator("#demo").scroll_into_view_if_needed()
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "02_mobile_demo_image_restored.png"))
        print("Saved 02_mobile_demo_image_restored.png")

        # Click play button to verify it launches real demo dashboard
        page.set_viewport_size({"width": 1920, "height": 1080})
        play_btn = page.locator("#demo .demo-play-btn").first
        play_btn.click()
        page.wait_for_timeout(1500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "03_play_button_opened_demo_dashboard.png"))
        print("Saved 03_play_button_opened_demo_dashboard.png")

        browser.close()
    print("Verification completed successfully!")

if __name__ == "__main__":
    verify()
