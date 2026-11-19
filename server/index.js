/**
 * FeedbackPro Analytics — Backend Server
 * Production-ready zero-dependency Node.js HTTP & REST server
 */

const http = require('http');
const { parse: parseUrl } = require('url');
const { db } = require('./db');
const { serveStatic } = require('./middleware/static');
const reviewsRoutes = require('./routes/reviews');
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');
const notificationsRoutes = require('./routes/notifications');
const complaintsRoutes = require('./routes/complaints');
const settingsRoutes = require('./routes/settings');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let bodyStr = '';
    req.on('data', (chunk) => {
      bodyStr += chunk.toString();
      // Enforce 15MB limit
      if (bodyStr.length > 15 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!bodyStr.trim()) return resolve({});
      try {
        resolve(JSON.parse(bodyStr));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Global CORS handling
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  const parsedUrl = parseUrl(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  const query = parsedUrl.query;
  const method = req.method.toUpperCase();

  // Parse JSON body for mutation methods
  let body = {};
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      body = await parseJsonBody(req);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // --- API Routes ---
  if (pathname.startsWith('/api')) {
    try {
      // Health check
      if (pathname === '/api/health' && method === 'GET') {
        return sendJson(res, 200, {
          status: 'ok',
          uptime: process.uptime(),
          version: db.getVersion(),
          totalReviews: db.getReviews().length
        });
      }

      // Bootstrap & Real-time Sync
      if (pathname === '/api/bootstrap' && method === 'GET') {
        return sendJson(res, 200, {
          version: db.getVersion(),
          reviews: db.getReviews(),
          notifications: db.getNotifications(),
          complaints: db.getComplaints(),
          settings: db.getSettings()
        });
      }

      if (pathname === '/api/sync-state' && method === 'GET') {
        const fullDb = db.getDb();
        return sendJson(res, 200, {
          version: fullDb.version,
          lastModified: fullDb.lastModified,
          count: fullDb.reviews.length
        });
      }

      // Reviews API
      if (pathname === '/api/reviews') {
        if (method === 'GET') return reviewsRoutes.handleGetReviews(req, res, query);
        if (method === 'POST') return reviewsRoutes.handleCreateReview(req, res, body);
        if (method === 'DELETE') return reviewsRoutes.handleClearReviews(req, res);
      }

      if (pathname === '/api/reviews/import' && method === 'POST') {
        return reviewsRoutes.handleImportReviews(req, res, body);
      }

      if (pathname === '/api/admin/reset-sample' && method === 'POST') {
        return reviewsRoutes.handleResetSample(req, res);
      }

      // Single Review Endpoints: /api/reviews/:id
      const reviewMatch = pathname.match(/^\/api\/reviews\/([^/]+)$/);
      if (reviewMatch) {
        const reviewId = decodeURIComponent(reviewMatch[1]);
        if (method === 'GET') return reviewsRoutes.handleGetReviewById(req, res, reviewId);
        if (method === 'PUT') return reviewsRoutes.handleUpdateReview(req, res, reviewId, body);
        if (method === 'DELETE') return reviewsRoutes.handleDeleteReview(req, res, reviewId);
      }

      // Single Review Sub-endpoints
      const replyMatch = pathname.match(/^\/api\/reviews\/([^/]+)\/reply$/);
      if (replyMatch && method === 'POST') {
        const reviewId = decodeURIComponent(replyMatch[1]);
        return reviewsRoutes.handleReplyReview(req, res, reviewId, body);
      }

      const statusMatch = pathname.match(/^\/api\/reviews\/([^/]+)\/status$/);
      if (statusMatch && (method === 'PATCH' || method === 'POST')) {
        const reviewId = decodeURIComponent(statusMatch[1]);
        return reviewsRoutes.handleToggleStatus(req, res, reviewId, body);
      }

      // Complaints API
      if (pathname === '/api/complaints') {
        if (method === 'GET') return complaintsRoutes.handleGetComplaints(req, res);
        if (method === 'PUT' || method === 'POST') return complaintsRoutes.handleSaveComplaints(req, res, body);
      }

      // Notifications API
      if (pathname === '/api/notifications' && method === 'GET') {
        return notificationsRoutes.handleGetNotifications(req, res);
      }
      if (pathname === '/api/notifications/read' && method === 'POST') {
        return notificationsRoutes.handleMarkRead(req, res, body);
      }

      // Settings API
      if (pathname === '/api/settings') {
        if (method === 'GET') return settingsRoutes.handleGetSettings(req, res);
        if (method === 'PUT' || method === 'POST') return settingsRoutes.handleSaveSettings(req, res, body);
      }

      // Auth API
      if (pathname === '/api/auth/login' && method === 'POST') {
        return authRoutes.handleLogin(req, res, body);
      }
      if (pathname === '/api/auth/register' && method === 'POST') {
        return authRoutes.handleRegister(req, res, body);
      }
      if (pathname === '/api/auth/me' && method === 'GET') {
        return authRoutes.handleMe(req, res);
      }

      // Analytics API
      if (pathname === '/api/analytics/summary' && method === 'GET') {
        return analyticsRoutes.handleGetSummary(req, res);
      }
      if (pathname === '/api/analytics/export/csv' && method === 'GET') {
        return analyticsRoutes.handleExportCsv(req, res);
      }

      // 404 for unhandled API route
      return sendJson(res, 404, { error: `Endpoint not found: ${method} ${pathname}` });
    } catch (apiErr) {
      console.error('API Error:', apiErr);
      return sendJson(res, 500, { error: 'Internal server error', details: apiErr.message });
    }
  }

  // --- Static Asset Serving ---
  const served = serveStatic(req, res, parsedUrl.pathname);
  if (!served) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head><title>404 Not Found</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;">
          <h1>404 Not Found</h1>
          <p>The requested resource <code>${pathname}</code> was not found.</p>
          <p><a href="/">Return to Dashboard</a> | <a href="/customer.html">Customer Portal</a></p>
        </body>
      </html>
    `);
  }
});

function startServer(port = PORT, host = HOST) {
  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      console.log(`=======================================================`);
      console.log(`🚀 FeedbackPro Backend Server running!`);
      console.log(`👉 Admin Portal:      http://localhost:${port}/index.html`);
      console.log(`👉 Customer Portal:   http://localhost:${port}/customer.html`);
      console.log(`👉 Login:             http://localhost:${port}/login.html`);
      console.log(`👉 API Health:        http://localhost:${port}/api/health`);
      console.log(`=======================================================`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  server,
  startServer
};
