# RACE Service UI/UX Agent — Mobile App Patterns & Behavior Rules
Version: 1.1

This document defines the reusable interaction patterns the agent must apply across RACE screens.

The goal is not to make every screen identical. The goal is to make every screen feel like the **same product** while letting each screen optimize for its task.

---

# 1. Pattern hierarchy

Every redesign should use this hierarchy:

```text
Product shell
  ↓
Navigation patterns
  ↓
Screen patterns
  ↓
Component patterns
  ↓
State patterns
  ↓
Micro-interactions
```

Do not solve a local UI problem by breaking a higher-level pattern.

---

# 2. Global app shell

The app shell consists of:

```text
Status / safe-area handling
Header
Content region
Optional bottom navigation
Optional persistent action area
```

The shell should be structurally predictable across the app.

---

# 3. Header pattern

The header is part of navigation and orientation.

### Default header

```text
[Back]       Screen title                 [Action]
```

or, for root screens:

```text
Screen context/title                    [Notification/Profile]
```

### Header rules

- Use a consistent height and vertical alignment.
- Keep the back action in the same location across screens.
- Use the same icon family.
- Keep title typography consistent.
- Do not introduce a logo in one screen and remove it in another without a reason.
- Right-side actions must be contextual and limited.
- Do not hide important navigation inside a title area.

### Back behavior

```text
Normal stack screen → navigate back
Root screen         → no back button unless the flow explicitly needs it
Modal/sheet         → dismiss
Unsaved form        → confirm discard only when data loss is meaningful
```

Do not make the visual back button behave differently on different screens.

---

# 4. Bottom navigation pattern

Recommended top-level destinations:

```text
Home | Services | SOS | Bookings | Profile
```

The exact labels may follow the existing product, but the structure should remain stable.

### Show bottom navigation when

- user is moving between top-level app areas
- browsing
- checking history/bookings/profile

### Hide or temporarily replace it when

- completing a focused booking flow
- using a map picker
- performing a high-focus emergency action
- viewing full-screen tracking
- a modal/sheet owns the interaction

### Active state

Use:

```text
icon + label + subtle active accent
```

Do not rely only on color.

### SOS

SOS is a special action, not a normal content destination.

Its visual treatment may be distinct, but it must still obey the global shell and safe-area rules.

---

# 5. Scroll behavior

Every screen must explicitly define its scrolling model.

Possible models:

```text
A. full page scroll
B. content scroll + fixed bottom CTA
C. list scroll + fixed header
D. map + bottom sheet
E. no scroll / compact task
```

Avoid mixed nested scrolling unless necessary.

### Keyboard interaction

When the keyboard opens:

```text
active field remains visible
↓
content can scroll
↓
primary action remains reachable
```

Use keyboard-aware scrolling and bottom inset handling.

Never let the keyboard cover the active input or the main form action.

---

# 6. Input field pattern

Default structure:

```text
Label
[leading icon] Input value                  [optional suffix]
Supporting/error message
```

### States

Every important field should support:

```text
idle
focused
filled
valid
invalid
disabled
loading / verifying
```

Do not design only the idle state.

### Focus

On focus:

- maintain clear active border/focus treatment
- preserve label visibility
- scroll field into view if required
- avoid large layout jumps

### Keyboard type

Match keyboard to data:

```text
phone        → numeric/phone keyboard
pincode      → numeric
email        → email keyboard
name         → text keyboard
registration → text + numeric friendly input
```

### Input formatting

Normalize formatting only when it helps the user.

Examples:

```text
+91 98765 43210
MP 04 AB 1234
```

Do not force users to manually type formatting that the app can safely apply.

---

# 7. Form progression

Use progressive disclosure.

Collect the minimum information needed for the current step.

### Preferred form rules

```text
one clear task per screen
short explanation
minimal required fields
optional fields clearly marked
primary CTA at bottom
secondary escape/skip path when safe
```

### Step indicators

Use a step indicator when:

- the process has 2–5 meaningful stages
- the user benefits from knowing progress
- stages are stable

Avoid step indicators for 2 trivial inputs that could be one screen.

### Step naming

Use semantic names where useful:

```text
About you
Emergency
Vehicle
```

Numbers alone are acceptable when labels are already obvious, but names help orientation.

---

# 8. Button hierarchy

Use:

```text
Primary   → solid RACE yellow/orange
Secondary → outlined/quiet
Tertiary  → text/link
```

### Positioning

For high-intent forms and bookings:

```text
content

[ PRIMARY ACTION ]
```

For complex tasks where the action must remain reachable:

