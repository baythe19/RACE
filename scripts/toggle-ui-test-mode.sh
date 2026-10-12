#!/usr/bin/env bash
# ==============================================================================
# RACE Mobile App - UI Test Permissive Mode Toggle Script
# ==============================================================================
# Controls whether validation and input constraints are bypassed for rapid
# UI/UX testing across all Driver and Vendor screens without entering data.
#
# Usage:
#   ./scripts/toggle-ui-test-mode.sh on      # Enable permissive UI test mode (no inputs required)
#   ./scripts/toggle-ui-test-mode.sh off     # Disable permissive mode (enforce strict validations)
#   ./scripts/toggle-ui-test-mode.sh status  # Show current status
#   ./scripts/toggle-ui-test-mode.sh         # Toggle between on and off
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
ENV_FILE="$SCRIPT_DIR/mobile application/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️ .env file not found at $ENV_FILE. Creating default..."
  touch "$ENV_FILE"
fi

current_val=$(grep "^EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE=" "$ENV_FILE" | cut -d '=' -f2 || echo "")

case "$1" in
  on|ON|true|TRUE|1)
    target="true"
    ;;
  off|OFF|false|FALSE|0)
    target="false"
    ;;
  status|STATUS)
    if [ "$current_val" = "false" ]; then
      echo "🔒 Permissive UI Test Mode: OFF (Strict validations and required fields active)"
    else
      echo "⚡ Permissive UI Test Mode: ON (Forms auto-fill defaults, 0 inputs required, all screens accessible)"
    fi
    exit 0
    ;;
  "")
    if [ "$current_val" = "false" ]; then
      target="true"
    else
      target="false"
    fi
    ;;
  *)
    echo "Usage: $0 [on|off|status]"
    exit 1
    ;;
esac

# Update or insert EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE
if grep -q "^EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE=" "$ENV_FILE"; then
  sed -i "s/^EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE=.*/EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE=$target/" "$ENV_FILE"
else
  echo "EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE=$target" >> "$ENV_FILE"
fi

if [ "$target" = "true" ]; then
  echo "=================================================================="
  echo "⚡ UI TEST PERMISSIVE MODE: [ ENABLED / ON ]"
  echo "=================================================================="
  echo "✔ All Driver & Vendor forms auto-fill sensible mock data."
  echo "✔ Tap 'Continue', 'Next', or 'Verify' on ANY screen to advance instantly."
  echo "✔ No typing or input entry required."
  echo "✔ Floating '⚡ UI QA' badge in the app provides 1-tap jump to all ~30 screens."
  echo "=================================================================="
else
  echo "=================================================================="
  echo "🔒 UI TEST PERMISSIVE MODE: [ DISABLED / OFF ]"
  echo "=================================================================="
  echo "✔ Production/strict validations restored for all inputs."
  echo "=================================================================="
fi
