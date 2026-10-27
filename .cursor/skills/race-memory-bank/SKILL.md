---
name: race-memory-bank
description: Read and update RACE agent memory (.cursor/memory). Use at session start, after a milestone, when another agent may be working, or when the user mentions memory, lock, or what was already done.
---

# RACE memory bank

## Read order (new session)

1. `.cursor/memory/activeContext.md`
2. `.cursor/memory/agents-lock.md`
3. `.cursor/memory/learnings.md`
4. `.cursor/memory/progress.md` if planning or resuming

## Lock (parallel agents)

Before editing, set a row in `agents-lock.md`:

`| yes | customer | OTP login fix | this chat |`

Surfaces: `customer` | `partner` | `admin` | `backend` | `docs` | `memory`.

If claimed by someone else: do not edit that surface; report the lock.

Clear the row when finished.

Same worktree + two writers = overwrite. Worktrees (separate branches) only if the user asks.

## Write rules

- `activeContext.md` — rewrite the top “current focus / last done / next”. Keep under ~40 lines.
- `progress.md` — checkboxes, newest work at top of Done.
- `decisions.md` — append a dated block; never silently rewrite old blocks.
- `learnings.md` — one bullet per trap.
- No dump of diffs or API keys.

## Do not

- Treat Cursor Settings → Memories as team memory (not in git).
- Duplicate `docs/client/` into memory. Link it.
