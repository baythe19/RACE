---
name: feature-implementation
description: "RACE feature implementation workflow. Load for new features, non-trivial changes, or multi-file edits."
---

# Feature Implementation

## Pre-Implementation Checklist

- [ ] Read `.agents/state/ACTIVE.md` — is there a lock conflict?
- [ ] Claim surface in `.cursor/memory/agents-lock.md`
- [ ] Search: does this feature already exist (partially)? `grep -r "feature-keyword" src/`
- [ ] Identify all files to change (existing first, new last)
- [ ] Write a 3-5 line plan before any code

## Implementation Pattern

```
1. Plan: goal, non-goals, files to touch, risks, verification command
2. For large tasks: load .cursor/skills/unlazy/SKILL.md and write GATES.md first
3. For unclear product direction: load .cursor/skills/brainstorming/SKILL.md first
4. Implement smallest change that matches existing style
5. Verify: run the lint/typecheck command for the touched surface
6. Update .agents/state/ACTIVE.md
```

## Per-Surface Patterns

### Backend new endpoint
```
controller/src/<domain>.ts    → add route + controller function
services/src/<domain>.ts      → add business logic method
models/src/<model>.ts         → add field if schema changes
middleware/src/               → add middleware if auth scope changes
```

### Admin new page
```
apps/admin-web/src/pages/     → new page component
apps/admin-web/src/App.tsx    → add route
packages/api/src/             → add API call function
packages/types/src/           → add TypeScript types
```

### Mobile new screen
```
src/screens/<domain>/         → new screen component
src/navigation/               → add to navigator (careful — see ADR-007)
src/api/                      → add API call if needed
src/hooks/                    → add custom hook if reusable
```

## Verification Commands by Surface

```bash
# Backend
cd backend && npm run lint

# Admin
cd race-admin && npm run dev  # check for build errors in terminal

# Customer app
cd "customer application" && npx tsc --noEmit

# Partner app
cd "mobile application" && npx tsc --noEmit
```

## After Implementation

1. Update `.agents/state/ACTIVE.md` — what changed, what was verified.
2. Append to `.cursor/memory/decisions.md` if a durable decision was made.
3. Clear surface lock in `.cursor/memory/agents-lock.md`.
4. Load `.cursor/skills/verification-before-completion/SKILL.md` before claiming done.
