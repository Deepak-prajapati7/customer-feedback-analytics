/**
 * Authentication Route Handler
 */

const crypto = require('crypto');
const { db } = require('../db');

// In-memory session token map: token -> user
const activeSessions = new Map();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function handleLogin(req, res, body) {
  if (!body || !body.email || !body.password) {
    return sendJson(res, 400, { error: 'Email and password are required.' });
  }

  const user = db.findUser(body.email, body.password);
  if (!user) {
    return sendJson(res, 401, { error: 'Invalid email or password.' });
  }

  const token = `tok_${crypto.randomBytes(16).toString('hex')}`;
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  activeSessions.set(token, safeUser);

  return sendJson(res, 200, {
    success: true,
    token,
    user: safeUser
  });
}

function handleRegister(req, res, body) {
  if (!body || !body.email || !body.password || !body.name) {
    return sendJson(res, 400, { error: 'Name, email, and password are required.' });
  }

  const newUser = db.createUser({
    name: body.name,
    email: body.email,
    password: body.password,
    role: body.role || 'customer'
  });

  if (!newUser) {
    return sendJson(res, 409, { error: 'An account with this email already exists.' });
  }

  const token = `tok_${crypto.randomBytes(16).toString('hex')}`;
  const safeUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role
  };

  activeSessions.set(token, safeUser);

  return sendJson(res, 201, {
    success: true,
    token,
    user: safeUser
  });
}

function handleMe(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (token && activeSessions.has(token)) {
    return sendJson(res, 200, {
      isLoggedIn: true,
      user: activeSessions.get(token)
    });
  }

  return sendJson(res, 200, {
    isLoggedIn: false,
    user: null
  });
}

module.exports = {
  handleLogin,
  handleRegister,
  handleMe
};
