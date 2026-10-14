# RACE Vendor UI/UX Implementation Prompt

Use `MASTER_PROMPT.md` as the task prompt for your coding agent (GLM 5.3 Flash).

The `reference-images/` folder contains the three Vendor design boards:
1. Vendor Dashboard + Jobs + Assign Vehicle.
2. Vendor Vehicles list + Add Vehicle + Vehicle Details.
3. Vendor Drivers list + Add Driver + Documents.

Recommended agent workflow:
1. Make the full project/repository available to the agent.
2. Make the RACE Partner architecture/audit document and existing motion/design standards available if they are not already in the project.
3. Attach all three reference images or point the agent at this package's images.
4. Give the agent the full contents of `MASTER_PROMPT.md`.
5. Allow it to inspect first, then implement, test, and report actual results.

The prompt deliberately treats real code/API/auth rules as authoritative over visual mockup sample data. It directs the agent to reuse the existing Driver Jobs UI, preserve Driver behavior, and make Vendor flows genuinely connected rather than creating disconnected mock screens.
