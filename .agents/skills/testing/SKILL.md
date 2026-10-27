---
name: testing
description: "RACE testing and verification workflow. Load when running tests, writing audit scripts, or verifying a fix."
---

# Testing & Verification

## Current Test Infrastructure

| Status | Location |
|--------|---------|
| ✅ Comprehensive audit script (40 cases) | `backend/src/scripts/comprehensive-audit.ts` |
| ✅ Seed scripts | `backend/src/database/src/seed*.ts` |
| ❌ Automated unit/integration tests | `backend/__tests__/` — empty |
| ✅ TypeScript typecheck | `npm run lint` in each app |

There is no Jest/Vitest test suite. Do not mandate TDD. See ADR-008.

## Verification Commands

```bash
# Full backend audit (40 cases)
cd backend
npm run seed:fresh   # reset + seed mock data
tsx src/scripts/comprehensive-audit.ts

# TypeScript check — backend
cd backend && npm run lint

# TypeScript check — customer app
cd "customer application" && npx tsc --noEmit

# TypeScript check — partner app  
cd "mobile application" && npx tsc --noEmit

# TypeScript check — admin
cd race-admin && npx tsc --noEmit
```

## Reading Audit Output

The comprehensive audit outputs pass/fail per case. Look for:
- FAIL lines and their assertion message
- Exit code (0 = all pass, non-zero = failures)
- Do NOT dump the full 40-case output — report only the failure cases.

## Adding Test Cases

If asked to add a test: extend `backend/src/scripts/comprehensive-audit.ts`.
Follow the existing case structure in that file.
Each case: setup → call endpoint → assert response → teardown (or use mock data).

## Mock Data

See `docs/MOCK_TESTING_PLAYBOOK.md` for the full playbook.
Quick reset: `npm run seed:fresh` in `backend/`.

## Verification Before Claiming Done

Always run at least ONE verification command before claiming the task is complete.
For major changes: load `.cursor/skills/verification-before-completion/SKILL.md`.
State what could not be verified (e.g., Expo UI flow requires manual testing).
