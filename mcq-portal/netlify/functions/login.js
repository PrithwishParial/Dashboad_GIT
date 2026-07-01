const { createToken, jsonResponse } = require('./_shared/auth');

// ============================================================
// ADMIN CREDENTIALS
// Change these before you deploy. This is the ONLY place the
// password needs to be set, and it never gets sent to the browser
// because this file only ever runs on Netlify's server, not the client.
//
// More secure alternative: instead of editing the lines below, set
// two environment variables in Netlify (Site settings > Environment
// variables) named ADMIN_USERNAME and ADMIN_PASSWORD. If they're
// set, they're used automatically and the lines below are ignored.
// ============================================================
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';            // <-- change this
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';     // <-- change this
// ============================================================

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid request body' });
  }

  const { username, password } = body;

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username !== ADMIN_USERNAME ||
    password !== ADMIN_PASSWORD
  ) {
    // Deliberately vague — never reveal whether the username or password was the wrong part
    return jsonResponse(401, { error: 'Incorrect username or password' });
  }

  const token = createToken(username);
  return jsonResponse(200, { token, expiresInHours: 4 });
};
