/**
 * auth.js — Password hashing & JWT signing/verification
 *
 * Uses only Node.js built-in crypto module (zero dependencies).
 * Passwords are hashed with PBKDF2 (SHA-512, 100k iterations).
 * Tokens are HMAC-SHA256 signed JWTs with a 24-hour expiry.
 */

const crypto = require('node:crypto');

// ── Configuration ──────────────────────────────────────────────────────────────

// In Vercel, process.env.AUTH_SECRET will be defined.
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me-in-production';
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const SALT_BYTES = 32;
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

// ── Password Hashing ──────────────────────────────────────────────────────────

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, storedSalt) {
  const hash = crypto
    .pbkdf2Sync(password, storedSalt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// ── JWT (HMAC-SHA256) ─────────────────────────────────────────────────────────

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function base64urlDecode(str) {
  return Buffer.from(str, 'base64url').toString();
}

function sign(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const signatureB64 = base64url(signature);

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

function verify(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const expected = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const actual = Buffer.from(signatureB64, 'base64url');

    if (!crypto.timingSafeEqual(expected, actual)) return null;

    // Decode and check expiry
    const payload = JSON.parse(base64urlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, sign, verify };
