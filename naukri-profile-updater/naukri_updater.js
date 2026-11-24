#!/usr/bin/env node
/**
 * Naukri.com Professional Summary Auto-Updater
 * Toggles a trailing period in the professional summary to keep the profile
 * marked as "recently updated" in recruiter searches.
 *
 * Environment variables required:
 *   NAUKRI_EMAIL    - Naukri.com login email
 *   NAUKRI_PASSWORD - Naukri.com login password
 *
 * State is persisted in state.json.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'state.json');
const LOG_FILE   = path.join(__dirname, 'updater.log');

const NAUKRI_LOGIN_URL   = 'https://www.naukri.com/nlogin/login';
const NAUKRI_PROFILE_URL = 'https://www.naukri.com/mnjuser/profile';

function log(msg) {
  const line = `${new Date().toISOString()} [INFO] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return { period_present: false, run_count: 0 };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function login(page, email, password) {
  log('Navigating to Naukri login page...');
  await page.goto(NAUKRI_LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

  await page.fill('input[placeholder="Enter your active Email ID / Username"]', email);
  await page.fill('input[placeholder="Enter your password"]', password);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL('**/mnjuser/**', { timeout: 20000 });
    log('Login successful.');
  } catch {
    if (page.url().includes('nlogin')) {
      throw new Error('Login failed — check your credentials.');
    }
    log('Login completed (alternate redirect).');
  }
}

async function getSummaryAndTextarea(page) {
  log('Navigating to profile page...');
  await page.goto(NAUKRI_PROFILE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Open the Professional Summary edit panel
  try {
    await page.waitForSelector('text=Professional Summary', { timeout: 15000 });
    // Look for the edit/pencil icon near the Summary heading
    const summarySection = page.locator('section').filter({ hasText: 'Professional Summary' }).first();
    const editBtn = summarySection.locator('[class*="edit"], [title*="edit" i], [aria-label*="edit" i]').first();
    await editBtn.click();
  } catch {
    // Fallback: click the edit icon anywhere near "Professional Summary"
    await page.locator('text=Professional Summary').first().scrollIntoViewIfNeeded();
    const container = page.locator('text=Professional Summary').locator('xpath=ancestor::div[1]');
    await container.locator('[class*="edit"]').first().click();
  }

  // Wait for the textarea or contenteditable to appear
  await page.waitForSelector('textarea[name="summary"], div[contenteditable="true"]', { timeout: 10000 });

  const textarea = page.locator('textarea[name="summary"]').first();
  let currentText;
  if (await textarea.isVisible()) {
    currentText = await textarea.inputValue();
  } else {
    const ce = page.locator('div[contenteditable="true"]').first();
    currentText = await ce.innerText();
    return { currentText, textarea: ce, isContentEditable: true };
  }
  log(`Current summary length: ${currentText.length} chars`);
  return { currentText, textarea, isContentEditable: false };
}

async function updateSummary(page, textarea, newText, isContentEditable) {
  if (!isContentEditable) {
    await textarea.click({ clickCount: 3 });
    await textarea.fill(newText);
  } else {
    await textarea.click({ clickCount: 3 });
    await textarea.type(newText);
  }

  await page.waitForTimeout(500);

  const saveBtn = page.locator('button:has-text("Save"), input[value="Save"]').first();
  await saveBtn.click();

  try {
    await page.waitForSelector('[class*="success"], [class*="toast"], [class*="snackbar"]', { timeout: 10000 });
    log('Summary saved successfully.');
  } catch {
    log('Save completed (no toast detected — may still have succeeded).');
  }
}

async function run() {
  const email    = process.env.NAUKRI_EMAIL;
  const password = process.env.NAUKRI_PASSWORD;

  if (!email || !password) {
    const msg = 'ERROR: Set NAUKRI_EMAIL and NAUKRI_PASSWORD environment variables before running.';
    log(msg);
    process.exit(1);
  }

  const state = loadState();
  const periodWasPresent = state.period_present;
  const runCount = (state.run_count || 0) + 1;
  const shouldAddPeriod = !periodWasPresent;

  log(`--- Run #${runCount} at ${new Date().toISOString()} ---`);
  log(`${shouldAddPeriod ? 'Adding' : 'Removing'} trailing period in professional summary.`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    await login(page, email, password);

    const { currentText, textarea, isContentEditable } = await getSummaryAndTextarea(page);

    const baseText = currentText.replace(/\.*$/, '');
    const newText  = shouldAddPeriod ? baseText + '.' : baseText;

    if (newText === currentText) {
      log('Summary already in the desired state — no change needed.');
    } else {
      await updateSummary(page, textarea, newText, isContentEditable);
      log(`Summary updated. Period present: ${shouldAddPeriod}`);
    }

    state.period_present = shouldAddPeriod;
    state.run_count      = runCount;
    state.last_run       = new Date().toISOString();
    saveState(state);

    log(`Done. Next run will ${shouldAddPeriod ? 'remove' : 'add'} the period.\n`);
  } catch (err) {
    log(`ERROR: ${err.message}`);
    await browser.close();
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
