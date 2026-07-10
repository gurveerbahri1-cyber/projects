const { sql } = require('@vercel/postgres');
const crypto = require('node:crypto');
const { hashPassword, verifyPassword, sign, verify } = require('./_utils/auth');

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    roles: u.roles.split(','),
    identity_verified: !!u.identity_verified,
  };
}

async function getAuthUser(req) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length);
  const payload = verify(token);
  if (!payload || !payload.sub) return null;
  const { rows } = await sql`SELECT * FROM users WHERE id = ${payload.sub}`;
  return rows[0] || null;
}

function matchPath(pattern, actual) {
  const pParts = pattern.split('/').filter(Boolean);
  const aParts = actual.split('/').filter(Boolean);
  if (pParts.length !== aParts.length) return null;
  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) params[pParts[i].slice(1)] = decodeURIComponent(aParts[i]);
    else if (pParts[i] !== aParts[i]) return null;
  }
  return params;
}

// ---------- route handlers ----------

async function handleSignup(req, res) {
  const { name, email, password, roles } = req.body || {};
  if (!name || !email || !password || !Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: 'name, email, password, and roles[] are required' });
  }
  const { rowCount } = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (rowCount > 0) return res.status(409).json({ error: 'An account with that email already exists' });

  const id = crypto.randomUUID();
  const { hash, salt } = hashPassword(password);
  await sql`
    INSERT INTO users (id, name, email, password_hash, password_salt, roles)
    VALUES (${id}, ${name}, ${email}, ${hash}, ${salt}, ${roles.join(',')})
  `;

  const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
  const user = rows[0];
  const token = sign({ sub: id });
  res.status(201).json({ token, user: publicUser(user) });
}

