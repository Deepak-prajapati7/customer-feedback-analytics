/**
 * Settings Route Handler
 */

const { db } = require('../db');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function handleGetSettings(req, res) {
  const settings = db.getSettings();
  return sendJson(res, 200, {
    data: settings,
    version: db.getVersion()
  });
}

function handleSaveSettings(req, res, body) {
  if (!body) {
    return sendJson(res, 400, { error: 'Settings object required.' });
  }
  const updated = db.saveSettings(body);
  return sendJson(res, 200, {
    success: true,
    data: updated,
    version: db.getVersion()
  });
}

module.exports = {
  handleGetSettings,
  handleSaveSettings
};
