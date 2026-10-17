# Agent lock — who is editing what

Parallel agents in the **same worktree** will overwrite each other. Before editing, add a claim. When finished, delete your row.

If the surface you need is already claimed, **stop** and tell the user. Do not steal the lock.

True isolation (optional, user must ask): git worktrees — one branch/worktree per agent. Still update this file.

| Claimed | Surface | Task | Session note |
|---------|---------|------|----------------|
| codex-cross-app-logic-audit | backend | Reconcile cross-app booking and availability state | 2026-10-17 |
| codex-cross-app-audit-ledger | docs | Maintain the cross-app logic audit gates and findings | 2026-10-17 |
| codex-partner-navigation | partner | Parent-child routes and deterministic back destinations | 2026-10-17 |




Surfaces: `customer` | `partner` | `admin` | `backend` | `docs` | `memory`

Keep at most **one claim per surface**.
