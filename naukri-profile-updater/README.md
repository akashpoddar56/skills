# Naukri Profile Auto-Updater

Keeps your Naukri.com profile marked as "recently updated" by toggling a trailing period in your Professional Summary **6 times a day at 4-hour intervals**.

## How it works

Each run checks the current state and either **adds** or **removes** a single `.` at the end of your professional summary, then saves. Naukri registers this as a profile update, bumping your visibility in recruiter searches.

Schedule: `02:00 → 06:00 → 10:00 → 14:00 → 18:00 → 22:00` (repeats daily).

## Setup

### 1. Install dependencies

```bash
pip3 install -r requirements.txt
playwright install chromium
```

### 2. Create your credentials file

```bash
# In the naukri-profile-updater/ directory:
cat > .env <<'EOF'
NAUKRI_EMAIL=your@email.com
NAUKRI_PASSWORD=yourpassword
EOF
chmod 600 .env   # keep it private
```

### 3. Test a single run

```bash
set -a; source .env; set +a
python3 naukri_updater.py
```

Check `updater.log` to confirm it worked.

### 4. Install the cron job

```bash
chmod +x setup_cron.sh
./setup_cron.sh
```

Verify: `crontab -l`

## Files

| File | Purpose |
|---|---|
| `naukri_updater.py` | Main automation script |
| `setup_cron.sh` | Installs the cron schedule |
| `state.json` | Tracks current period state (auto-created) |
| `updater.log` | Per-run log |
| `cron.log` | Cron stdout/stderr |
| `.env` | Your credentials (never commit this) |

## Remove the cron job

```bash
crontab -l | grep -v naukri_updater | crontab -
```

## Notes

- Runs headless (no visible browser window).
- State survives restarts — the script reads `state.json` to know whether the period is currently present.
- If Naukri updates their page layout, the selectors in `naukri_updater.py` may need adjusting.
