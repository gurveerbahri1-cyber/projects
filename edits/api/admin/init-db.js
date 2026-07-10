const { sql } = require('@vercel/postgres');
const crypto = require('node:crypto');
const { hashPassword } = require('../_utils/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.headers['x-admin-secret'];

  if (!adminSecret || providedSecret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing ADMIN_SECRET' });
  }

  try {
    // 1. Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        password_salt VARCHAR(255) NOT NULL,
        roles VARCHAR(255) NOT NULL,
        identity_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        key VARCHAR(50) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        description TEXT,
        evidence_allowed BOOLEAN DEFAULT FALSE,
        sort_order INTEGER
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS properties (
        id UUID PRIMARY KEY,
        host_id UUID NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY,
        property_id UUID NOT NULL REFERENCES properties(id),
        guest_id UUID NOT NULL REFERENCES users(id),
        host_id UUID NOT NULL REFERENCES users(id),
        check_in DATE,
        check_out DATE,
        status VARCHAR(50) DEFAULT 'pending',
        guest_declared BOOLEAN DEFAULT FALSE,
        host_declared BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY,
        booking_id UUID NOT NULL REFERENCES bookings(id),
        direction VARCHAR(50) NOT NULL,
        reviewer_id UUID NOT NULL REFERENCES users(id),
        reviewee_id UUID NOT NULL REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        submitted_at TIMESTAMP,
        revealed_at TIMESTAMP,
        UNIQUE(booking_id, direction)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS review_scores (
        id UUID PRIMARY KEY,
        review_id UUID NOT NULL REFERENCES reviews(id),
        category_key VARCHAR(50) NOT NULL REFERENCES categories(key),
        score INTEGER NOT NULL,
        note TEXT,
        has_evidence BOOLEAN DEFAULT FALSE,
        excluded_from_aggregate BOOLEAN DEFAULT FALSE,
        UNIQUE(review_id, category_key)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS disputes (
        id UUID PRIMARY KEY,
        review_score_id UUID NOT NULL REFERENCES review_scores(id),
        raised_by UUID NOT NULL REFERENCES users(id),
        explanation TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        resolver_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      );
    `;

    // 2. Seed Categories
    const { rows: catRows } = await sql`SELECT COUNT(*) as c FROM categories`;
    let seededCategories = false;
    if (parseInt(catRows[0].c) === 0) {
      await sql`
        INSERT INTO categories (key, label, description, evidence_allowed, sort_order) VALUES
        ('cleanliness', 'Cleanliness', 'How the space was left compared to check-in condition.', TRUE, 1),
        ('care', 'Property Care', 'Damage, vandalism, or unauthorized changes to the space.', TRUE, 2),
        ('rules', 'Rule Compliance', 'Smoking, pets, guest count, and quiet hours.', FALSE, 3),
        ('comm', 'Communication', 'Responsiveness and honesty about issues during the stay.', FALSE, 4),
        ('house', 'House Respect', 'Check-in/out times, and care for stated house rules.', FALSE, 5)
      `;
      seededCategories = true;
    }

    // 3. Seed Users & Demo Booking
    const { rows: users } = await sql`SELECT COUNT(*) as c FROM users`;
    const userCount = parseInt(users[0].c);
    let seededUsers = false;

    if (userCount === 0) {
      async function makeUser(name, email, roles, verified) {
        const id = crypto.randomUUID();
        const { hash, salt } = hashPassword('password123');
        await sql`
          INSERT INTO users (id, name, email, password_hash, password_salt, roles, identity_verified)
          VALUES (${id}, ${name}, ${email}, ${hash}, ${salt}, ${roles}, ${verified})
        `;
        return id;
      }

      const hostId = await makeUser('Jordan Lee', 'host@demo.com', 'host', true);
      const guestId = await makeUser('Maren Okafor', 'guest@demo.com', 'guest', true);
      await makeUser('Review Team', 'mod@demo.com', 'moderator', true);

      const propId = crypto.randomUUID();
      await sql`
        INSERT INTO properties (id, host_id, title)
        VALUES (${propId}, ${hostId}, 'Birchwood Loft')
      `;

      const bookingId = crypto.randomUUID();
      await sql`
        INSERT INTO bookings (id, property_id, guest_id, host_id, check_in, check_out, status, guest_declared, host_declared)
        VALUES (${bookingId}, ${propId}, ${guestId}, ${hostId}, '2026-06-24', '2026-06-28', 'completed', true, true)
      `;
      seededUsers = true;
    }

    return res.status(200).json({
      message: "Database ready",
      seededCategories,
      seededUsers
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database initialization failed', detail: error.message });
  }
};
