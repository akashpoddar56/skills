#!/usr/bin/env bash
# Wrapper: pulls latest state from git, runs the updater, then pushes the new state back.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_FILE="$SCRIPT_DIR/state.json"

# Pull latest state.json from remote
cd "$REPO_ROOT"
git fetch origin claude/wonderful-carson-t0wotl 2>&1 || true
git checkout origin/claude/wonderful-carson-t0wotl -- naukri-profile-updater/state.json 2>/dev/null || true

# Run the updater
python3 "$SCRIPT_DIR/naukri_updater.py"

# Commit and push the updated state.json
if [[ -f "$STATE_FILE" ]]; then
    git add naukri-profile-updater/state.json
    if git diff --cached --quiet; then
        echo "State unchanged — nothing to commit."
    else
        git commit -m "chore: update naukri profile state [skip ci]"
        git push -u origin claude/wonderful-carson-t0wotl
    fi
fi
