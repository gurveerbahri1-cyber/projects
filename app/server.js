const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db } = require('./db');
const { hashPassword, verifyPassword, sign, verify } = require('./auth');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- helpers ----------

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

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

function getAuthUser(req) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length);
  const payload = verify(token);
  if (!payload || !payload.sub) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
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
  const { name, email, password, roles } = req.body;
  if (!name || !email || !password || !Array.isArray(roles) || roles.length === 0) {
    return send(res, 400, { error: 'name, email, password, and roles[] are required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return send(res, 409, { error: 'An account with that email already exists' });

  const id = crypto.randomUUID();
  const { hash, salt } = hashPassword(password);
  db.prepare(
    'INSERT INTO users (id,name,email,password_hash,password_salt,roles) VALUES (?,?,?,?,?,?)'
  ).run(id, name, email, hash, salt, roles.join(','));

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = sign({ sub: id });
  send(res, 201, { token, user: publicUser(user) });
}

async function handleLogin(req, res) {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email || '');
  if (!user || !verifyPassword(password || '', user.password_hash, user.password_salt)) {
    return send(res, 401, { error: 'Invalid email or password' });
  }
  const token = sign({ sub: user.id });
  send(res, 200, { token, user: publicUser(user) });
}

async function handleMe(req, res) {
  const user = getAuthUser(req);
  if (!user) return send(res, 401, { error: 'Unauthorized' });
  send(res, 200, { user: publicUser(user) });
}

async function handleCategories(req, res) {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  send(res, 200, { categories: cats });
}

function bookingSummary(b, forUserId) {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(b.property_id);
  const host = db.prepare('SELECT id,name,email FROM users WHERE id = ?').get(b.host_id);
  const guest = db.prepare('SELECT id,name,email FROM users WHERE id = ?').get(b.guest_id);
  const reviews = db.prepare('SELECT * FROM reviews WHERE booking_id = ?').all(b.id);

  const myDirection = forUserId === b.host_id ? 'host_to_guest' : 'guest_to_host';
  const otherDirection = myDirection === 'host_to_guest' ? 'guest_to_host' : 'host_to_guest';
  const myReview = reviews.find((r) => r.direction === myDirection) || null;
  const otherReview = reviews.find((r) => r.direction === otherDirection) || null;

  return {
    id: b.id,
    property: property.title,
    check_in: b.check_in,
    check_out: b.check_out,
    status: b.status,
    counterpart: forUserId === b.host_id ? guest : host,
    role: forUserId === b.host_id ? 'host' : 'guest',
    my_review: myReview
      ? { id: myReview.id, status: myReview.status, scores: getScoresFor(myReview.id) }
      : null,
    // Only expose the counterpart's review once it's actually revealed.
    other_review:
      otherReview && otherReview.status === 'revealed'
        ? { id: otherReview.id, status: otherReview.status, scores: getScoresFor(otherReview.id) }
        : otherReview
        ? { status: 'sealed' }
        : null,
  };
}

function getScoresFor(reviewId) {
  const rows = db.prepare('SELECT * FROM review_scores WHERE review_id = ?').all(reviewId);
  return rows.map((r) => {
    const dispute = db
      .prepare('SELECT * FROM disputes WHERE review_score_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(r.id);
    return {
      id: r.id,
      category_key: r.category_key,
      score: r.score,
      note: r.note,
      has_evidence: !!r.has_evidence,
      excluded_from_aggregate: !!r.excluded_from_aggregate,
      dispute: dispute ? { id: dispute.id, status: dispute.status } : null,
    };
  });
}

async function handleMyBookings(req, res) {
  const user = getAuthUser(req);
  if (!user) return send(res, 401, { error: 'Unauthorized' });
  const rows = db
    .prepare('SELECT * FROM bookings WHERE host_id = ? OR guest_id = ? ORDER BY created_at DESC')
    .all(user.id, user.id);
  send(res, 200, { bookings: rows.map((b) => bookingSummary(b, user.id)) });
}

async function handleCreateBooking(req, res) {
  const user = getAuthUser(req);
  if (!user) return send(res, 401, { error: 'Unauthorized' });
  if (!user.roles.split(',').includes('host')) {
    return send(res, 403, { error: 'Only hosts can declare a booking' });
  }
  const { guestEmail, propertyTitle, checkIn, checkOut } = req.body;
  if (!guestEmail || !propertyTitle || !checkIn || !checkOut) {
    return send(res, 400, { error: 'guestEmail, propertyTitle, checkIn, and checkOut are required' });
  }
  const guest = db.prepare('SELECT * FROM users WHERE email = ?').get(guestEmail);
  if (!guest) return send(res, 400, { error: 'That guest does not have an account yet' });

  let property = db
    .prepare('SELECT * FROM properties WHERE host_id = ? AND title = ?')
    .get(user.id, propertyTitle);
  if (!property) {
    const propId = crypto.randomUUID();
    db.prepare('INSERT INTO properties (id,host_id,title) VALUES (?,?,?)').run(
      propId,
      user.id,
      propertyTitle
    );
    property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propId);
  }

  const bookingId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO bookings (id,property_id,guest_id,host_id,check_in,check_out,status,host_declared,guest_declared)
     VALUES (?,?,?,?,?,?, 'pending', 1, 0)`
  ).run(bookingId, property.id, guest.id, user.id, checkIn, checkOut);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  send(res, 201, { booking: bookingSummary(booking, user.id) });
}

async function handleConfirmBooking(req, res) {
  const user = getAuthUser(req);
  if (!user) return send(res, 401, { error: 'Unauthorized' });
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return send(res, 404, { error: 'Booking not found' });
  if (booking.guest_id !== user.id) {
    return send(res, 403, { error: 'Only the assigned guest can confirm this booking' });
  }
  const status = booking.host_declared ? 'completed' : 'pending';
  db.prepare('UPDATE bookings SET guest_declared = 1, status = ? WHERE id = ?').run(
    status,
    booking.id
  );
  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
  send(res, 200, { booking: bookingSummary(updated, user.id) });
}

async function handleSubmitReview(req, res) {
  const user = getAuthUser(req);
  if (!user) return send(res, 401, { error: 'Unauthorized' });
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return send(res, 404, { error: 'Booking not found' });
  if (booking.host_id !== user.id && booking.guest_id !== user.id) {
    return send(res, 403, { error: 'You are not part of this booking' });
  }
  if (booking.status !== 'completed') {
    return send(res, 400, { error: 'This stay is not marked completed yet' });
  }

  const direction = user.id === booking.host_id ? 'host_to_guest' : 'guest_to_host';
  const revieweeId = user.id === booking.host_id ? booking.guest_id : booking.host_id;

  const existing = db
    .prepare('SELECT * FROM reviews WHERE booking_id = ? AND direction = ?')
    .get(booking.id, direction);
  if (existing) return send(res, 409, { error: 'You already filed a report for this stay' });

  const { scores } = req.body;
  const categories = db.prepare('SELECT key FROM categories').all().map((c) => c.key);
  if (!Array.isArray(scores) || scores.length !== categories.length) {
    return send(res, 400, { error: `Expected a score for each of: ${categories.join(', ')}` });
  }
  for (const s of scores) {
    if (!categories.includes(s.category_key) || !Number.isInteger(s.score) || s.score < 1 || s.score > 5) {
      return send(res, 400, { error: `Invalid score entry for category ${s.category_key}` });
    }
  }

  const reviewId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO reviews (id,booking_id,direction,reviewer_id,reviewee_id,status,submitted_at)
     VALUES (?,?,?,?,?, 'submitted', datetime('now'))`
  ).run(reviewId, booking.id, direction, user.id, revieweeId);

  const insertScore = db.prepare(
    'INSERT INTO review_scores (id,review_id,category_key,score,note,has_evidence) VALUES (?,?,?,?,?,?)'
  );
  for (const s of scores) {
    insertScore.run(crypto.randomUUID(), reviewId, s.category_key, s.score, s.note || null, s.has_evidence ? 1 : 0);
  }

  // Mutual reveal: if the counterpart already submitted, reveal both now.
  const counterpartDirection = direction === 'host_to_guest' ? 'guest_to_host' : 'host_to_guest';
  const counterpart = db
    .prepare('SELECT * FROM reviews WHERE booking_id = ? AND direction = ?')
    .get(booking.id, counterpartDirection);

  if (counterpart && counterpart.status === 'submitted') {
    db.prepare("UPDATE reviews SET status='revealed', revealed_at=datetime('now') WHERE id IN (?,?)").run(
      reviewId,
      counterpart.id
    );
  }

  const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
  send(res, 201, { booking: bookingSummary(updatedBooking, user.id) });
}

