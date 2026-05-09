#!/usr/bin/env bash
# Sets up a cron job that runs naukri_updater.py every 4 hours, 6 times a day.
# Times: 06:00, 10:00, 14:00, 18:00, 22:00, 02:00

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$(which python3)"
SCRIPT="$SCRIPT_DIR/naukri_updater.py"
ENV_FILE="$SCRIPT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: Create $ENV_FILE with your credentials first:"
    echo "  NAUKRI_EMAIL=your@email.com"
    echo "  NAUKRI_PASSWORD=yourpassword"
    exit 1
fi

# Source env file to validate it has both keys
source "$ENV_FILE"
if [[ -z "${NAUKRI_EMAIL:-}" || -z "${NAUKRI_PASSWORD:-}" ]]; then
    echo "ERROR: .env must define NAUKRI_EMAIL and NAUKRI_PASSWORD"
    exit 1
fi

# Build the cron line — sources .env before running
CRON_LINE="0 2,6,10,14,18,22 * * * set -a; source $ENV_FILE; set +a; $PYTHON $SCRIPT >> $SCRIPT_DIR/cron.log 2>&1"

# Remove any existing naukri cron entry, then add the new one
( crontab -l 2>/dev/null | grep -v "naukri_updater" ; echo "$CRON_LINE" ) | crontab -

echo "Cron job installed. Schedule: 02:00, 06:00, 10:00, 14:00, 18:00, 22:00 daily"
echo ""
echo "Verify with:  crontab -l"
echo "Logs at:      $SCRIPT_DIR/cron.log"
echo "              $SCRIPT_DIR/updater.log"
echo ""
echo "To remove:    crontab -l | grep -v naukri_updater | crontab -"
