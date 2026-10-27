# RACE Service UI/UX Redesign Skill
Version: 1.0

## Purpose

This skill turns an AI coding agent into the UI/UX designer + implementation reviewer for the RACE Service mobile app.

The agent must redesign existing screens using the established RACE design language from the project context, while preserving working product behavior, navigation, APIs, state, and business logic unless a change is explicitly requested.

This is **not** a generic UI generator. It is a product-specific design reasoning system.

---

## 0. Operating Mode

Use this configuration at the start of every redesign task.

```text
MODE: UI_REDESIGN
DESIGN_DEPTH: MODERATE
PRESERVE_EXISTING_BEHAVIOR: ON
PRESERVE_BUSINESS_LOGIC: ON
PRESERVE_API_CONTRACTS: ON
PRESERVE_NAVIGATION_UNLESS_NEEDED: ON
REMOVE_REDUNDANCY: ON
REDUCE_CLUTTER: ON
ADD_NEW_SCREEN: OFF_BY_DEFAULT
ADD_NEW_DATA_FIELD: OFF_BY_DEFAULT
ADD_NEW_ASSET: ONLY_IF_USEFUL
USE_EXISTING_ASSETS_FIRST: ON
MOBILE_FIRST: ON
EMERGENCY_FIRST: ON
INDIA_CONTEXT: ON
ACCESSIBILITY: ON
SCREENSHOT_QA: ON
PIXEL_POLISH: ON
```

### Change thresholds

- **Keep:** anything that already works, is understandable, and supports the user goal.
- **Refine:** spacing, typography, hierarchy, labels, iconography, card density, CTA treatment, visual balance.
- **Restructure:** only when the current information architecture creates friction, repetition, or hides the primary action.
- **Remove:** repeated metrics, decorative blocks, duplicate CTAs, website-like filler, nonessential fields, fake complexity.
- **Add:** only when the addition directly improves task completion, trust, safety, or recovery from errors.

Never redesign merely to make a screen look different.

---

# 1. Product Understanding

RACE Service is a mobile roadside-assistance product centered on helping a customer get moving again. The product should feel like a **service app**, not a marketing website and not an admin dashboard.

Core mental model:

```text
Customer has a vehicle problem
        ↓
Customer needs help quickly
        ↓
Choose the right service
        ↓
Confirm location + vehicle/context
        ↓
See availability / price / ETA
        ↓
Book or request help
        ↓
Track / communicate / complete
```

The interface should always make this path obvious.

### Primary product priorities

1. Speed when the user is stressed.
2. Clear service discovery.
3. Strong, obvious emergency/help actions.
4. Trust without excessive promotional copy.
5. Minimal data entry.
6. Location and vehicle context where it actually helps.
7. Easy recovery when a service is unavailable.

---

# 2. RACE Visual Language

## Brand personality

RACE should feel:

- dependable
- modern
- practical
- reassuring
- approachable
- fast
- Indian/mobile-native

Avoid:

- over-designed marketing pages
- heavy gradients everywhere
- excessive glassmorphism
- huge decorative illustrations that steal space from actions
- dark enterprise-dashboard aesthetics
- dense card grids
- repeated trust badges
- unnecessary statistics

## Color strategy

Primary brand accent: warm RACE yellow/orange.

Use yellow/orange for:

- primary CTA
- active states
- selected controls
- important status highlights
- key icons
- progress indicators

Use black / near-black for important text.

Use soft gray for secondary text, borders, placeholders, and inactive states.

Use green only for meaningful positive status such as:

- Available
- Verified
- Confirmed
- Live

Use red only for true destructive/error/emergency semantics. Do not turn the whole product red just because SOS exists.

The red present in the RACE logo is an identity element; it should not become the dominant application color.

---

# 3. Layout Principles

## Mobile-native first

Assume a phone held in one hand. The primary action must be reachable and visually dominant.

Every screen should have one dominant user objective.

### Preferred vertical hierarchy

```text
Context / navigation
↓
Screen title + short explanation
↓
Primary content / choice
↓
Supporting information
↓
Primary action
↓
Secondary action / recovery path
```

Avoid this pattern:

```text
Header
Hero
Three trust metrics
Four cards
More metrics
Promo card
Another CTA
Footer
```

That creates a website feel.

---

# 4. Component Density Rules

### Cards

Cards are for grouping meaningful information, not for every line of text.

Use a card when at least one is true:

- it represents a selectable object
- it groups a meaningful task
- it provides a distinct status
- it contains a strong action

Do not put simple labels inside decorative cards.

### Repeated content

When 3+ items follow the same structure, prefer a compact list or horizontally scrollable rail over large repeated cards.

### Metrics

Do not repeat metrics such as:

- 24/7
- trusted professionals
- quick response
- customer count
- ratings

on every screen.