async function handleTrustScores(req, res) {
  const userId = req.params.id;
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!target) return send(res, 404, { error: 'User not found' });

  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  const result = categories.map((c) => {
    const row = db
      .prepare(
        `SELECT AVG(rs.score) AS avg_score, COUNT(*) AS review_count
         FROM review_scores rs
         JOIN reviews r ON r.id = rs.review_id
         WHERE r.reviewee_id = ? AND r.status = 'revealed'
           AND rs.category_key = ? AND rs.excluded_from_aggregate = 0`
      )
      .get(userId, c.key);
    return {
      category_key: c.key,
      label: c.label,
      avg_score: row.avg_score ? Number(row.avg_score.toFixed(2)) : null,
      review_count: row.review_count,
    };
  });
  send(res, 200, { user: publicUser(target), trust_scores: result });
}

async function handleRaiseDispute(req, res) {
  const user = getAuthUser(req);
  if (!user) return send(res, 401, { error: 'Unauthorized' });
  const score = db.prepare('SELECT * FROM review_scores WHERE id = ?').get(req.params.id);
  if (!score) return send(res, 404, { error: 'Review score not found' });
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(score.review_id);
  if (review.reviewee_id !== user.id) {
    return send(res, 403, { error: 'Only the person being reviewed can dispute this score' });
  }
  if (review.status !== 'revealed') {
    return send(res, 400, { error: 'This review is not revealed yet' });
  }
  const { explanation } = req.body;
  if (!explanation || !explanation.trim()) {
    return send(res, 400, { error: 'An explanation is required' });
  }
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO disputes (id,review_score_id,raised_by,explanation) VALUES (?,?,?,?)'
  ).run(id, score.id, user.id, explanation.trim());
  send(res, 201, { dispute: db.prepare('SELECT * FROM disputes WHERE id = ?').get(id) });
}

