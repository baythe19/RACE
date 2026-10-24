#!/usr/bin/env bash
set -e

# RACE Environment Backup Utility
# This script bundles all 4 project .env files into:
# 1. A local backup tarball (race-env-backup.tar.gz)
# 2. A base64 string (scripts/env-backup.base64) for GitHub Codespace Secrets
# 3. An encrypted vault (.env.vault.enc) using AES-256 (optional/prompted)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$REPO_ROOT"

ENV_FILES=(
  "backend/.env"
  "customer application/.env"
  "mobile application/.env"
  "race-admin/apps/admin-web/.env"
)

echo "=== RACE Environment Backup ==="

MISSING=0
for f in "${ENV_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "⚠️ Warning: Missing $f"
    MISSING=$((MISSING + 1))
  else
    echo "✓ Found: $f"
  fi
done

if [ "$MISSING" -eq "${#ENV_FILES[@]}" ]; then
  echo "❌ Error: None of the .env files were found. Nothing to backup."
  exit 1
fi

TMP_TAR="$(mktemp /tmp/race_env_backup_XXXXXX.tar.gz)"
tar -czf "$TMP_TAR" "${ENV_FILES[@]}" 2>/dev/null || tar -czf "$TMP_TAR" $(for f in "${ENV_FILES[@]}"; do [ -f "$f" ] && echo "$f"; done)

# 1. Save local tarball
cp "$TMP_TAR" "$REPO_ROOT/race-env-backup.tar.gz"
echo "✓ Created local archive: race-env-backup.tar.gz"

# 2. Save base64 backup
base64 -w 0 "$TMP_TAR" > "$SCRIPT_DIR/env-backup.base64"
echo "✓ Created base64 backup: scripts/env-backup.base64"

# 3. Encrypted vault (AES-256)
if [ -n "$1" ] && [ "$1" == "--encrypt" ] || [ -n "$ENV_VAULT_PASSWORD" ]; then
  PASS="${ENV_VAULT_PASSWORD:-}"
  if [ -z "$PASS" ]; then
    read -rsp "Enter password to encrypt .env vault: " PASS
    echo ""
  fi
  openssl enc -aes-256-cbc -pbkdf2 -salt -in "$TMP_TAR" -out "$REPO_ROOT/.env.vault.enc" -pass pass:"$PASS"
  echo "✓ Created encrypted vault: .env.vault.enc (safe to commit to git!)"
fi

rm -f "$TMP_TAR"

echo ""
echo "================================================================="
echo "✅ BACKUP COMPLETED SUCCESSFULLY!"
echo "================================================================="
echo "To make .env files AUTOMATICALLY appear in new Codespaces:"
echo "1. Copy the base64 string from: scripts/env-backup.base64"
echo "2. Go to: https://github.com/settings/codespaces"
echo "3. Under 'Codespace secrets', click 'New secret':"
echo "   - Name: RACE_ENV_BACKUP"
echo "   - Value: <paste base64 string>"
echo "   - Repository access: Select 'RACE'"
echo "4. That's it! Any new Codespace will auto-restore all .env files."
echo "================================================================="
