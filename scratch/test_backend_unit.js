/**
 * FeedbackPro Backend Direct Unit & Integration Test
 * Tests DB, Sentiment Engine, and Route Handlers directly.
 */

const { EventEmitter } = require('events');
const { Readable } = require('stream');
const { db } = require('../server/db');
const { analyzeSentiment } = require('../server/sentiment');
const reviewsRoutes = require('../server/routes/reviews');
const analyticsRoutes = require('../server/routes/analytics');
const authRoutes = require('../server/routes/auth');
const notificationsRoutes = require('../server/routes/notifications');
const complaintsRoutes = require('../server/routes/complaints');
const settingsRoutes = require('../server/routes/settings');

// Mock HTTP Response
class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    Object.assign(this.headers, headers);
    return this;
  }

  end(data = '') {
    this.body += data;
    this.emit('finish');
    return this;
  }

  json() {
    try {
      return JSON.parse(this.body);
    } catch (_) {
      return null;
    }
  }
}

async function runTests() {
  console.log('--- Running FeedbackPro Backend Unit & Integration Tests ---');

  // 1. Sentiment Engine
  console.log('\n[1/8] Testing Sentiment & Urgency Analysis Engine...');
  const positive = analyzeSentiment('Amazing support and great product quality, highly satisfied!', 5);
  console.log('Positive Sentiment:', positive.sentiment, 'Score:', positive.score);
  if (positive.sentiment !== 'Positive' || positive.score <= 0) {
    throw new Error('Failed positive sentiment analysis');
  }

  const negative = analyzeSentiment('Terrible delivery delay, broken package, and awful service.', 1);
  console.log('Negative Sentiment:', negative.sentiment, 'Score:', negative.score);
  if (negative.sentiment !== 'Negative' || negative.score >= 0) {
    throw new Error('Failed negative sentiment analysis');
  }

  const urgent = analyzeSentiment('Urgent safety issue, immediate fraud risk!', 1);
  console.log('Urgent detection:', urgent.urgent);
  if (!urgent.urgent) {
    throw new Error('Failed urgent term detection');
  }
  console.log('✔ Sentiment & Urgency Engine verified!');

  // 2. Database Initialization
  console.log('\n[2/8] Testing DB Initialization & Seed Data...');
  const initialReviews = db.getReviews();
  console.log(`Initial reviews count: ${initialReviews.length}`);
  if (initialReviews.length < 30) {
    throw new Error('Expected at least 30 seed reviews');
  }
  console.log('✔ DB Seed Data verified!');

  // 3. Reviews CRUD & Reply Routes
  console.log('\n[3/8] Testing Reviews API Routes...');
  
  // Create
  const createRes = new MockResponse();
  reviewsRoutes.handleCreateReview({}, createRes, {
    customerName: 'Marcus Vance',
    email: 'marcus@example.com',
    product: 'SmartHub Pro',
    rating: 5,
    category: 'Product Quality',
    reviewTitle: 'Exceeded all expectations',
    reviewText: 'The quality is incredible and the team was amazingly helpful. Love this product!'
  });
  if (createRes.statusCode !== 201) throw new Error('Failed to create review');
  const created = createRes.json().data;
  console.log('✔ Created review:', created.id, created.customerName, `(Sentiment: ${created.sentiment})`);

  // Get by ID
  const getRes = new MockResponse();
  reviewsRoutes.handleGetReviewById({}, getRes, created.id);
  if (getRes.statusCode !== 200 || getRes.json().customerName !== 'Marcus Vance') {
    throw new Error('Failed to get review by ID');
  }
  console.log('✔ Retrieved created review by ID');

  // Reply
  const replyRes = new MockResponse();
  reviewsRoutes.handleReplyReview({}, replyRes, created.id, {
    reply: 'Thank you Marcus! We appreciate your support.',
    customerName: 'Marcus Vance'
  });
  if (replyRes.statusCode !== 200 || replyRes.json().data.responseStatus !== 'responded') {
    throw new Error('Failed to reply to review');
  }
  console.log('✔ Replied to review; responseStatus updated to responded');

  // Toggle status
  const toggleRes = new MockResponse();
  reviewsRoutes.handleToggleStatus({}, toggleRes, created.id, { responseStatus: 'pending' });
  if (toggleRes.statusCode !== 200 || toggleRes.json().data.responseStatus !== 'pending') {
    throw new Error('Failed to toggle review status');
  }
  console.log('✔ Toggled review status back to pending');

  // Filter query
  const queryRes = new MockResponse();
  reviewsRoutes.handleGetReviews({}, queryRes, { search: 'Marcus', rating: '5' });
  if (queryRes.statusCode !== 200 || queryRes.json().data.length === 0) {
    throw new Error('Failed to filter reviews by search & rating');
  }
  console.log('✔ Filtered reviews returned matching record');

  // Delete
  const delRes = new MockResponse();
  reviewsRoutes.handleDeleteReview({}, delRes, created.id);
  if (delRes.statusCode !== 200) throw new Error('Failed to delete review');
  console.log('✔ Deleted review successfully');

  // 4. Analytics Summary & CSV
  console.log('\n[4/8] Testing Analytics & CSV Export Routes...');
  const analyticsRes = new MockResponse();
  analyticsRoutes.handleGetSummary({}, analyticsRes);
  if (analyticsRes.statusCode !== 200) throw new Error('Failed to get analytics summary');
  const summary = analyticsRes.json();
  console.log(`✔ Summary metrics: AvgRating=${summary.averageRating}, NPS=${summary.npsScore}, ResponseRate=${summary.responseRate}%`);

  const csvRes = new MockResponse();
  analyticsRoutes.handleExportCsv({}, csvRes);
  if (csvRes.statusCode !== 200 || !csvRes.body.includes('Customer Name')) {
    throw new Error('Failed CSV export');
  }
  console.log('✔ CSV export output contains correct header rows');

  // 5. Auth Routes
  console.log('\n[5/8] Testing Auth Routes...');
  const loginRes = new MockResponse();
  authRoutes.handleLogin({}, loginRes, { email: 'admin@feedbackpro.io', password: 'admin123' });
  if (loginRes.statusCode !== 200 || loginRes.json().user.role !== 'admin') {
    throw new Error('Failed admin login');
  }
  console.log('✔ Admin login succeeded with token:', loginRes.json().token);

  const invalidLoginRes = new MockResponse();
  authRoutes.handleLogin({}, invalidLoginRes, { email: 'admin@feedbackpro.io', password: 'wrong' });
  if (invalidLoginRes.statusCode !== 401) {
    throw new Error('Expected 401 for wrong credentials');
  }
  console.log('✔ Invalid credentials rejected with 401');

  // Register new customer
  const regRes = new MockResponse();
  const testEmail = `test_${Date.now()}@example.com`;
  authRoutes.handleRegister({}, regRes, {
    name: 'New Customer',
    email: testEmail,
    password: 'password123',
    role: 'customer'
  });
  if (regRes.statusCode !== 201 || regRes.json().user.email !== testEmail) {
    throw new Error('Failed to register customer');
  }
  console.log('✔ Customer registration succeeded');

  // 6. Notifications Routes
  console.log('\n[6/8] Testing Notifications Routes...');
  const notifRes = new MockResponse();
  notificationsRoutes.handleGetNotifications({}, notifRes);
  if (notifRes.statusCode !== 200 || notifRes.json().total < 1) {
    throw new Error('Failed to get notifications');
  }
  console.log(`✔ Notifications retrieved: ${notifRes.json().total} total (${notifRes.json().unread} unread)`);

  const markRes = new MockResponse();
  notificationsRoutes.handleMarkRead({}, markRes, {});
  if (markRes.statusCode !== 200 || markRes.json().data.some((n) => n.unread)) {
    throw new Error('Failed to mark all notifications as read');
  }
  console.log('✔ Notifications marked as read');

  // 7. Complaints Routes
  console.log('\n[7/8] Testing Complaints Routes...');
  const compRes = new MockResponse();
  complaintsRoutes.handleGetComplaints({}, compRes);
  if (compRes.statusCode !== 200) throw new Error('Failed to get complaints');
  console.log(`✔ Complaints retrieved: ${compRes.json().total} complaints`);

  // 8. Settings Routes
  console.log('\n[8/8] Testing Settings Routes...');
  const settingsRes = new MockResponse();
  settingsRoutes.handleGetSettings({}, settingsRes);
  if (settingsRes.statusCode !== 200 || !settingsRes.json().data.theme) {
    throw new Error('Failed to get settings');
  }
  console.log('✔ Settings retrieved:', settingsRes.json().data.displayName, 'Theme:', settingsRes.json().data.theme);

  console.log('\n======================================================');
  console.log('🎉 ALL BACKEND COMPONENT TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
