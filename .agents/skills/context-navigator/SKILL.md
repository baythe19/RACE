---
name: context-navigator
description: "RACE project orientation and just-in-time file discovery. Load at cold-start, when asked about project structure, or when you need to find which file to edit."
---

# Context Navigator

## Cold-Start Protocol (new session, fresh context)

```
1. Read .agents/state/ACTIVE.md          → current state, branch, gaps
2. Read .agents/state/PROJECT_INDEX.md   → only if orientation needed
3. Run: git status && git diff --stat HEAD~1
4. Identify the task surface (backend / customer / partner / admin)
5. Load ONLY the files relevant to the task
```

Do not scan the entire repo. Use this navigator to find what you need.

## Finding Files by Task

### "Fix a bug in booking flow"
```
1. Which surface? Customer app or Partner app?
2. grep -r "TowingBooking\|DriverBooking" backend/src/models/src/
3. Check backend/src/STRUCTURE.md for controller/service path
4. Read only the relevant controller + service file
```

### "Add a field to a model"
```
1. backend/src/models/src/<model>.ts — add field
2. backend/src/services/src/<domain>.ts — update business logic
3. Relevant controller if validation changes
4. Run: npm run lint in backend/
```

### "Fix something in admin web"
```
1. race-admin/apps/admin-web/src/ — find the page/component
2. race-admin/packages/api/ — find the API call if needed
3. State: Zustand store. Data: TanStack Query hook.
4. Run: npm run dev in race-admin/ to verify
```

### "Fix something in mobile"
```
1. Identify: customer application/ or mobile application/
2. Entry: App.tsx → src/navigation/ → find the screen
3. API calls: src/api/
4. Check EXPO_PUBLIC_API_URL for local dev
```

### "Add an API endpoint"
```
1. backend/src/controller/src/ — add route + controller
2. backend/src/services/src/ — add business logic
3. backend/src/models/src/ — add model field if needed
4. Check: does a similar endpoint already exist? grep first.
```

## Symbol Search Commands

```bash
# Find where a symbol is defined
grep -r "SymbolName" backend/src/ --include="*.ts" -l

# Find a route
grep -r "'/api/v1/route'" backend/src/controller/src/

# Find which screens import a navigator
grep -r "MainNavigator" "customer application/src/"

# Find all booking-related files
find backend/src -name "*booking*" -o -name "*Booking*"
```

## Context Read Ledger

Before reading a file, ask:
1. Was it already read this session? → Reuse that knowledge.
2. Is it relevant to the current task? → Skip if not.
3. Is only a section needed? → Use line ranges.
4. Is the file large? → Read STRUCTURE.md or similar summary first.

## File Size Reference

| File | Size | Read strategy |
|------|------|---------------|
| `backend/src/STRUCTURE.md` | 2KB | Full read fine |
| `backend/src/index.ts` | ~1.4KB | Full read fine |
| `docs/RACE_REMAINING_WORK_AND_GAPS.md` | 24KB | Section only |
| `docs/SYSTEM_AUDIT_AND_TEST_CASES.md` | 16KB | Section only |
| `docs/client/CLIENT_DOC_VS_BUILD.md` | 22KB | Section only |
| `docs/client/CLIENT_FEATURES.md` | 10KB | Section only |