```text
scrolling content
───────────────
fixed action bar
[Secondary] [Primary]
```

### Button copy

Name the result:

```text
Request help
Book towing
Save vehicle
Use this location
Create account
```

---

# 9. Loading patterns

Every network-backed action should have an explicit loading state.

Examples:

```text
Request Help → Requesting…
Use Location → Finding location…
Save Vehicle → Saving…
Book Towing → Confirming…
```

Prevent duplicate submission while loading.

Preserve user-entered data during network retries.

Avoid full-screen spinners when only one component is loading.

Prefer local/skeleton loading for predictable content.

---

# 10. Error patterns

Errors have three parts:

```text
what happened
why it matters
what the user can do
```

Example:

```text
We couldn't get your location.
Location permission is off.
[Try again] [Enter manually]
```

### Network errors

Do not show:

```text
AxiosError: timeout of 10000ms exceeded
```

Translate technical failure into user language.

---

# 11. Empty states

Every meaningful list should have an empty state.

Structure:

```text
simple visual/icon
short explanation
one useful next action
```

Examples:

```text
No bookings yet
Your completed and upcoming services will appear here.
[Browse services]
```

Avoid decorative empty-state copy with no action.

---

# 12. Success states

Success should answer:

```text
Did it work?
What happened?
What can I do next?
```

Example:

```text
Vehicle saved
Your vehicle is ready for faster assistance.
[Continue to RACE]
```

Do not stop the user on a success animation with no next step.

---

# 13. Bottom sheets

Use a bottom sheet when the user needs contextual choices without leaving the current task.

Good uses:

- location method
- service variant selection
- filter/sort
- confirmation
- quick action menus

### Sheet anatomy

```text
drag handle
context/title
short description
options / form
primary action if needed
```

### Sheet behavior

- respect safe-area inset
- support keyboard expansion when inputs exist
- dismiss on backdrop tap only when safe
- preserve state on accidental dismissal where appropriate
- use larger sheet sizes for complex content

Do not turn every navigation event into a sheet.

---

# 14. Modal confirmation pattern

Use confirmation only when the consequence is meaningful.

Good examples:

```text
Cancel active request?
Delete saved vehicle?
Discard changes?
```

Do not confirm trivial actions.

Avoid:

```text
Are you sure you want to view services?
```

---

# 15. Location pattern

Preferred sequence:

```text
Existing valid location
      ↓
Use current location
      ↓
Search location
      ↓
Map picker fallback
```

### Location permission denied

Offer an actionable fallback immediately.

```text
Location access is off
[Open settings] [Enter location]
```

Do not dead-end the user.

### Map picker

Use:

```text
search
map
selected-address area
confirm action
```

Keep the selected address visible while the map is being moved.

---

# 16. Service discovery pattern

The service system has levels.

```text
Home
  ↓
Service category
  ↓
Service variant
  ↓
Booking/request
```

Do not dump all service variants onto Home.

### Home

Show only the most relevant quick actions and a concise service entry point.

### Services

Show the main service categories:

```text
Towing
Driver
Roadside
More / Future
```

### Category detail

Use compact rows/list items for variants:

```text
[icon] Instant Towing
       Dispatched immediately
       From ₹499                         [Book]
```

Avoid four huge marketing cards when a compact list is faster to scan.

---

# 17. Booking flow pattern

Recommended mental model:

```text
Service
 ↓
Variant
 ↓
Location
 ↓
Vehicle/context
 ↓
Price/ETA
 ↓
Confirm
 ↓
Tracking / status
```

Do not ask for information before it becomes relevant.

For already-known values, prefill and let users edit.

---

# 18. Known data should be remembered

Once the user has valid data, reuse it.

Examples:

```text
saved vehicle
saved location
saved emergency contact
saved contact preferences
```

The user should not repeatedly type the same information for every booking.

Provide a clear edit route.

---

# 19. Onboarding/profile pattern for RACE

The profile setup should optimize for first-use completion, not profile completeness.

### Recommended logical sequence

```text
1. About you
2. Emergency contact
3. Vehicle
4. Done
```

### Move to Profile/Settings

Usually defer:

```text
Date of birth
Gender
Home address (unless required by booking/business rule)
Profile photo
other personalization
```

### Skip behavior

Safe optional information may expose:

```text
Skip for now
```

A skipped field must remain editable later.

---

# 20. Permission patterns

Ask for permissions at the moment the feature needs them.

Avoid asking for all permissions at first launch.

Examples:

```text
Location → when finding nearby assistance
Camera → when taking profile/vehicle image
Notifications → when useful for booking/arrival updates
```

Explain why the permission helps before the system prompt when necessary.

---

# 21. Notification pattern

A notification icon is useful only when it leads to meaningful information.

Support states such as:

```text
unread
read
empty
```

Do not show an unread badge permanently just to make the screen look active.

---

# 22. Service status pattern

Use clear status labels.

Examples:

```text
Available now
3 drivers nearby
Coming in 20–30 min
Scheduled for 6:00 PM
Coming soon
Unavailable in this area
```

Do not rely on tiny colored dots alone.

---

# 23. Price pattern

Use consistent price hierarchy:

```text
Service name
short explanation
From ₹499
```

Use exact price only when the backend can guarantee it.

Use estimated price wording when necessary:

```text
Estimated ₹500–₹700
```

Avoid price typography so large that it overwhelms the service name and task.

---

# 24. Transition system

Use a small, predictable motion vocabulary.

### Navigation

```text
push → horizontal slide
modal/sheet → upward motion
success → subtle scale/fade or state morph
```

### Rules

- keep durations short
- do not block emergency actions
- respect reduced-motion accessibility settings
- keep shared objects spatially coherent where useful

Do not invent a unique transition for every screen.

---

# 25. Gesture behavior

Do not hide essential functionality behind obscure gestures.

Swipe gestures can supplement visible actions, not replace them.

Examples:

```text
swipe-to-dismiss sheet
pull-to-refresh list
map pan/zoom
```

Make visible affordances available for critical actions.

---

# 26. Accessibility pattern

Every component should survive:

```text
larger text
screen reader labels
low-vision contrast needs
color blindness
touch target needs
reduced motion
```

Do not make critical actions dependent on tiny icons.

Important touch targets should be comfortably tappable.

---

# 27. Indian mobile context

For Indian users, the design should account for practical realities without stereotyping:

- phone-number-first authentication is common
- +91 should be sensible by default
- rupee pricing should be clear
- addresses may be long and less standardized
- pincode can be useful when the backend actually uses it
- network quality may vary
- users may prefer obvious, direct actions over complex navigation

Do not add fields or complexity merely because these patterns exist.

---

# 28. Responsive behavior

The design must define behavior for:

```text
small phone
normal phone
large phone
large text
keyboard open
long text
long address
API slow
API error
```

Avoid designs that only work in the exact screenshot size.

---

# 29. Component consistency checklist

Before creating a new component, compare it against existing:

```text
Header
Button
Input
Card
Row/List item
Chip
Status badge
Bottom nav
Bottom sheet
Dialog
Empty state
Loading state
Error state
```

Reuse existing primitives before introducing another visual variant.

---

# 30. Screen anatomy templates

## Root screen

```text
Header/context
Main task
1 primary action
Secondary discovery
Bottom navigation
```

## List/detail screen

```text
Header
Short context
List / detail content
Sticky action when needed
```

## Form screen

```text
Header
Progress (if meaningful)
Short explanation
Fields
Primary action
Optional skip/back path
```

## Map/task screen

```text
Header
Map
Context sheet
Primary confirmation
```

## Success screen

```text
Success state
What changed
What happens next
Primary action
Optional secondary path
```

---

# 31. Behavioral tags for implementation tasks

The agent should use these tags in design notes and code comments where useful:

```text
[REQUIRED]
[OPTIONAL]
[DEFERRED]
[SKIP_ALLOWED]
[AUTO_FILL]
[REMEMBER]
[VALIDATE_LIVE]
[KEYBOARD_AWARE]
[FOCUS_SCROLL]
[LOADING_STATE]
[ERROR_STATE]
[EMPTY_STATE]
[SUCCESS_STATE]
[PERMISSION_REQUIRED]
[CONFIRM_REQUIRED]
[STICKY_CTA]
[NO_BOTTOM_NAV]
[BACK_STACK]
[ASSET_NEEDED]
[SVG_PREFERRED]
[BACKEND_REQUIRED]
```

Tags should communicate behavior, not replace actual implementation details.

---

# 32. Final pattern consistency test

Before implementation, the agent must be able to answer:

```text
Header pattern: __________
Back behavior: ___________
Bottom nav: shown/hidden + why
Primary CTA: ____________
Keyboard behavior: ______
Loading behavior: _______
Error behavior: _________
Empty state: ____________
Success state: __________
Permission behavior: ____
Transition: _____________
Existing component reused: __________
New component justified: ____________
```

If these cannot be answered, the screen is not ready for implementation.
