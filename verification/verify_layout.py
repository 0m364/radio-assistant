from playwright.sync_api import sync_playwright
import os

def verify_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load local HTML file
        cwd = os.getcwd()
        file_path = f"file://{cwd}/src/renderer/index.html"
        print(f"Navigating to {file_path}")

        page.goto(file_path)

        # Take screenshot of the whole layout
        screenshot_path = "verification/layout.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_layout()
