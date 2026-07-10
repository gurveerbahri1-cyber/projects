# Documentation

Design documents and specifications for the Guest Rating Platform.

## Files

| Document | Description |
|---|---|
| [guest-rating-schema.md](./guest-rating-schema.md) | Complete data model — 9 tables covering users, bookings, reviews, disputes, and trust scores |
| [guest-rating-auth-and-verification.md](./guest-rating-auth-and-verification.md) | Authentication, identity verification (KYC), ban-evasion detection, and permission matrix |
| [guest-rating-erd.mermaid](./guest-rating-erd.mermaid) | Entity-relationship diagram (viewable on GitHub with Mermaid rendering) |

## Reading Order

1. **Start with the schema** — `guest-rating-schema.md` explains every table, its fields, and the relationships between them.
2. **Then read auth** — `guest-rating-auth-and-verification.md` extends the schema with OAuth, sessions, identity verification, and device fingerprinting tables.
3. **Reference the ERD** — `guest-rating-erd.mermaid` provides a visual map of all entity relationships.
