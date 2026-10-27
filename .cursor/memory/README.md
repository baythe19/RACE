# Agent memory (read this first)

Git-tracked context for Cursor agents. Chat history is **not** shared across sessions or parallel agents. These files are.

| File | When to read | When to write |
|------|----------------|---------------|
| `activeContext.md` | Start of every task | End of every task |
| `agents-lock.md` | Before editing code | Claim a surface; clear when done |
| `progress.md` | Resuming / planning | After a milestone |
| `decisions.md` | Before changing architecture | When a decision is made |
| `learnings.md` | Before touching a risky area | When we hit a trap |
| `projectbrief.md` | New session / new agent | Rarely (scope change only) |

Rules: keep entries short and dated. Newest first. Do not paste whole files or secrets. If memory and code disagree, **code wins** — then fix the memory.
