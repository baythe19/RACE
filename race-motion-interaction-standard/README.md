# RACE Motion & Interaction Standard

This package helps the coding agent apply consistent motion, touch feedback, screen transitions, mapping and GPS behavior across the RACE Partner mobile app.

- `RACE_MOTION_INTERACTION_STANDARD.md` — detailed reusable standard, driver job state machine, Expo-compatible library recommendations, map/GPS reliability, interaction patterns, performance and QA.
- `AGENT_IMPLEMENTATION_PROMPT.md` — copy-paste prompt for the coding agent before it audits/implements improvements.

## How to use

1. Add both files to your repository, for example under `docs/ui-ux/` or your existing RACE skill directory.
2. Add the standard to the agent's persistent context/skill instructions.
3. For each implementation task, paste `AGENT_IMPLEMENTATION_PROMPT.md` or instruct the agent to read it.
4. Have the agent inspect the real package lockfile and current implementation before changing dependencies.

**Important:** The current RACE documentation identifies Expo SDK 57 / React Native 0.86. The project lockfile and actual native build remain the final source of truth. `react-native-maps` and foreground `expo-location` are suitable Expo Go starting points; background location requires a development/production build and native permission/configuration.
