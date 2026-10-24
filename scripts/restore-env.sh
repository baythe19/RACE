#!/usr/bin/env bash
set -e

# RACE Environment Restore Utility
# Restores backend, customer mobile, partner mobile, and admin web .env files.
# Sources checked in order:
# 1. Environment variable $RACE_ENV_BACKUP (from GitHub Codespaces Secret)
# 2. Encrypted vault .env.vault.enc (using $ENV_VAULT_PASSWORD or interactive password)
# 3. scripts/env-backup.base64
# 4. race-env-backup.tar.gz

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$REPO_ROOT"

FORCE=false
if [ "$1" == "--force" ] || [ "$2" == "--force" ]; then
  FORCE=true
fi

ENV_FILES=(
  "backend/.env"
  "customer application/.env"
  "mobile application/.env"
  "race-admin/apps/admin-web/.env"
)

all_exist=true
for f in "${ENV_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    all_exist=false
    break
  fi
done

if [ "$all_exist" = true ] && [ "$FORCE" = false ]; then
  echo "✓ All 4 .env files are already present. (Use --force to overwrite)"
  exit 0
fi

echo "=== Restoring RACE Environment Files ==="

RESTORED=false

# Source 1: GitHub Codespace Secret (Environment Variable)
if [ -n "$RACE_ENV_BACKUP" ]; then
  echo "Found RACE_ENV_BACKUP environment variable (GitHub Codespace Secret)."
  echo "$RACE_ENV_BACKUP" | tr -d '\r\n ' | base64 -d | tar -xzf - -C "$REPO_ROOT"
  RESTORED=true
fi

# Source 2: Encrypted Vault (.env.vault.enc)
if [ "$RESTORED" = false ] && [ -f "$REPO_ROOT/.env.vault.enc" ]; then
  echo "Found encrypted vault: .env.vault.enc"
  PASS="${ENV_VAULT_PASSWORD:-}"
  if [ -z "$PASS" ] && [ -t 0 ]; then
    read -rsp "Enter decryption password for .env vault: " PASS
    echo ""
  fi

  if [ -n "$PASS" ]; then
    if openssl enc -d -aes-256-cbc -pbkdf2 -in "$REPO_ROOT/.env.vault.enc" -pass pass:"$PASS" 2>/dev/null | tar -xzf - -C "$REPO_ROOT" 2>/dev/null; then
      RESTORED=true
      echo "✓ Successfully decrypted and restored from .env.vault.enc"
    else
      echo "❌ Decryption failed (incorrect password or corrupted vault)."
    fi
  fi
fi

# Source 3: scripts/env-backup.base64
if [ "$RESTORED" = false ] && [ -f "$SCRIPT_DIR/env-backup.base64" ]; then
  echo "Restoring from scripts/env-backup.base64..."
  base64 -d "$SCRIPT_DIR/env-backup.base64" | tar -xzf - -C "$REPO_ROOT"
  RESTORED=true
fi

# Source 4: Local tarball
if [ "$RESTORED" = false ] && [ -f "$REPO_ROOT/race-env-backup.tar.gz" ]; then
  echo "Restoring from race-env-backup.tar.gz..."
  tar -xzf "$REPO_ROOT/race-env-backup.tar.gz" -C "$REPO_ROOT"
  RESTORED=true
fi

echo ""
echo "=== Verification ==="
ALL_OK=true
for f in "${ENV_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "  [OK] $f"
  else
    echo "  [MISSING] $f"
    ALL_OK=false
  fi
done

if [ "$ALL_OK" = true ]; then
  echo ""
  echo "✅ All 4 .env files are restored and ready!"
else
  echo ""
  echo "⚠️ Some .env files could not be restored."
  echo "If this is a new Codespace, make sure you set the RACE_ENV_BACKUP Codespace secret in GitHub Settings."
fi
