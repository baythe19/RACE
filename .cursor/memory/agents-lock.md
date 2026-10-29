# Agent lock — who is editing what

Parallel agents in the **same worktree** will overwrite each other. Before editing, add a claim. When finished, delete your row.

If the surface you need is already claimed, **stop** and tell the user. Do not steal the lock.

True isolation (optional, user must ask): git worktrees — one branch/worktree per agent. Still update this file.

| Claimed | Surface | Task | Session note |
|---------|---------|------|--------------|
| Agent | customer vehicle QR | download, detail UX, expiry fix, browser test | now |
| Auto | customer maps UI | unify map chrome across picker, live trip, driver pickup | now |