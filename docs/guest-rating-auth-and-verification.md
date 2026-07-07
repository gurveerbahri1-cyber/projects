# Auth, Verification & Permissions Model

## Two separate concerns

Keep these distinct — conflating them is where most trust & safety platforms get bitten:

1. **Login auth** — proves you control this session (email/password, OAuth)
2. **Identity verification** — proves you're a real, unique person (KYC-style check)

A rating platform's core value is trustworthy scores. Login auth alone doesn't stop someone with a bad guest score from signing up again under a new email five minutes later. Identity verification is what does.

---

## Login auth

- Email/password (bcrypt/argon2 hash) **and** OAuth (Google, Apple) — most users will prefer OAuth, but don't force it
- Short-lived JWT access token (~15 min) + rotating refresh token in an httpOnly cookie
- Refresh tokens stored **hashed** in `sessions`, individually revocable — lets a user (or you, during a moderation action) log a device out remotely
- Optional MFA, encouraged for hosts specifically, since their account can file reports that affect someone else's reputation

## Identity verification (separate tier)

- Third-party KYC vendor (Persona, Stripe Identity, Onfike-style providers) — you never store raw ID scans yourself, just the vendor's verification result and a reference ID
- **Gate on this, not on login**: a review only counts toward a `trust_scores` aggregate once the reviewer is `identity_verified`. Unverified accounts can still use the app, just not move anyone's public score.
- Same tier is required before a `dispute` can be filed — stops disputes from being a low-cost harassment tool

## Ban-evasion detection

- `device_fingerprints` — hash of device/browser signal, linked to accounts. If a new signup shares a fingerprint (or, better, a payment method token) with an account that was banned or has a very low trust score, flag it for manual review before it can transact.
- This is the single highest-leverage anti-abuse feature for this kind of platform — worth building before scale, not after.

---

## New tables (extend `guest-rating-schema.md`)

### `oauth_identities`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| provider | enum | `google`, `apple` |
| provider_user_id | text | |
| created_at | timestamp | |

### `sessions`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| refresh_token_hash | text | |
| device_fingerprint | text, nullable | |
| created_at | timestamp | |
| expires_at | timestamp | |
| revoked_at | timestamp, nullable | |

### `identity_verifications`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| provider | enum | `persona`, `stripe_identity`, etc. |
| status | enum | `pending`, `verified`, `failed` |
| provider_reference | text | Vendor's opaque reference — not the raw document |
| verified_at | timestamp, nullable | |

### `device_fingerprints`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| fingerprint_hash | text | |
| first_seen_at | timestamp | |
| last_seen_at | timestamp | |

---

## Permission matrix

Authorization should be checked at the **resource-ownership level**, not just role. A `host` role means "can rate guests from bookings this host owns" — never "can rate any guest."

| Action | Who | Constraint |
|---|---|---|
| Declare a booking | Host, Guest | Both parties' declarations must match before `status = confirmed` |
| Submit a review | Host or Guest | Only for their own `booking_id`, only after `check_out`, only once per direction |
| View own trust score / history | The user | Always allowed |
| View another user's trust score | Any counterparty | Aggregate only — no raw notes unless attached to a booking they actually share |
| Raise a dispute | The reviewee | Only on a `review_scores` row where they are `reviewee_id`; requires `identity_verified` |
| Resolve a dispute | Moderator/Admin | |
| Edit `categories` | Admin | |
| View `audit_log` | Admin | |
| Revoke a session | The user (their own) or Admin | |

---

## Design notes

- Enforce the ownership checks server-side on every request (e.g. "does `reviews.reviewer_id` equal the authenticated user's id") — never trust a role claim alone.
- Rate-limit account creation and booking declarations per IP/device, tied into the same `device_fingerprints` table used for ban evasion.
- Log every status-changing action (`review.submitted`, `dispute.upheld`, session revocations) to `audit_log` — this is what you'll need if a dispute ever escalates to a legal claim.