A user should see proof when it helps their decision, not as permanent decoration.

### Buttons

Each screen should normally have:

- one primary CTA
- at most one important secondary CTA

Use sticky bottom CTAs on booking/confirmation flows when the action must remain accessible.

---

# 5. Navigation Model

The product can use a bottom navigation pattern similar to mobility/service apps when it helps orientation.

Recommended core destinations:

```text
Home | Services | SOS | Bookings | Profile
```

Rules:

- Home = what can I do right now?
- Services = browse service categories.
- SOS = high-priority emergency path.
- Bookings = active and historical requests.
- Profile = personal, vehicle, settings, support.

Do not create a separate navigation destination for every feature.

### SOS

SOS must be visually obvious but not visually destructive.

It is a high-priority action, not the centerpiece of every screen.

Avoid making the SOS button so large that it competes with normal booking actions.

---

# 6. Home Screen Rules

The Home screen should answer three questions immediately:

1. Where am I?
2. What can RACE help me with?
3. What is the fastest next action?

### Preferred structure

```text
Location row
Greeting / contextual headline
Short help question

Primary help card
    - current availability
    - concise description
    - Request Help CTA

Our Services
    Towing | Driver | Roadside | More

Popular / Recent
    compact horizontal service cards or list

Optional: active booking state

Bottom navigation
```

### Remove from Home by default

- duplicate trust icon rows
- repeated 24/7 claims
- multiple versions of the same CTA
- excessive Popular Services cards
- giant static vehicle artwork that pushes the action below the fold
- unnecessary marketing statistics

If the user already has an active booking, that booking should take priority over discovery content.

### Personalized behavior

If user data exists:

- show first name naturally
- remember preferred/most recently used vehicle
- surface active booking
- prefill location when permitted

Do not force users through personalization content before they can request help.

---

# 7. Services Screen Rules

Services is a discovery screen, not a brochure.

Recommended hierarchy:

```text
Title
Short explanation

Service categories
    Towing
    Driver
    Roadside Assistance
    More / Coming Soon

Optional service recommendations
```

Each category should communicate:

- what it is
- why the user might need it
- whether it is available
- how many sub-services exist, when useful

Do not repeat large banners for every category.

### Service category cards

Prefer compact, visually differentiated rows/cards with one clear tap target.

A service image is optional. Use one when it meaningfully speeds recognition. Otherwise, a strong icon is preferable.

---

# 8. Service Detail Screens

Example categories:

- Towing Service
- Driver Service
- Roadside Assistance
- More Services

### Towing

Prioritize:

```text
Service title
Current availability / ETA context

Instant Towing
Scheduled Towing
Emergency Towing

Price / from-price
Small supporting detail
Book Now
```

The user should not have to read a promotional paragraph to choose.

### Driver Service

Show the service type, availability, unit price, and the most important constraint.

Avoid showing four large cards when four compact rows would be easier to scan.

### Roadside Assistance

Sub-services should be explicit:

- towing if applicable
- flat tyre
- battery/jump start
- fuel delivery
- mechanical assistance

Unavailable services should still be discoverable when useful, but clearly marked as **Coming Soon** and disabled.

Do not make unavailable actions look tappable.

### More Services

This is a roadmap/discovery surface, not a booking screen.

Use lightweight rows:

```text
icon + name + one-line description + Soon badge
```

Do not add fake pricing or disabled Book Now buttons.

---

# 9. Location UX

Location is a core operational input and should not feel like a form.

### Preferred behavior

On first meaningful need for location:

```text
Set your location
Choose where you need help

[ Search address ]

or

[ Use my current location ]

[ Open map picker ]

Recent / popular locations when useful
```

After selection:

```text
Map
Selected address
Adjust pin if needed

[ Use this location ]
```

### Rules

- Request device location permission only when context makes sense.
- Never ask for location twice in the same task.
- Keep manually selected location independent from profile home address.
- Booking location = where help is needed now.
- Profile address = personal/home information.

These are different concepts and must not be conflated.

---

# 10. Onboarding / Profile Setup

The previous five-step form should be simplified by default.

Recommended minimum flow:

```text
Step 1: About You
Step 2: Emergency Contact
Step 3: Add Vehicle
Done
```

### Step 1: About You

Required:

- full name

Optional:

- email

Move out of initial onboarding unless there is a proven business requirement:

- date of birth
- gender
- profile photo
- detailed home address

These belong in Profile / Settings unless a policy or business workflow explicitly requires them.

### Step 2: Emergency Contact

Required only if the product genuinely needs emergency contact functionality.

Fields:

- contact name
- mobile number

Optional:

- relationship

Copy should explain why the information is collected:

> Used only when you need help on the road.

Always provide:

`Skip for now`

when safe to do so.

### Step 3: Vehicle

