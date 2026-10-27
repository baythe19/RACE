---
name: race-typescript-quality
description: "glob:*.ts,*.tsx — TypeScript quality rules for RACE"
activation: glob
globs: ["**/*.ts", "**/*.tsx"]
---

# TypeScript Quality (RACE)

- Run `npm run lint` (`tsc --noEmit`) in the **touched app's folder** before claiming done.
- Match the version in that app's `package.json` — do not assume TypeScript versions are the same across surfaces.
- Backend: Express 5 types (`@types/express` ^5). Do not use Express 4 patterns (e.g., `next()` signature changed).
- Mobile: Expo 57, React Native 0.86. Use version-matched docs.
- Admin: React 19 + Vite. Check `race-admin/tsconfig.json` for jsx setting.
- Do not leave `any` types without a comment explaining why.
- Do not add `// @ts-ignore` without a comment and a ticket reference.
