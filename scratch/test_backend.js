/**
 * FeedbackPro Backend Full Test Suite
 */

const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const { startServer } = require('../server/index');

const TEST_PORT = 3344;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json !== null ? json : data
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting FeedbackPro Backend Server on port', TEST_PORT, '---');
  const server = await startServer(TEST_PORT, '127.0.0.1');

  try {
    // 1. Health check
    console.log('\n[1/10] Testing GET /api/health...');
    const health = await request('/api/health');
    if (health.status !== 200 || health.data.status !== 'ok') {
      throw new Error(`Health check failed: ${JSON.stringify(health)}`);
    }
    console.log('✔ Health OK:', health.data);

    // 2. Bootstrap
    console.log('\n[2/10] Testing GET /api/bootstrap...');
    const bootstrap = await request('/api/bootstrap');
    if (bootstrap.status !== 200 || !Array.isArray(bootstrap.data.reviews)) {
      throw new Error(`Bootstrap failed: ${JSON.stringify(bootstrap)}`);
    }
    console.log(`✔ Bootstrap OK: ${bootstrap.data.reviews.length} reviews, version=${bootstrap.data.version}`);

    // 3. Create review via API
    console.log('\n[3/10] Testing POST /api/reviews (Sentiment Analysis & Urgency Engine)...');
    const newReviewPayload = {
      customerName: 'Marcus Vance',
      email: 'marcus@example.com',
      product: 'SmartHub Pro',
      rating: 5,
      category: 'Product Quality',
      reviewTitle: 'Exceeded all expectations',
      reviewText: 'The quality is incredible and the team was amazingly helpful. Love this product!'
    };
    const createRes = await request('/api/reviews', { method: 'POST', body: newReviewPayload });
    if (createRes.status !== 201 || !createRes.data.success) {
      throw new Error(`Create review failed: ${JSON.stringify(createRes)}`);
    }
    const createdReview = createRes.data.data;
    console.log(`✔ Created review ID: ${createdReview.id}`);
    console.log(`✔ Sentiment: ${createdReview.sentiment} (Score: ${createdReview.sentimentScore})`);
    if (createdReview.sentiment !== 'Positive' || createdReview.sentimentScore <= 0) {
      throw new Error('Sentiment score expectation failed for positive text');
    }

    // 4. Single review & Reply API
    console.log('\n[4/10] Testing POST /api/reviews/:id/reply...');
    const replyRes = await request(`/api/reviews/${createdReview.id}/reply`, {
      method: 'POST',
      body: { reply: 'Thank you Marcus! We appreciate your wonderful feedback.', customerName: 'Marcus' }
    });
    if (replyRes.status !== 200 || replyRes.data.data.responseStatus !== 'responded') {
      throw new Error(`Reply failed: ${JSON.stringify(replyRes)}`);
    }
    console.log('✔ Review reply verified, responseStatus is now responded');

    // 5. Analytics summary
    console.log('\n[5/10] Testing GET /api/analytics/summary...');
    const analytics = await request('/api/analytics/summary');
    if (analytics.status !== 200 || typeof analytics.data.averageRating !== 'number') {
      throw new Error(`Analytics failed: ${JSON.stringify(analytics)}`);
    }
    console.log(`✔ Analytics OK: Total=${analytics.data.totalReviews}, AvgRating=${analytics.data.averageRating}, NPS=${analytics.data.npsScore}`);

    // 6. CSV Export
    console.log('\n[6/10] Testing GET /api/analytics/export/csv...');
    const csv = await request('/api/analytics/export/csv');
    if (csv.status !== 200 || !csv.headers['content-type'].includes('text/csv')) {
      throw new Error(`CSV export failed: ${JSON.stringify(csv)}`);
    }
    console.log('✔ CSV Export OK, headers verified');

    // 7. Authentication
    console.log('\n[7/10] Testing POST /api/auth/login...');
    const loginOk = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@feedbackpro.io', password: 'admin123' }
    });
    if (loginOk.status !== 200 || !loginOk.data.token || loginOk.data.user.role !== 'admin') {
      throw new Error(`Login failed: ${JSON.stringify(loginOk)}`);
    }
    console.log('✔ Admin login OK, token received');

    const loginFail = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@feedbackpro.io', password: 'wrongpassword' }
    });
    if (loginFail.status !== 401) {
      throw new Error('Expected 401 for wrong credentials');
    }
    console.log('✔ Invalid credentials rejected with 401');

    // 8. Static file serving
    console.log('\n[8/10] Testing Static Asset Server...');
    const indexHtml = await request('/index.html');
    if (indexHtml.status !== 200 || !indexHtml.headers['content-type'].includes('text/html')) {
      throw new Error('Static index.html serving failed');
    }
    const customerHtml = await request('/customer.html');
    if (customerHtml.status !== 200) {
      throw new Error('Static customer.html serving failed');
    }
    console.log('✔ Static HTML pages served with 200 OK and valid MIME types');

    // 9. End-to-end browser test with Playwright
    console.log('\n[9/10] Testing End-to-End Client Sync with Playwright...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // Open Customer Portal
    await page.goto(`${BASE_URL}/customer.html`);
    await page.waitForLoadState('networkidle');

    // Check browse section
    const title = await page.title();
    console.log('Customer Portal Title:', title);

    // Switch to Write a Review tab
    await page.click('button[data-portal-tab="write"]');
    await page.waitForSelector('#portalWriteView.active');

    // Fill review form
    await page.fill('#portalName', 'Elena Rostova');
    await page.fill('#portalEmail', 'elena@example.com');
    await page.selectOption('#portalProduct', 'SmartHub Pro');
    await page.click('#portalStarRating [data-value="5"]');
    await page.fill('#portalReviewTitle', 'Seamless server sync');
    await page.fill('#portalReviewText', 'The real-time synchronization between portals and backend works flawlessly!');
    
    // Submit review
    await page.click('#portalSubmitBtn');
    await page.waitForSelector('.toast', { timeout: 5000 });
    console.log('✔ Submitted review via Customer Portal UI');

    // Wait 500ms for backend write
    await new Promise((r) => setTimeout(r, 600));

    // Open Admin Portal
    const adminPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await adminPage.addInitScript(() => {
      localStorage.setItem('feedbackpro_auth', JSON.stringify({
        isLoggedIn: true,
        role: 'admin',
        user: { id: 'admin_1', name: 'Alex Morgan', email: 'alex@feedbackpro.io', role: 'admin' }
      }));
    });
    await adminPage.goto(`${BASE_URL}/index.html`);
    await adminPage.waitForLoadState('networkidle');

    // Navigate to Reviews table
    await adminPage.click('a[data-view="reviews"]');
    await adminPage.waitForSelector('#reviewsTableBody tr');

    const tableContent = await adminPage.textContent('#reviewsTableBody');
    if (!tableContent.includes('Elena Rostova') || !tableContent.includes('Seamless server sync')) {
      throw new Error('Submitted review from Customer Portal did not sync to Admin Portal!');
    }
    console.log('✔ Verified Elena Rostova review appeared in Admin Portal table in real-time!');

    await browser.close();

    // 10. Clean up / Delete created review
    console.log('\n[10/10] Testing DELETE /api/reviews/:id...');
    const delRes = await request(`/api/reviews/${createdReview.id}`, { method: 'DELETE' });
    if (delRes.status !== 200) {
      throw new Error(`Delete failed: ${JSON.stringify(delRes)}`);
    }
    console.log('✔ Review deleted cleanly');

    console.log('\n=========================================');
    console.log('🎉 ALL 10 BACKEND TESTS PASSED PERFECTLY!');
    console.log('=========================================');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