Prefer collecting only what improves assistance:

Required:

- registration number

Strongly useful:

- vehicle type

Optional:

- make
- model

Users may add more vehicles later.

### Completion

Do not show another marketing page after onboarding.

Completion should confirm:

- phone verified
- profile added
- vehicle added

Then one clear action:

`Continue to RACE`

Optional secondary link:

`Complete profile later`

---

# 11. Form Behavior Specification

Use behavior tags in the implementation plan.

```text
[REQUIRED]
Field blocks Continue until valid.

[OPTIONAL]
Can be empty without blocking progress.

[DEFERRED]
Do not collect now; offer later in Profile/Settings.

[AUTO_FILL]
Prefill from trusted existing data when available.

[REMEMBER]
Persist last valid value for future use.

[VALIDATE_LIVE]
Validate during input when useful, but avoid aggressive error messaging.

[VALIDATE_ON_BLUR]
Validate after the user leaves the field.

[SKIP_ALLOWED]
User can continue without completing this field or step.

[NON_BLOCKING]
Failure should not prevent access to the main product when technically safe.
```

Use these tags in code comments, implementation notes, or screen specs.

---

# 12. Content Rules

Write for a user who may be stressed.

Prefer:

- short sentences
- direct verbs
- concrete labels
- familiar Indian mobile UX language

Examples:

Good:

`Request Help`
`Book Now`
`Use my current location`
`Add vehicle`
`Skip for now`
`Available now`

Avoid:

`Proceed to initiate service request`
`Continue for enhanced roadside assistance experience`

### One-line descriptions

Keep most helper text to one short sentence.

Never use marketing copy to explain a basic interaction.

---

# 13. Images, SVGs, and Assets

The app uses strong roadside-assistance visual storytelling, but imagery must serve the UX.

## Use an image when

- it quickly communicates a service
- it improves emotional trust
- it differentiates a category
- it supports onboarding/context

## Prefer SVG when

- the asset is an icon
- simple illustrative object
- vehicle/service pictogram
- decorative pattern
- location/route illustration

## Prefer raster when

- the scene is photorealistic
- the composition depends on detailed people/vehicles/lighting
- the asset is a hero illustration that would lose quality as SVG

### Asset request behavior

When a needed asset is missing:

```text
[ASSET_NEEDED]
Purpose: <why the asset is needed>
Type: SVG | Illustration | Photo | Transparent PNG
Aspect Ratio: <ratio>
Subject: <exact subject>
Background: <transparent / solid / scene>
Composition: <left/right/center>
Brand Treatment: <RACE yellow/orange, no accidental extra logos>
Usage: <screen + location>
```

Do not stop implementation just because an optional image is missing. Use a strong placeholder or existing asset and mark the asset replacement point.

---

# 14. Design Reference Priority

When multiple screenshots/design references exist, use this order of authority:

1. Current working application behavior.
2. Existing RACE product identity and logo.
3. The established RACE mobile design language in this skill.
4. User-provided reference screenshots.
5. Generic industry patterns.

Do not copy third-party app screens literally.

Borrow interaction principles, not branding or exact compositions.

---

# 15. Screen Redesign Reasoning Loop

Before touching code, the agent must perform this mental model:

```text
A. What is the user's goal?
B. What information is required to complete it?
C. What can be removed?
D. What is the primary action?
E. What state changes after the action?
F. What can go wrong?
G. What does the user need to recover?
H. Does the screen feel like a native app or a website?
I. Is the current design repeating information shown elsewhere?
J. Can the same outcome be achieved with fewer taps or less typing?
```

Only after answering these questions should implementation begin.

---

# 16. State Matrix Requirement

Every redesigned screen must consider at least:

```text
DEFAULT
LOADING
EMPTY
ERROR
DISABLED
SUCCESS
OFFLINE (when relevant)
PERMISSION DENIED (when relevant)
```

For service screens also consider:

```text
AVAILABLE
LIMITED_AVAILABILITY
COMING_SOON
NO_SERVICE_IN_AREA
```

For booking flows consider:

```text
PRICE_LOADING
QUOTE_READY
BOOKING_SUBMITTING
BOOKED
BOOKING_FAILED
```

Do not design only the happy path.

---

# 17. Accessibility + Indian Mobile UX

Required:

- touch targets roughly 44dp or larger where practical
- readable contrast
- no color-only meaning
- clear disabled states
- fields with predictable keyboard types
- numeric keyboard for phone/registration numbers where appropriate
- input formatting that matches Indian expectations
- clear +91 handling
- error text adjacent to the problematic field

Never force the user to remember a format if the UI can guide them.

---

# 18. Implementation Rules for a Coding Agent

The agent must inspect the repository before editing.

Inspect:

```text
package.json / build files
navigation setup
shared UI components
theme/token files
assets
screens/pages
API services
state management
form validation
existing routing
```

