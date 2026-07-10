# Guest-Rating Platform — Data Model

## Entity overview

| Entity | Purpose |
|---|---|
| `users` | Anyone on the platform — can be a host, a guest, or both |
| `properties` | A listing owned by a host |
| `bookings` | A completed or in-progress stay linking a guest to a property |
| `categories` | The fixed list of ratable dimensions (Cleanliness, Property Care, etc.) |
| `reviews` | One review "envelope" — either host→guest or guest→host, for one booking |
| `review_scores` | Per-category score + note within a review |
| `review_evidence` | Photos attached to a specific `review_scores` row |
| `disputes` | A contested `review_scores` row, raised by the reviewee |
| `trust_scores` | Cached/materialized aggregate scores per user per category, for fast profile reads |
| `audit_log` | Append-only record of moderation and status-changing actions |

---

## Table definitions

### `users`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| name | text | |
| email | text, unique | |
| phone | text, nullable | |
| roles | enum[] | `host`, `guest` — a person can hold both |
| verification_status | enum | `unverified`, `id_verified`, `flagged` |
| created_at | timestamp | |

### `properties`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| host_id | uuid, FK → users.id | |
| title | text | |
| address | text | |
| created_at | timestamp | |

### `bookings`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| property_id | uuid, FK → properties.id | |
| guest_id | uuid, FK → users.id | |
| host_id | uuid, FK → users.id | denormalized for query speed |
| check_in | date | |
| check_out | date | |
| status | enum | `confirmed`, `completed`, `cancelled` |
| external_platform_ref | text, nullable | e.g. Airbnb reservation code, for verified-stay matching |

### `categories`
| Field | Type | Notes |
|---|---|---|
| key | text, PK | e.g. `cleanliness`, `care`, `rules`, `comm`, `house` |
| label | text | Display name |
| description | text | Shown under the category during rating |
| evidence_allowed | boolean | Whether photo evidence can be attached |
| sort_order | int | |

Keep this table-driven rather than hardcoded — it lets you add or retire categories without a schema migration, and keeps rating criteria observable and behavioral rather than subjective (see note at the end).

### `reviews`
One row per **direction** per booking. A completed stay can have up to two: `host_to_guest` and `guest_to_host`.

| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| booking_id | uuid, FK → bookings.id | |
| direction | enum | `host_to_guest`, `guest_to_host` |
| reviewer_id | uuid, FK → users.id | |
| reviewee_id | uuid, FK → users.id | |
| status | enum | `pending`, `submitted`, `revealed`, `disputed` |
| submitted_at | timestamp, nullable | |
| reveal_deadline | timestamp | `check_out + 14 days`, computed at booking completion |
| revealed_at | timestamp, nullable | Set when both directions are `submitted`, or `reveal_deadline` passes |

**Reveal logic** (application-level, not a DB constraint):
```
on submit(review):
  mark review.status = 'submitted'
  counterpart = find sibling review for same booking_id, opposite direction
  if counterpart.status == 'submitted':
      reveal both immediately
  # else wait for reveal_deadline via scheduled job
```

### `review_scores`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| review_id | uuid, FK → reviews.id | |
| category_key | text, FK → categories.key | |
| score | int (1–5) | |
| note | text, nullable | |
| excluded_from_aggregate | boolean, default false | Set true if an upheld dispute removes it from trust_scores |

Unique constraint on `(review_id, category_key)` — one score per category per review.

### `review_evidence`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| review_score_id | uuid, FK → review_scores.id | |
| file_url | text | |
| uploaded_at | timestamp | |

### `disputes`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| review_score_id | uuid, FK → review_scores.id | |
| raised_by | uuid, FK → users.id | Always the reviewee |
| explanation | text | |
| evidence_url | text, nullable | |
| status | enum | `open`, `upheld`, `rejected`, `withdrawn` |
| resolver_id | uuid, FK → users.id, nullable | Moderator |
| resolver_notes | text, nullable | |
| created_at | timestamp | |
| resolved_at | timestamp, nullable | |

### `trust_scores` (materialized, rebuilt on a schedule or on reveal)
| Field | Type | Notes |
|---|---|---|
| user_id | uuid, FK → users.id | |
| category_key | text, FK → categories.key | |
| avg_score | numeric(3,2) | Only counts `revealed` reviews; excludes `excluded_from_aggregate` scores |
| review_count | int | |
| updated_at | timestamp | |

PK: `(user_id, category_key)`

### `audit_log`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| actor_id | uuid, FK → users.id, nullable | Null for system/scheduled actions |
| action | text | e.g. `review.submitted`, `dispute.upheld`, `review.revealed` |
| entity_type | text | e.g. `review`, `dispute` |
| entity_id | uuid | |
| created_at | timestamp | |

---

## Key relationships

```
users (host) ──1:N── properties ──1:N── bookings ──N:1── users (guest)
bookings ──1:2── reviews ──1:N── review_scores ──1:N── review_evidence
review_scores ──0:1── disputes
users ──1:N── trust_scores (one row per category)
```

## Design notes

- **Verified-stay gating**: a `reviews` row should only be creatable if a matching `bookings` row exists with `status = 'completed'`. This is what prevents drive-by or retaliatory reviews from non-guests.
- **Score integrity under dispute**: when a dispute is `upheld`, don't delete the `review_scores` row — flag it with `excluded_from_aggregate` and leave it out of `trust_scores` recalculation. Keeping the record preserves the audit trail instead of quietly erasing history.
- **`categories` as data, not code**: makes it easy to review category wording for anything that could proxy a protected characteristic, and to version category definitions over time without touching application logic.
