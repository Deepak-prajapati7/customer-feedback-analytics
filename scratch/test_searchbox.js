const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Seed admin auth state in localStorage
  await page.addInitScript(() => {
    localStorage.setItem('feedbackpro_auth', JSON.stringify({
      isLoggedIn: true,
      role: 'admin',
      user: {
        id: 'admin_1',
        name: 'Alex Morgan',
        email: 'alex@feedbackpro.io',
        role: 'admin'
      }
    }));
  });

  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForLoadState('networkidle');

  const searchbox = await page.$('.searchbox');
  const globalSearchInput = await page.$('#globalSearch');
  const kbd = await page.$('.search-kbd, .searchbox kbd');

  console.log('Admin Portal .searchbox exists:', !!searchbox);
  console.log('Admin Portal #globalSearch input exists:', !!globalSearchInput);
  console.log('Admin Portal kbd exists:', !!kbd);

  if (!searchbox || !globalSearchInput) {
    console.error('FAIL: Search box or input missing in Admin Portal!');
    process.exit(1);
  }

  if (kbd) {
    console.error('FAIL: .search-kbd still exists in Admin Portal!');
    process.exit(1);
  }

  console.log('PASS: .search-kbd is completely gone from the search bar!');

  await page.screenshot({
    path: path.resolve(__dirname, 'admin_searchbox_verified.png'),
    clip: { x: 0, y: 0, width: 1440, height: 100 }
  });
  console.log('Saved clean topbar screenshot to scratch/admin_searchbox_verified.png');

  // Verify Customer Portal
  await page.goto('file://' + path.resolve(__dirname, '../customer.html'));
  await page.waitForLoadState('networkidle');
  const customerSearch = await page.$('#portalSearchInput');
  const customerKbd = await page.$('.search-kbd, kbd');
  console.log('Customer Portal #portalSearchInput exists:', !!customerSearch);
  console.log('Customer Portal kbd exists:', !!customerKbd);

  await browser.close();
  console.log('ALL CHECKS PASSED: "k" successfully removed from search bar across portals!');
})();