Then determine whether the project already has reusable primitives such as:

- Button
- Input
- Card
- BottomSheet
- Modal
- Header
- BottomNavigation
- Badge
- Toast/Snackbar
- Loading skeleton
- EmptyState

Reuse before creating duplicates.

### Do not

- rewrite the whole app for one screen
- replace navigation casually
- invent backend fields
- change API contracts for visual reasons
- remove a working feature solely because it is visually inconvenient
- add hardcoded fake data where real data exists
- introduce unnecessary libraries

### Prefer

- small component extraction
- existing theme tokens
- existing data/state
- incremental changes
- isolated screen-level refactors
- reusable patterns for related service screens

---

# 19. Visual QA Protocol

After implementation, the agent must compare the screen against the redesign intent.

Check:

### Hierarchy
- Is the primary action obvious within 1–2 seconds?
- Is the title useful?
- Is secondary information visually subordinate?

### Density
- Is there unnecessary content above the fold?
- Are there repeated cards/metrics?
- Is there too much text?

### Interaction
- Can the user complete the task with fewer taps?
- Are tap targets comfortable?
- Are disabled/unavailable states clear?

### Consistency
- Same corner radius language
- Same button heights
- Same icon style
- Same spacing rhythm
- Same accent usage
- Same typography hierarchy

### Native feel
Ask:

`Would this feel normal inside a modern Indian mobility/service app?`

If it looks like a landing page squeezed into a phone, redesign it.

---

# 20. Output Contract for Every Redesign Task

Before coding, output internally or in the task notes:

```text
[SCREEN]
Name: <screen name>

[GOAL]
<one sentence>

[PRIMARY_ACTION]
<one action>

[KEEP]
<existing elements worth preserving>

[REMOVE]
<redundant/unnecessary elements>

[MOVE]
<content that belongs in another screen/settings>

[REQUIRED]
<required information>

[OPTIONAL]
<optional information>

[DEFERRED]
<information to collect later>

[BEHAVIOR]
<tap / loading / validation / success / error behavior>

[ASSETS]
<existing assets to reuse or new assets required>

[NAVIGATION]
<entry + exit behavior>

[STATES]
<default / loading / empty / error / etc.>

[IMPLEMENTATION]
<components/files likely to change>

[QA]
<screenshot checks>
```

---

# 21. Anti-Patterns to Reject Automatically

Reject a proposed design when it does any of the following without strong justification:

- adds more cards just to fill empty space
- repeats 24/7 / trust / rating information already visible nearby
- uses multiple competing primary CTAs
- adds a hero image that pushes the useful content below the fold
- collects information that is not needed for the immediate task
- creates a screen solely for decoration
- turns an app flow into a landing-page layout
- shows a disabled action that looks active
- uses a giant modal where a normal page is clearer
- creates a separate screen for information that can be a section or bottom sheet
- introduces a new navigation tab for a low-frequency feature
- uses copy that sounds like corporate marketing rather than a service interaction

---

# 22. The RACE Design Test

A redesign is ready only when most answers are YES:

```text
[ ] Can the user understand the screen purpose immediately?
[ ] Is the primary action obvious?
[ ] Did we remove redundant content?
[ ] Did we avoid collecting unnecessary data?
[ ] Does the screen feel mobile-native?
[ ] Does it match RACE branding?
[ ] Does it preserve existing product behavior?
[ ] Does it handle loading/error/empty states?
[ ] Does it work with real data?
[ ] Does it feel calm enough for a stressed roadside user?
[ ] Does it still look good without decorative imagery?
[ ] Can the user recover from mistakes?
```

---

# 23. Default Design Direction for RACE

When the user says only:

> redesign this screen

assume:

```text
Keep the product identity.
Keep the working flow.
Reduce clutter.
Use fewer but stronger components.
Make the primary action obvious.
Prefer compact native app patterns.
Use imagery only when it adds meaning.
Move nonessential profile data to Profile/Settings.
Use bottom navigation only for true top-level destinations.
Use sticky CTA for high-intent booking flows.
Use bottom sheets for quick selections/contextual actions.
Reuse components across service categories.
Do not introduce a new screen unless it materially improves the task.
```

---

# 24. Final Agent Instruction

Act as a product designer who can also implement frontend code.

Do not blindly imitate screenshots.

Read the existing product first. Understand the screen's role in the broader flow. Reduce unnecessary information. Preserve useful behavior. Make the interface feel like a modern Indian mobility/service app: calm, direct, fast to scan, and action-oriented.

When a visual asset is necessary, identify exactly why it is necessary and request or create only that asset. When it is not necessary, prefer clean UI, icons, typography, and spacing.

The best redesign is not the one with the most visual changes. It is the one that makes the user's next action easier.
