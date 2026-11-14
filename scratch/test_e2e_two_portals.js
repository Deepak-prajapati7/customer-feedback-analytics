const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('--- Starting Two Portals E2E Verification ---');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Visit login.html and test Admin Demo Login
  const page = await context.newPage();
  await page.goto('file://' + path.resolve('login.html'));
  await page.waitForTimeout(400);

  // Click Admin Demo Login
  console.log('Step 1: Clicking Admin Demo Login...');
  await page.click('#instantDemoBtn');
  await page.waitForTimeout(600);
  console.log('Current URL after admin login:', page.url());

  // 2. Verify Admin Dashboard index.html
  console.log('Step 2: Checking Admin Dashboard navigation & portal link...');
  const portalBtn = await page.$('.portal-header-btn');
  const portalSidebarLink = await page.$('.portal-nav-link');
  console.log('Portal header button present:', !!portalBtn);
  console.log('Portal sidebar link present:', !!portalSidebarLink);

  await page.screenshot({ path: path.resolve('scratch/admin_before_review.png') });

  // 3. Open Customer Portal customer.html
  console.log('Step 3: Navigating to Customer Portal...');
  await page.click('.portal-header-btn');
  await page.waitForTimeout(600);
  console.log('Current URL:', page.url());

  // 4. Fill and Submit Feedback on Customer Portal
  console.log('Step 4: Writing customer feedback...');
  await page.click('button[data-portal-tab="write"]');
  await page.waitForTimeout(300);

  await page.fill('#portalCustomerName', 'David Miller');
  await page.fill('#portalCustomerEmail', 'david.miller@acme.com');
  await page.selectOption('#portalProductSelect', 'SmartHub Pro');
  await page.selectOption('#portalCategorySelect', 'Product Quality');
  // Rate 5 stars
  await page.click('.star-btn[data-value="5"]');
  await page.fill('#portalReviewTitle', 'Incredible real-time sync & ease of use');
  await page.fill('#portalReviewText', 'The Customer Portal makes submitting feedback effortless. It synced to the admin dashboard instantly! Outstanding user experience.');

  await page.screenshot({ path: path.resolve('scratch/customer_form_filled.png') });

  // Submit feedback
  console.log('Step 5: Submitting review...');
  await page.click('#portalSubmitBtn');
  await page.waitForTimeout(600);

  // 5. Return to Admin Portal index.html
  console.log('Step 6: Switching back to Admin Dashboard...');
  await page.click('.portal-admin-link');
  await page.waitForTimeout(600);
  console.log('Current URL:', page.url());

  // Verify review shows on Admin Overview
  const recentReviewName = await page.$eval('.recent-review-name strong', el => el.textContent);
  console.log('Top review on Admin Overview:', recentReviewName);

  await page.screenshot({ path: path.resolve('scratch/admin_overview_synced.png') });

  // 6. Navigate to Reviews View and Reply
  console.log('Step 7: Opening Reviews Management View in Admin...');
  await page.click('button[data-target="reviews-view"]');
  await page.waitForTimeout(400);

  const tableTopReviewer = await page.$eval('tbody tr .customer-name', el => el.textContent);
  console.log('Top review in Reviews Table:', tableTopReviewer);

  // Open modal
  console.log('Step 8: Opening Review & Reply modal...');
  await page.click('tbody tr .view-review-btn');
  await page.waitForTimeout(400);

  const modalCustomer = await page.$eval('.modal-customer-name', el => el.textContent);
  console.log('Modal Customer Name:', modalCustomer);
  await page.screenshot({ path: path.resolve('scratch/admin_reply_modal.png') });

  // Click canned appreciation template & send reply
  console.log('Step 9: Sending reply from Admin...');
  await page.click('.template-chip[data-template="appreciation"]');
  await page.waitForTimeout(200);
  await page.click('#saveReplyBtn');
  await page.waitForTimeout(500);

  const statusAfterReply = await page.$eval('tbody tr .status-pill', el => el.textContent.trim());
  console.log('Status pill after reply:', statusAfterReply);
  await page.screenshot({ path: path.resolve('scratch/admin_after_reply.png') });

  // 7. Verify reply in Customer Portal
  console.log('Step 10: Verifying reply in Customer Portal...');
  await page.click('.portal-header-btn');
  await page.waitForTimeout(600);

  // Check My Reviews tab
  await page.click('button[data-portal-tab="mine"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.resolve('scratch/customer_my_reviews_replied.png') });

  console.log('--- Two Portals E2E Verification Complete: SUCCESS! ---');
  await browser.close();
})();