async function handleListDisputes(req, res) {
  const user = getAuthUser(req);
  if (!user) return send(res, 401, { error: 'Unauthorized' });
  if (!user.roles.split(',').includes('moderator')) {
    return send(res, 403, { error: 'Moderator role required' });
  }
  const rows = db.prepare("SELECT * FROM disputes WHERE status = 'open' ORDER BY created_at").all();
  send(res, 200, { disputes: rows });
}

async function handleResolveDispute(req, res) {
  const user = getAuthUser(req);
  if (!user) return send(res, 401, { error: 'Unauthorized' });
  if (!user.roles.split(',').includes('moderator')) {
    return send(res, 403, { error: 'Moderator role required' });
  }
  const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id);
  if (!dispute) return send(res, 404, { error: 'Dispute not found' });
  const { status, resolver_notes } = req.body;
  if (!['upheld', 'rejected'].includes(status)) {
    return send(res, 400, { error: "status must be 'upheld' or 'rejected'" });
  }
  db.prepare(
    "UPDATE disputes SET status = ?, resolver_notes = ?, resolved_at = datetime('now') WHERE id = ?"
  ).run(status, resolver_notes || null, dispute.id);
  if (status === 'upheld') {
    db.prepare('UPDATE review_scores SET excluded_from_aggregate = 1 WHERE id = ?').run(
      dispute.review_score_id
    );
  }
  send(res, 200, { dispute: db.prepare('SELECT * FROM disputes WHERE id = ?').get(dispute.id) });
}

// ---------- routing table ----------

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

// ---------- static file serving ----------

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: unknown paths get index.html
      return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
        if (err2) return send(res, 404, { error: 'Not found' });
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data2);
      });
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/')) {
      req.body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
      for (const [method, pattern, handler] of routes) {
        if (method !== req.method) continue;
        const params = matchPath(pattern, pathname);
        if (params) {
          req.params = params;
          return await handler(req, res);
        }
      }
      return send(res, 404, { error: 'Not found' });
    }

    return serveStatic(req, res, pathname);
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Server error', detail: String(e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`Guest-rating API + frontend running at http://localhost:${PORT}`);
});