async function handleLogin(req, res) {
  const { email, password } = req.body || {};
  const { rows } = await sql`SELECT * FROM users WHERE email = ${email || ''}`;
  const user = rows[0];
  if (!user || !verifyPassword(password || '', user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = sign({ sub: user.id });
  res.status(200).json({ token, user: publicUser(user) });
}

async function handleMe(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.status(200).json({ user: publicUser(user) });
}

async function handleCategories(req, res) {
  const { rows } = await sql`SELECT * FROM categories ORDER BY sort_order`;
  res.status(200).json({ categories: rows });
}

async function bookingSummary(b, forUserId) {
  const { rows: pRows } = await sql`SELECT * FROM properties WHERE id = ${b.property_id}`;
  const property = pRows[0];
  const { rows: hRows } = await sql`SELECT id, name, email FROM users WHERE id = ${b.host_id}`;
  const host = hRows[0];
  const { rows: gRows } = await sql`SELECT id, name, email FROM users WHERE id = ${b.guest_id}`;
  const guest = gRows[0];
  const { rows: reviews } = await sql`SELECT * FROM reviews WHERE booking_id = ${b.id}`;

  const myDirection = forUserId === b.host_id ? 'host_to_guest' : 'guest_to_host';
  const otherDirection = myDirection === 'host_to_guest' ? 'guest_to_host' : 'host_to_guest';
  const myReview = reviews.find((r) => r.direction === myDirection) || null;
  const otherReview = reviews.find((r) => r.direction === otherDirection) || null;

  async function getScoresFor(reviewId) {
    const { rows } = await sql`SELECT * FROM review_scores WHERE review_id = ${reviewId}`;
    const scores = [];
    for (const r of rows) {
      const { rows: dRows } = await sql`SELECT * FROM disputes WHERE review_score_id = ${r.id} ORDER BY created_at DESC LIMIT 1`;
      const dispute = dRows[0];
      scores.push({
        id: r.id,
        category_key: r.category_key,
        score: r.score,
        note: r.note,
        has_evidence: !!r.has_evidence,
        excluded_from_aggregate: !!r.excluded_from_aggregate,
        dispute: dispute ? { id: dispute.id, status: dispute.status } : null,
      });
    }
    return scores;
  }

  const result = {
    id: b.id,
    property: property.title,
    check_in: b.check_in,
    check_out: b.check_out,
    status: b.status,
    counterpart: forUserId === b.host_id ? guest : host,
    role: forUserId === b.host_id ? 'host' : 'guest',
    my_review: myReview
      ? { id: myReview.id, status: myReview.status, scores: await getScoresFor(myReview.id) }
      : null,
    other_review:
      otherReview && otherReview.status === 'revealed'
        ? { id: otherReview.id, status: otherReview.status, scores: await getScoresFor(otherReview.id) }
        : otherReview
          ? { status: 'sealed' }
          : null,
  };
  return result;
}

async function handleMyBookings(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { rows } = await sql`
    SELECT * FROM bookings WHERE host_id = ${user.id} OR guest_id = ${user.id} ORDER BY created_at DESC
  `;
  const bookings = await Promise.all(rows.map(b => bookingSummary(b, user.id)));
  res.status(200).json({ bookings });
}

async function handleCreateBooking(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!user.roles.split(',').includes('host')) {
    return res.status(403).json({ error: 'Only hosts can declare a booking' });
  }
  const { guestEmail, propertyTitle, checkIn, checkOut } = req.body || {};
  if (!guestEmail || !propertyTitle || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'guestEmail, propertyTitle, checkIn, and checkOut are required' });
  }
  const { rows: gRows } = await sql`SELECT * FROM users WHERE email = ${guestEmail}`;
  const guest = gRows[0];
  if (!guest) return res.status(400).json({ error: 'That guest does not have an account yet' });

  let { rows: pRows } = await sql`SELECT * FROM properties WHERE host_id = ${user.id} AND title = ${propertyTitle}`;
  let property = pRows[0];
  if (!property) {
    const propId = crypto.randomUUID();
    await sql`INSERT INTO properties (id, host_id, title) VALUES (${propId}, ${user.id}, ${propertyTitle})`;
    pRows = (await sql`SELECT * FROM properties WHERE id = ${propId}`).rows;
    property = pRows[0];
  }

  const bookingId = crypto.randomUUID();
  await sql`
     INSERT INTO bookings (id, property_id, guest_id, host_id, check_in, check_out, status, host_declared, guest_declared)
     VALUES (${bookingId}, ${property.id}, ${guest.id}, ${user.id}, ${checkIn}, ${checkOut}, 'pending', true, false)
  `;

  const { rows: bRows } = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`;
  res.status(201).json({ booking: await bookingSummary(bRows[0], user.id) });
}

async function handleConfirmBooking(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { rows } = await sql`SELECT * FROM bookings WHERE id = ${req.params.id}`;
  const booking = rows[0];
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.guest_id !== user.id) {
    return res.status(403).json({ error: 'Only the assigned guest can confirm this booking' });
  }
  const status = booking.host_declared ? 'completed' : 'pending';
  await sql`UPDATE bookings SET guest_declared = true, status = ${status} WHERE id = ${booking.id}`;
  const updated = (await sql`SELECT * FROM bookings WHERE id = ${booking.id}`).rows[0];
  res.status(200).json({ booking: await bookingSummary(updated, user.id) });
}

async function handleSubmitReview(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { rows } = await sql`SELECT * FROM bookings WHERE id = ${req.params.id}`;
  const booking = rows[0];
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.host_id !== user.id && booking.guest_id !== user.id) {
    return res.status(403).json({ error: 'You are not part of this booking' });
  }
  if (booking.status !== 'completed') {
    return res.status(400).json({ error: 'This stay is not marked completed yet' });
  }

  const direction = user.id === booking.host_id ? 'host_to_guest' : 'guest_to_host';
  const revieweeId = user.id === booking.host_id ? booking.guest_id : booking.host_id;

  const { rowCount } = await sql`SELECT * FROM reviews WHERE booking_id = ${booking.id} AND direction = ${direction}`;
  if (rowCount > 0) return res.status(409).json({ error: 'You already filed a report for this stay' });

  const { scores } = req.body || {};
  const { rows: cats } = await sql`SELECT key FROM categories`;
  const categories = cats.map((c) => c.key);
  if (!Array.isArray(scores) || scores.length !== categories.length) {
    return res.status(400).json({ error: `Expected a score for each of: ${categories.join(', ')}` });
  }
  for (const s of scores) {
    if (!categories.includes(s.category_key) || !Number.isInteger(s.score) || s.score < 1 || s.score > 5) {
      return res.status(400).json({ error: `Invalid score entry for category ${s.category_key}` });
    }
  }

  const reviewId = crypto.randomUUID();
  await sql`
     INSERT INTO reviews (id, booking_id, direction, reviewer_id, reviewee_id, status, submitted_at)
     VALUES (${reviewId}, ${booking.id}, ${direction}, ${user.id}, ${revieweeId}, 'submitted', CURRENT_TIMESTAMP)
  `;

  for (const s of scores) {
    await sql`
      INSERT INTO review_scores (id, review_id, category_key, score, note, has_evidence) 
      VALUES (${crypto.randomUUID()}, ${reviewId}, ${s.category_key}, ${s.score}, ${s.note || null}, ${s.has_evidence ? true : false})
    `;
  }

  const counterpartDirection = direction === 'host_to_guest' ? 'guest_to_host' : 'host_to_guest';
  const { rows: counterpartRows } = await sql`SELECT * FROM reviews WHERE booking_id = ${booking.id} AND direction = ${counterpartDirection}`;
  const counterpart = counterpartRows[0];

  if (counterpart && counterpart.status === 'submitted') {
    await sql`UPDATE reviews SET status='revealed', revealed_at=CURRENT_TIMESTAMP WHERE id IN (${reviewId}, ${counterpart.id})`;
  }

  const updatedBooking = (await sql`SELECT * FROM bookings WHERE id = ${booking.id}`).rows[0];
  res.status(201).json({ booking: await bookingSummary(updatedBooking, user.id) });
}

async function handleTrustScores(req, res) {
  const userId = req.params.id;
  const { rows: uRows } = await sql`SELECT * FROM users WHERE id = ${userId}`;
  const target = uRows[0];
  if (!target) return res.status(404).json({ error: 'User not found' });

  const { rows: categories } = await sql`SELECT * FROM categories ORDER BY sort_order`;
  const result = [];
  for (const c of categories) {
    const { rows } = await sql`
         SELECT AVG(rs.score) AS avg_score, COUNT(*) AS review_count
         FROM review_scores rs
         JOIN reviews r ON r.id = rs.review_id
         WHERE r.reviewee_id = ${userId} AND r.status = 'revealed'
           AND rs.category_key = ${c.key} AND rs.excluded_from_aggregate = false
    `;
    const row = rows[0];
    result.push({
      category_key: c.key,
      label: c.label,
      avg_score: row.avg_score ? Number(Number(row.avg_score).toFixed(2)) : null,
      review_count: parseInt(row.review_count || '0'),
    });
  }
  res.status(200).json({ user: publicUser(target), trust_scores: result });
}

async function handleRaiseDispute(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { rows: sRows } = await sql`SELECT * FROM review_scores WHERE id = ${req.params.id}`;
  const score = sRows[0];
  if (!score) return res.status(404).json({ error: 'Review score not found' });
  const { rows: rRows } = await sql`SELECT * FROM reviews WHERE id = ${score.review_id}`;
  const review = rRows[0];
  if (review.reviewee_id !== user.id) {
    return res.status(403).json({ error: 'Only the person being reviewed can dispute this score' });
  }
  if (review.status !== 'revealed') {
    return res.status(400).json({ error: 'This review is not revealed yet' });
  }
  const { explanation } = req.body || {};
  if (!explanation || !explanation.trim()) {
    return res.status(400).json({ error: 'An explanation is required' });
  }
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO disputes (id, review_score_id, raised_by, explanation) 
    VALUES (${id}, ${score.id}, ${user.id}, ${explanation.trim()})
  `;
  const dispute = (await sql`SELECT * FROM disputes WHERE id = ${id}`).rows[0];
  res.status(201).json({ dispute });
}

