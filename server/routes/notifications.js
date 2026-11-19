/**
 * Notifications Route Handler
 */

const { db } = require('../db');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function handleGetNotifications(req, res) {
  const notifications = db.getNotifications();
  return sendJson(res, 200, {
    total: notifications.length,
    unread: notifications.filter((n) => n.unread).length,
    data: notifications,
    version: db.getVersion()
  });
}

function handleMarkRead(req, res, body) {
  const id = body?.id || null;
  const updated = db.markNotificationsRead(id);
  return sendJson(res, 200, {
    success: true,
    data: updated,
    version: db.getVersion()
  });
}

module.exports = {
  handleGetNotifications,
  handleMarkRead
};
