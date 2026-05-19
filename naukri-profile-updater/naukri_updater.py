#!/usr/bin/env python3
"""
Naukri.com Professional Summary Auto-Updater
Toggles a trailing period in your professional summary to keep your profile
marked as "recently updated" in recruiter searches.

Usage:
    python3 naukri_updater.py

Environment variables required:
    NAUKRI_EMAIL    - Your Naukri.com login email
    NAUKRI_PASSWORD - Your Naukri.com login password

State is persisted in state.json (tracks whether period is currently present).
"""

import os
import json
import time
import sys
import logging
from pathlib import Path
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
except ImportError:
    print("Playwright not installed. Run: pip3 install playwright && playwright install chromium")
    sys.exit(1)

STATE_FILE = Path(__file__).parent / "state.json"
LOG_FILE = Path(__file__).parent / "updater.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

NAUKRI_LOGIN_URL = "https://www.naukri.com/nlogin/login"
NAUKRI_PROFILE_URL = "https://www.naukri.com/mnjuser/profile"


def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"period_present": False, "run_count": 0}


def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2))


def login(page, email: str, password: str):
    log.info("Navigating to Naukri login page...")
    page.goto(NAUKRI_LOGIN_URL, wait_until="networkidle", timeout=30000)

    page.fill('input[placeholder="Enter your active Email ID / Username"]', email)
    page.fill('input[placeholder="Enter your password"]', password)
    page.click('button[type="submit"]')

    try:
        page.wait_for_url("**/mnjuser/**", timeout=20000)
        log.info("Login successful.")
    except PlaywrightTimeoutError:
        # Some flows redirect differently
        if "nlogin" in page.url:
            raise RuntimeError("Login failed — check your credentials.")
        log.info("Login completed (alternate redirect).")


def get_current_summary(page) -> str:
    log.info("Navigating to profile page...")
    page.goto(NAUKRI_PROFILE_URL, wait_until="networkidle", timeout=30000)

    # Click the edit icon next to the Professional Summary section
    try:
        # Wait for the summary section to appear
        page.wait_for_selector('div[class*="widgetHead"] >> text=Professional Summary', timeout=15000)
        summary_section = page.locator('section[class*="summary"], div[class*="summary"]').first
        edit_btn = summary_section.locator('span[class*="edit"], button[class*="edit"]').first
        edit_btn.click()
    except Exception:
        # Fallback: try generic edit pencil near "Professional Summary" heading
        page.locator('text=Professional Summary').first.scroll_into_view_if_needed()
        page.locator('text=Professional Summary').locator('..').locator('[class*="edit"]').first.click()

    # Wait for textarea / contenteditable to appear
    page.wait_for_selector('textarea[name="summary"], div[contenteditable="true"]', timeout=10000)

    textarea = page.locator('textarea[name="summary"]').first
    if not textarea.is_visible():
        textarea = page.locator('div[contenteditable="true"]').first

    current_text = textarea.input_value() if textarea.get_attribute("contenteditable") is None else textarea.inner_text()
    log.info(f"Current summary length: {len(current_text)} chars")
    return current_text, textarea


def update_summary(page, textarea, new_text: str):
    tag = textarea.get_attribute("contenteditable")
    if tag is None:
        # Regular textarea
        textarea.triple_click()
        textarea.fill(new_text)
    else:
        # Contenteditable div
        textarea.triple_click()
        textarea.type(new_text)

    time.sleep(0.5)

    # Click Save button
    save_btn = page.locator('button:has-text("Save"), input[value="Save"]').first
    save_btn.click()

    try:
        # Wait for success toast or modal close
        page.wait_for_selector('[class*="success"], [class*="toast"], [class*="snackbar"]', timeout=10000)
        log.info("Summary saved successfully.")
    except PlaywrightTimeoutError:
        # Some saves close the modal silently
        log.info("Save completed (no toast detected — may still have succeeded).")


def run():
    email = os.environ.get("NAUKRI_EMAIL")
    password = os.environ.get("NAUKRI_PASSWORD")

    if not email or not password:
        log.error("Set NAUKRI_EMAIL and NAUKRI_PASSWORD environment variables before running.")
        sys.exit(1)

    state = load_state()
    period_was_present = state["period_present"]
    run_count = state["run_count"] + 1

    # Determine what to do: toggle the period
    should_add_period = not period_was_present

    action = "Adding" if should_add_period else "Removing"
    log.info(f"--- Run #{run_count} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---")
    log.info(f"{action} trailing period in professional summary.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        )
        page = context.new_page()

        try:
            login(page, email, password)

            current_text, textarea = get_current_summary(page)

            # Strip any existing trailing period first, then add if needed
            base_text = current_text.rstrip(".")
            new_text = base_text + "." if should_add_period else base_text

            if new_text == current_text:
                log.info("Summary already in the desired state — no change needed.")
            else:
                update_summary(page, textarea, new_text)
                log.info(f"Summary updated. Period present: {should_add_period}")

            state["period_present"] = should_add_period
            state["run_count"] = run_count
            state["last_run"] = datetime.now().isoformat()
            save_state(state)

        except Exception as e:
            log.error(f"Error during update: {e}")
            browser.close()
            sys.exit(1)

        finally:
            browser.close()

    log.info(f"Done. Next run will {'remove' if should_add_period else 'add'} the period.\n")


if __name__ == "__main__":
    run()
