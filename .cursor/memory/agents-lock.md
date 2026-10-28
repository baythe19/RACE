# Agent lock — who is editing what

Parallel agents in the **same worktree** will overwrite each other. Before editing, add a claim. When finished, delete your row.

If the surface you need is already claimed, **stop** and tell the user. Do not steal the lock.

True isolation (optional, user must ask): git worktrees — one branch/worktree per agent. Still update this file.

| Claimed | Surface | Task | Session note |
|---------|---------|------|--------------|
| Buffy | Backend + Customer app | Continue customer audit fixes; D-04 credential endpoints and screens | 2026-10-28, branch v7.0.0-major-update |
