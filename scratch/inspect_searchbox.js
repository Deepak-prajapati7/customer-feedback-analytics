const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem('feedbackpro_auth', JSON.stringify({
      isLoggedIn: true,
      role: 'admin',
      user: { id: 'admin_1', name: 'Alex Morgan', email: 'alex@feedbackpro.io', role: 'admin' }
    }));
  });

  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForLoadState('networkidle');

  const boxStyles = await page.$eval('.searchbox', el => {
    const s = window.getComputedStyle(el);
    return {
      border: s.border,
      borderRadius: s.borderRadius,
      background: s.backgroundColor,
      boxShadow: s.boxShadow,
      padding: s.padding,
      width: s.width,
      height: s.height
    };
  });

  const inputStyles = await page.$eval('.searchbox input', el => {
    const s = window.getComputedStyle(el);
    return {
      border: s.border,
      borderRadius: s.borderRadius,
      background: s.backgroundColor,
      boxShadow: s.boxShadow,
      padding: s.padding,
      width: s.width,
      height: s.height
    };
  });

  console.log('--- .searchbox computed styles ---');
  console.log(boxStyles);
  console.log('--- .searchbox input computed styles ---');
  console.log(inputStyles);

  const boxRect = await page.$eval('.searchbox', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x - 20, y: r.y - 10, width: r.width + 40, height: r.height + 20 };
  });

  await page.screenshot({
    path: path.resolve(__dirname, 'searchbox_inspect.png'),
    clip: boxRect
  });
  console.log('Saved screenshot to scratch/searchbox_inspect.png at', boxRect);

  await browser.close();
})();
