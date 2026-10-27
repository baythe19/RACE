---
name: race-branch-guard
description: "always_on: Prevent commits to frozen branches"
activation: always_on
---

# Branch Guard

Before ANY commit or push:
1. Run `git branch --show-current`.
2. If the result is `main`, `release4Aug2026`, or `release/13July26` — **STOP**. Do not commit.
3. Switch to the active development branch (check `.agents/state/ACTIVE.md` for current branch name).
4. Only push the active development branch to origin.
