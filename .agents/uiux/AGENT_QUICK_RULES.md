# RACE Agent Quick Rules

Use this page as the fast preflight before any UI redesign.

```text
1. Understand the user's task first.
2. Reuse the existing RACE shell and components.
3. Remove clutter before adding anything.
4. One screen = one primary objective.
5. One primary CTA.
6. Header is navigation + orientation, not decoration.
7. Bottom nav is only for top-level destinations.
8. Inputs must be keyboard-aware.
9. Collect only what is necessary now.
10. Prefill known data; let users edit it.
11. Optional data must be skippable and deferrable.
12. Every network action needs loading + error behavior.
13. Every meaningful list needs an empty state.
14. Every success needs an obvious next action.
15. Use image assets for context, not as a text container.
16. Never invent backend capability.
17. Never copy a debug overlay into production UI.
18. Keep typography, spacing, radius, icons and buttons consistent.
19. Use motion to explain transitions, not to decorate.
20. Make the result feel like a mobile service app, not a website.
```

If a proposed change breaks an existing pattern, document:

```text
CURRENT PATTERN
PROPOSED CHANGE
WHY
USER BENEFIT
IMPLEMENTATION IMPACT
```
