/**
 * FeedbackPro Server Entrypoint
 * Run with: node server.js
 */

const { startServer } = require('./server/index');

const PORT = process.env.PORT || 3000;
startServer(PORT);
