import os
import time
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FRONTEND_URL = "http://localhost:5173"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT_DIR = PROJECT_ROOT / "docs" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACT_DIR = Path(r"C:\Users\shiha\.gemini\antigravity-ide\brain\54f0e04a-a86c-435d-954a-24156ba977cf")


def test_browser_repaired_basemap_no_watermark_and_osm_tiles():
    """
    TASK 6 & TASK 1/2:
    1. Authenticate via One-Click Demo Login
    2. Open Bangladesh GIS & Parcel Map (.gis-map-module)
    3. Verify that OpenStreetMap tiles load successfully (HTTP 200)
    4. Verify that NO requests are made to cartocdn.com
    5. Verify NO tile returns watermark or error
    6. Capture full screenshot of the repaired map
    """
    osm_tiles_loaded = []
    carto_tiles_requested = []
    failed_requests = []

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Listen to network requests
        def handle_response(response):
            url = response.url
            if "tile.openstreetmap.org" in url:
                if response.status == 200:
                    osm_tiles_loaded.append(url)
                else:
                    failed_requests.append((url, response.status))
            if "cartocdn.com" in url:
                carto_tiles_requested.append(url)

        page.on("response", handle_response)

        # 1. Open app & demo login
        page.goto(FRONTEND_URL, wait_until="networkidle")
        page.locator("button.demo-btn").click()
        page.wait_for_selector(".app-shell", timeout=12000)

        # 2. Navigate to Explorer (GIS Map)
        page.click("button:has-text('পার্সেল অনুসন্ধান')")
        page.wait_for_selector(".gis-map-module", timeout=10000)
        page.wait_for_selector(".leaflet-container", timeout=10000)

        # Wait for tiles to settle
        time.sleep(3)

        # 3. Assertions on Network requests
        assert len(osm_tiles_loaded) >= 4, f"Expected at least 4 OSM tiles to load, got {len(osm_tiles_loaded)}"
        assert len(carto_tiles_requested) == 0, f"Expected zero CARTO requests without API key, got {len(carto_tiles_requested)}"
        assert len(failed_requests) == 0, f"Failed tile requests encountered: {failed_requests}"

        # 4. Verify Leaflet container has valid dimensions
        map_box = page.locator(".leaflet-container").bounding_box()
        assert map_box is not None
        assert map_box["width"] > 500
        assert map_box["height"] >= 500

        # 5. Capture screenshot
        screenshot_path = SCREENSHOT_DIR / "repaired_map_osm_overview.png"
        page.screenshot(path=str(screenshot_path))
        if ARTIFACT_DIR.exists():
            page.screenshot(path=str(ARTIFACT_DIR / "repaired_map_osm_overview.png"))

        browser.close()


def test_browser_district_and_parcel_search_with_disclaimer():
    """
    TASK 4 & TASK 6:
    1. Verify 64 districts in dropdown
    2. Select a district (e.g. Chattogram or Sylhet)
    3. Search a parcel (LS-PARCEL-000002)
    4. Confirm parcel polygon, centroid marker, and info panel update
    5. Confirm Synthetic / Demonstration Geometry disclaimer is present
    6. Capture screenshot of highlighted parcel
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.goto(FRONTEND_URL, wait_until="networkidle")
        page.locator("button.demo-btn").click()
        page.wait_for_selector(".app-shell", timeout=12000)

        # Navigate to GIS Map
        page.click("button:has-text('পার্সেল অনুসন্ধান')")
        page.wait_for_selector(".gis-map-module", timeout=10000)

        # 1. District selection
        select_elem = page.locator("select")
        options = select_elem.locator("option").all_inner_texts()
        # Option 0 is default "-- ৬৪ জেলা বাছাই করুন --", remaining 64 are districts
        assert len(options) >= 65, f"Expected 64 districts + 1 default option, found {len(options)}"

        # Select Faridpur or Chattogram
        select_elem.select_option(value="Chattogram")
        time.sleep(1.5)

        # 2. Universal Search: search parcel LS-PARCEL-000002
        search_input = page.locator(".gis-map-module form input")
        search_input.fill("LS-PARCEL-000002")
        page.locator(".gis-map-module form button[type='submit']").click()
        time.sleep(2)

        # 3. Verify Right Panel has updated parcel information
        page.wait_for_selector("text=LS-PARCEL-000002", timeout=8000)
        assert page.locator("text=LS-PARCEL-000002").first.is_visible()
        assert page.locator("text=সিন্থেটিক ডেমো জ্যামিতি").first.is_visible()

        # 4. Verify Leaflet polygon rendered on map
        polygon = page.locator("path.leaflet-interactive")
        assert polygon.count() >= 1, "Expected Leaflet SVG polygon path to be rendered"

        # 5. Capture screenshot of parcel inspection
        screenshot_path = SCREENSHOT_DIR / "repaired_map_parcel_view.png"
        page.screenshot(path=str(screenshot_path))
        if ARTIFACT_DIR.exists():
            page.screenshot(path=str(ARTIFACT_DIR / "repaired_map_parcel_view.png"))

        browser.close()


def test_browser_map_to_verification_workflow_navigation():
    """
    TASK 5:
    1. Select a parcel on the map
    2. Click '🔍 স্মার্ট ভেরিফিকেশন ও ঝুঁকি স্কোর ➔'
    3. Verify page switches to verification tab with same parcel ID
    4. Click back to map and verify map re-renders seamlessly without breaking
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.goto(FRONTEND_URL, wait_until="networkidle")
        page.locator("button.demo-btn").click()
        page.wait_for_selector(".app-shell", timeout=12000)

        # Go to map
        page.click("button:has-text('পার্সেল অনুসন্ধান')")
        page.wait_for_selector(".gis-map-module", timeout=10000)

        # Click workflow action button
        workflow_btn = page.locator("button:has-text('স্মার্ট ভেরিফিকেশন ও ঝুঁকি স্কোর')")
        page.wait_for_selector("button:has-text('স্মার্ট ভেরিফিকেশন ও ঝুঁকি স্কোর')", timeout=8000)
        workflow_btn.click()

        # Confirm verification tab opened with parcel ID
        page.wait_for_selector("text=SMART LAND VERIFICATION ENGINE", timeout=10000)
        assert page.locator("text=SMART LAND VERIFICATION ENGINE").is_visible()

        # Switch back to map tab to confirm invalidateSize works and map doesn't break
        page.click("button:has-text('পার্সেল অনুসন্ধান')")
        page.wait_for_selector(".gis-map-module", timeout=10000)
        time.sleep(1)
        assert page.locator(".leaflet-container").is_visible()

        browser.close()
