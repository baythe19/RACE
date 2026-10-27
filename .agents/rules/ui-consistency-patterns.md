# RACE — UI/UX Consistency, Motion & Interaction Patterns

> **Scope:** Mobile Apps (`mobile application/`, `customer application/`) and Web Admin (`race-admin/`).
> **Priority:** High — Consult whenever creating new screens or restyling existing surfaces.

---

## 1. Responsive Scaling & Typography Ramp

1. **Clamped Scaling Formula:**
   Always reference a `390 dp` standard width (`REF_W = 390`). Wrap scaling in a clamp to avoid oversized elements on tablets, foldables, or landscape views:
   ```ts
   const REF_W = 390;
   const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
   const px = (val: number) => Math.max(1, Math.round(val * scale));
   ```
2. **Typography Rules:**
   - On Android, never set a fixed `height` equal to `lineHeight` on `<Text>` with `includeFontPadding: false` (it clips descenders like `g`, `y`, `p`).
   - Use semantically distinct text styles: bold headings (`#111827` or `#000000`), readable subtitles (`#4B5563` / `#6B7280`), and muted captions (`#9CA3AF`).

---

## 2. Header & Brand Logo Consistency

1. **Header Sizing:**
   - Standard header height: `insets.top + px(58)`.
   - Symmetrical layout: Left back button (`hitSlop={14}`), centered brand logo, right empty spacer (`width: px(34)`) for balance.
2. **Logo Dimensions:**
   - Partner surfaces: Use `<PartnerHeaderLogo width={px(104)} />`.
   - Never use ad-hoc unscaled image widths that collide with status bars or stepper lines.

---

## 3. Forms, Keyboard & Typing Behavior

1. **ScrollView & Keyboard Avoiding:**
   - Always specify `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="on-drag"` on form `<ScrollView>`.
   - Wrap with `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>`.
2. **Indian Phone Number Normalization:**
   Prevent the classic paste bug where `+91` (12 digits) or `0` (11 digits) gets sliced incorrectly:
   ```ts
   export function normalizeIndianPhone(raw: string): string {
     const digits = raw.replace(/\D/g, '');
     if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
     if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
     return digits.slice(0, 10);
   }
   ```
3. **Field Attributes:**
   - Name: `autoCapitalize="words"`, `autoCorrect={false}`, `returnKeyType="next"`.
   - Registration & License: `autoCapitalize="characters"`, `autoCorrect={false}`, uppercase sanitization.
   - Address: `multiline={true}`, `scrollEnabled={false}`, `textAlignVertical="top"`.
   - Email: `keyboardType="email-address"`, `autoCapitalize="none"`, `autoCorrect={false}`.

---

## 4. Motion & Tactile Press Feedback

1. **Standard Motion Tokens (`theme/motion.ts`):**
   - `tapFeedback`: `100 ms` (`scale: 0.985`, `opacity: 0.85`).
   - `microTransition`: `150 ms` (toggles, chips, pills).
   - `contentTransition`: `200 ms` (cards, expandable banners).
   - `screenTransition`: `280 ms` (native stack push/pop).
   - `sheetTransition`: `260 ms` (bottom sheet snap).
   - `successEmphasis`: `220 ms` (checkmark feedback, once).
2. **No Decorative Bloat:**
   No continuous bouncing, persistent pulsing, or confetti on routine actions. Motion is functional.
3. **Action Locking (Double-Tap Guard):**
   Always disable primary CTA buttons and show a spinner while an asynchronous mutation is in flight (`disabled={submitting || isPending}`).

---

## 5. Navigation & Screen Flow Patterns

1. **Multi-Step Form Editing:**
   - When user taps "Edit" on a Review/Summary screen, pass `{ ...route.params, fromReview: true }`.
   - The edited screen switches its CTA to `"Save & Return to Review →"` and returns directly to the Review screen on continue.
2. **Post-Submission Verification Status:**
   - Never reset immediately to the dashboard on submission.
   - Direct to the verification status screen (`DriverVerificationPendingScreen` matching `image copy 4.png`):
     - Displays 4-step vertical tracker (*Details submitted* ➔ *Under review* ➔ *Background check* ➔ *Approved*).
     - Provides `"View my application"` (returns to review) and `"Go to Dashboard (Read only)"`.
3. **Testing & QA Freedom:**
   - Populate sensible fallback defaults when continuing empty fields during development/testing so testers are never locked out of testing downstream flows.

---

## 6. Service & Trip Lifecycle Invariants

1. **OTP Separation:**
   - 6-digit login OTP (`PartnerOtpVerificationScreen`) is separate from the 4-digit customer trip OTP (`DriverActiveJobScreen`).
   - Never mix their handlers, inputs, or validation services.
2. **Trip State Machine:**
   `request` ➔ `accepted` ➔ `en route` ➔ `arrived` ➔ `verify customer 4-digit OTP` ➔ `in progress` ➔ `completed`.
   Backend state is authoritative; never optimistically mark a job completed before server confirmation.
3. **Vehicle to Driver Type Mapping:**
   - Flatbed / Wheel-lift / Heavy tow ➔ `'Tow Driver'` (matches Customer Towing requests in `driverAssignment.ts`).
   - Car / Roadside ➔ `'Part-Time'` (matches Customer Driver Hire requests).
