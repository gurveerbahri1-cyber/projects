const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');
const { hashPassword } = require('./auth');

const db = new DatabaseSync(path.join(__dirname, 'data.db'));
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  roles TEXT NOT NULL,                 -- comma-separated: host,guest,moderator
  identity_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  evidence_allowed INTEGER DEFAULT 0,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  guest_id TEXT NOT NULL REFERENCES users(id),
  host_id TEXT NOT NULL REFERENCES users(id),
  check_in TEXT,
  check_out TEXT,
  status TEXT DEFAULT 'pending',       -- pending -> completed
  guest_declared INTEGER DEFAULT 0,
  host_declared INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  direction TEXT NOT NULL,             -- host_to_guest | guest_to_host
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewee_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending',       -- pending -> submitted -> revealed
  submitted_at TEXT,
  revealed_at TEXT,
  UNIQUE(booking_id, direction)
);

CREATE TABLE IF NOT EXISTS review_scores (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  category_key TEXT NOT NULL REFERENCES categories(key),
  score INTEGER NOT NULL,
  note TEXT,
  has_evidence INTEGER DEFAULT 0,
  excluded_from_aggregate INTEGER DEFAULT 0,
  UNIQUE(review_id, category_key)
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  review_score_id TEXT NOT NULL REFERENCES review_scores(id),
  raised_by TEXT NOT NULL REFERENCES users(id),
  explanation TEXT NOT NULL,
  status TEXT DEFAULT 'open',          -- open | upheld | rejected
  resolver_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);
`);

function seedIfEmpty() {
  const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
  if (catCount === 0) {
    const insertCat = db.prepare(
      'INSERT INTO categories (key,label,description,evidence_allowed,sort_order) VALUES (?,?,?,?,?)'
    );
    const cats = [
      ['cleanliness', 'Cleanliness', 'How the space was left compared to check-in condition.', 1, 1],
      ['care', 'Property Care', 'Damage, vandalism, or unauthorized changes to the space.', 1, 2],
      ['rules', 'Rule Compliance', 'Smoking, pets, guest count, and quiet hours.', 0, 3],
      ['comm', 'Communication', 'Responsiveness and honesty about issues during the stay.', 0, 4],
      ['house', 'House Respect', 'Check-in/out times, and care for stated house rules.', 0, 5],
    ];
    for (const c of cats) insertCat.run(...c);
  }

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      'INSERT INTO users (id,name,email,password_hash,password_salt,roles,identity_verified) VALUES (?,?,?,?,?,?,?)'
    );
    const makeUser = (name, email, roles, verified) => {
      const id = crypto.randomUUID();
      const { hash, salt } = hashPassword('password123');
      insertUser.run(id, name, email, hash, salt, roles, verified ? 1 : 0);
      return id;
    };

    const hostId = makeUser('Jordan Lee', 'host@demo.com', 'host', 1);
    const guestId = makeUser('Maren Okafor', 'guest@demo.com', 'guest', 1);
    makeUser('Review Team', 'mod@demo.com', 'moderator', 1);

    const propId = crypto.randomUUID();
    db.prepare('INSERT INTO properties (id,host_id,title) VALUES (?,?,?)').run(
      propId,
      hostId,
      'Birchwood Loft'
    );

    // A pre-completed demo booking so you can try the review flow immediately.
    const bookingId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO bookings (id,property_id,guest_id,host_id,check_in,check_out,status,guest_declared,host_declared)
       VALUES (?,?,?,?,?,?, 'completed', 1, 1)`
    ).run(bookingId, propId, guestId, hostId, '2026-06-24', '2026-06-28');

    console.log('Seeded demo data:');
    console.log('  Host:      host@demo.com / password123');
    console.log('  Guest:     guest@demo.com / password123');
    console.log('  Moderator: mod@demo.com / password123');
  }
}

seedIfEmpty();

module.exports = { db };
