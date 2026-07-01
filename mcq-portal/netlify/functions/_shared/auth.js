// ============================================================
// Shared auth helpers for the admin API.
// Uses Node's built-in crypto module only — no extra dependency.
// Tokens are HMAC-signed, so they can't be forged without the secret below.
// ============================================================
const crypto = require('crypto');

// ------------------------------------------------------------
// SECRET KEY — used to sign admin session tokens.
// Change this to a long random string before deploying.
// Better option: set an environment variable named SESSION_SECRET
// in Netlify (Site settings > Environment variables) instead of
// editing this file — the env var is used automatically if present.
// ------------------------------------------------------------
const SESSION_SECRET = process.env.SESSION_SECRET || 'CHANGE-THIS-TO-A-LONG-RANDOM-SECRET-STRING';

const TOKEN_LIFETIME_MS = 4 * 60 * 60 * 1000; // 4 hours

function sign(payloadStr) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
}

// Creates a signed token for a logged-in admin.
function createToken(username) {
  const payload = JSON.stringify({ u: username, exp: Date.now() + TOKEN_LIFETIME_MS });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

// Verifies a token. Returns the decoded payload if valid, otherwise null.
function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const expectedSignature = sign(payloadB64);
  // Constant-time comparison to avoid timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (!payload.exp || Date.now() > payload.exp) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// Pulls the bearer token out of a request's Authorization header and verifies it.
// Returns the decoded payload if the caller is a valid, logged-in admin, else null.
function requireAdmin(event) {
  const header = event.headers.authorization || event.headers.Authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return verifyToken(match[1]);
}

function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

module.exports = { createToken, verifyToken, requireAdmin, jsonResponse };
