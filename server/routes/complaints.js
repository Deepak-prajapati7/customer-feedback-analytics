/**
 * Complaints Route Handler
 */

const { db } = require('../db');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function handleGetComplaints(req, res) {
  const complaints = db.getComplaints();
  return sendJson(res, 200, {
    total: complaints.length,
    data: complaints,
    version: db.getVersion()
  });
}

function handleSaveComplaints(req, res, body) {
  const list = Array.isArray(body) ? body : Array.isArray(body?.complaints) ? body.complaints : [];
  const saved = db.saveComplaints(list);
  return sendJson(res, 200, {
    success: true,
    data: saved,
    version: db.getVersion()
  });
}

module.exports = {
  handleGetComplaints,
  handleSaveComplaints
};