async function handleListDisputes(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!user.roles.split(',').includes('moderator')) {
    return res.status(403).json({ error: 'Moderator role required' });
  }
  const { rows } = await sql`SELECT * FROM disputes WHERE status = 'open' ORDER BY created_at`;
  res.status(200).json({ disputes: rows });
}

async function handleResolveDispute(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!user.roles.split(',').includes('moderator')) {
    return res.status(403).json({ error: 'Moderator role required' });
  }
  const { rows } = await sql`SELECT * FROM disputes WHERE id = ${req.params.id}`;
  const dispute = rows[0];
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
  const { status, resolver_notes } = req.body || {};
  if (!['upheld', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "status must be 'upheld' or 'rejected'" });
  }
  await sql`
    UPDATE disputes SET status = ${status}, resolver_notes = ${resolver_notes || null}, resolved_at = CURRENT_TIMESTAMP 
    WHERE id = ${dispute.id}
  `;
  if (status === 'upheld') {
    await sql`UPDATE review_scores SET excluded_from_aggregate = true WHERE id = ${dispute.review_score_id}`;
  }
  const updated = (await sql`SELECT * FROM disputes WHERE id = ${dispute.id}`).rows[0];
  res.status(200).json({ dispute: updated });
}

const routes = [
  ['POST', '/api/auth/signup', handleSignup],
  ['POST', '/api/auth/login', handleLogin],
  ['GET', '/api/me', handleMe],
  ['GET', '/api/categories', handleCategories],
  ['GET', '/api/bookings/mine', handleMyBookings],
  ['POST', '/api/bookings', handleCreateBooking],
  ['POST', '/api/bookings/:id/confirm', handleConfirmBooking],
  ['POST', '/api/bookings/:id/reviews', handleSubmitReview],
  ['GET', '/api/users/:id/trust-scores', handleTrustScores],
  ['POST', '/api/review-scores/:id/disputes', handleRaiseDispute],
  ['GET', '/api/disputes', handleListDisputes],
  ['POST', '/api/disputes/:id/resolve', handleResolveDispute],
];

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    for (const [method, pattern, routeHandler] of routes) {
      if (method !== req.method) continue;
      const params = matchPath(pattern, pathname);
      if (params) {
        req.params = params;
        return await routeHandler(req, res);
      }
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error', detail: String(e.message || e) });
  }
};
