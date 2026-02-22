from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Get absolute path to index.html
        cwd = os.getcwd()
        file_path = os.path.join(cwd, 'src/renderer/index.html')
        url = f'file://{file_path}'

        print(f"Loading {url}")

        # Load the page
        try:
            page.goto(url)
        except Exception as e:
            print(f"Error loading page: {e}")

        # Wait a bit for layout
        page.wait_for_timeout(2000)

        # Check for key elements
        try:
            threat_level = page.locator("#threat-level").text_content()
            print(f"Threat Level: {threat_level}")

            map_canvas = page.locator("#map-canvas")
            if map_canvas.count() > 0:
                print("Map Canvas found.")
            else:
                print("Map Canvas NOT found.")

        except Exception as e:
            print(f"Error inspecting elements: {e}")

        # Take screenshot
        screenshot_path = os.path.join(cwd, 'verification/ui_screenshot.png')
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run()
