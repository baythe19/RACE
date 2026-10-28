# Agent lock — who is editing what

Parallel agents in the **same worktree** will overwrite each other. Before editing, add a claim. When finished, delete your row.

If the surface you need is already claimed, **stop** and tell the user. Do not steal the lock.

True isolation (optional, user must ask): git worktrees — one branch/worktree per agent. Still update this file.

| Claimed | Surface | Task | Session note |
|---------|---------|------|--------------|
| 2026-10-29 GLM | customer towing booking flow (screens/booking/towing + TowingBookingLayout + navigator + constants) | 4-step stepper redesign, combine steps, hide advance-pay UI | branch v8.0.0---custumer-app |
|---------|---------|------|--------------|
| 2026-10-29 agent | customer-app DatePicker/GenderDropdown/BackArrow/premium-pill fixes | DOB keyboard bug, dropdowns, header arrows | session: ux fixes |
| 2026-10-29 Auto | customer (not towing-flow / not DatePicker locks) | double-tap API guards + skeleton loaders throughout | session: api-hygiene-skeletons |
