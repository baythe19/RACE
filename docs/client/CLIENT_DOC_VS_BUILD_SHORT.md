# RACE — client spec vs build (senior 1-pager)

Compared the original client document with the code we have now (customer app, partner app, admin, backend).  
**Honest line:** screens look ~75% complete. What actually works end-to-end vs the client ask is **about 57%**. Ready for real users (real OTP, real pay, real QR scan, live tracking, real KYC) is **lower — roughly one-third**.

Future items the client already marked “later” (ambulance, EV, car wash, referrals, chatbot, Odia, etc.) are **not** counted as leftover launch work.

---

## Score (0–100)

| Area | Score | In one sentence | Built | Still to build |
|------|------:|-----------------|-------|----------------|
| Customer signup / vehicles | 78 | Strong. PIN/password are demo. | Phone OTP, name, gender, DOB, address, emergency contact, multi-vehicle + QR image | Real PIN/password (or drop them); optional email; camera photo upload; turn off OTP skip |
| Home services (towing, driver, roadside) | 72 | Roadside is real. Towing/driver *types* are mostly labels. | Catalog on home; roadside 4 jobs; scheduled towing; generic driver hire | Save Instant/Emergency towing; 4 driver types as real products; full-time hire is only enquiry today |
| Vendor (company) signup | 69 | Company KYC mostly works. Bank + agreement weak. | Business name, owner, mobile, address; Aadhaar, PAN, GST, cancelled cheque; admin can approve | Bank account fields; MSME/Udyam; agreement checkbox; selfie step; background verification |
| Tow / full-time / part-time **driver** signup | 28–38 | One form. Documents often **not saved**. Three driver products not built. | One combined driver form (name, mobile, address, vehicle type) | Send uploaded docs to server; emergency contact; separate tow / full-time / part-time packs; availability, experience, bank, fitness/PUC |
| Subscriptions | 52 | Plan names match. Paying is fake. | Basic/Premium/Family + driver plans on customer app | Real payment; vendor plans in partner app (commission, priority leads, badge) |
| Vehicle QR emergency | 42 | QR is generated. Scan is a fake tap, not camera. | Unique QR created per vehicle | Real camera scan → call owner, notify contacts, request towing, share location |
| Admin | 58 | Can list/approve people. Live map and real money are not there. | Customer/vendor/driver lists; approve/reject; document review; booking list | Live map; real payments/commissions/refunds; reports on the same bookings the apps create; clear suspend |
| **Overall (launch spec)** | **57** | Half the written ask is truly working. | Shell of all three apps + API | Hard half: KYC save, booking types, QR scan, payments, live ops |

---

## What we can say is built

- Three apps + one API: customer phone, partner phone (vendor + driver), admin website.
- Customer: phone login, profile, multiple vehicles, book roadside, book towing/driver (generic), see plans.
- Vendor company can register and upload main docs; admin can approve.
- Admin can see customers, vendors, drivers, bookings.

## What looks done but is not

- Payments, refunds, commissions — **stub** (success without a real gateway).
- OTP can be skipped in the apps (`SKIP_OTP_AUTH`).
- Driver uploads documents on screen, then submit **does not send them**.
- QR “scan” does not use the camera.
- Live tracking / admin live map — scaffold.
- Instant vs emergency towing, and four driver hire types — mostly UI, not stored as real products.
- Full-time driver hire on customer side = enquiry only.

---

## How much work is left (honest)

Think of remaining work as **the hard half**, not a small polish.

| Remaining bucket | Size | Why it matters |
|------------------|------|----------------|
| **1. Make the existing app honest** | Medium | Real OTP, save driver KYC, stop fake pay / fake QR, fix admin reports that look at the wrong bookings |
| **2. Finish the client’s “now” products** | Large | Driver types as real registrations, towing modes saved, QR scan → SOS/towing, PIN or drop it |
| **3. Money + live ops** | Largest | Payment gateway, commissions/refunds, live map, finance the admin can trust |
| **4. Client “later” list** | Out of scope | Do not start unless seniors expand the contract |

**Calendar (rough, one focused team, not a promise):** bucket 1 is weeks; buckets 2+3 are **months**, not days. Bucket 4 is extra if they want it.

We should not tell seniors “70% done, almost launch.” Fair line:

> *The product shell is there. About half the client spec works through. The remaining work is payments, real KYC, real QR/SOS, booking types, and live ops — that is still a full delivery, not a bug-fix sprint.*

Detail (if someone asks): `docs/client/CLIENT_DOC_VS_BUILD.md`
