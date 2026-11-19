const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('--- Testing Response Actions in Reviews Table ---');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('feedbackpro_auth', JSON.stringify({
      isLoggedIn: true,
      email: 'admin@feedbackpro.io',
      name: 'Admin User',
      role: 'admin'
    }));
  });

  const page = await context.newPage();
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(500);

  // Switch to Reviews View
  await page.click('button[data-target="reviews-view"]');
  await page.waitForTimeout(400);

  // Inspect all rows in the reviews table
  const rows = await page.$$eval('#reviewsTableBody tr', (trs) => {
    return trs.map((tr) => {
      const customer = tr.querySelector('.customer-name')?.textContent.trim();
      const statusPill = tr.querySelector('.status-pill');
      const isResponded = statusPill?.classList.contains('status-responded');
      const actionButtons = Array.from(tr.querySelectorAll('.table-actions button')).map((btn) => ({
        text: btn.textContent.trim(),
        classes: btn.className,
        action: btn.dataset.action
      }));
      return { customer, isResponded, actionButtons };
    });
  });

  console.log(`Found ${rows.length} rows on page 1:`);
  let allCorrect = true;
  rows.forEach((r, idx) => {
    const hasEdit = r.actionButtons.some((b) => b.text.includes('Edit'));
    const hasReply = r.actionButtons.some((b) => b.text.includes('Reply'));
    const status = r.isResponded ? 'RESPONDED' : 'PENDING';
    console.log(` Row ${idx + 1} [${status}] (${r.customer}): Actions = ${r.actionButtons.map((b) => b.text || 'delete').join(', ')}`);

    if (r.isResponded) {
      if (!hasEdit || hasReply) {
        console.error(`  ERROR on row ${idx + 1}: Responded review should have Edit, but has hasEdit=${hasEdit}, hasReply=${hasReply}`);
        allCorrect = false;
      }
    } else {
      if (!hasReply || hasEdit) {
        console.error(`  ERROR on row ${idx + 1}: Pending review should have Reply, but has hasReply=${hasReply}, hasEdit=${hasEdit}`);
        allCorrect = false;
      }
    }
  });

  if (!allCorrect) {
    throw new Error('Action buttons mismatch detected!');
  }
  console.log('✔ All rows correctly display "Edit" for Responded and "Reply" for Pending!');

  // Test clicking "Reply" on first pending review
  console.log('\n--- Testing Reply on Pending review ---');
  const targetId = await page.$eval('#reviewsTableBody tr:has(.status-pending) .view-review-btn', el => el.dataset.id);
  const targetCustomer = await page.$eval(`#reviewsTableBody tr:has(.view-review-btn[data-id="${targetId}"]) .customer-name`, el => el.textContent.trim());
  console.log(`Replying to pending review [id=${targetId}] by ${targetCustomer}...`);

  await page.click(`.view-review-btn[data-id="${targetId}"]`);
  await page.waitForTimeout(300);

  // Click appreciation template
  await page.click('.template-chip[data-template="appreciation"]');
  await page.waitForTimeout(100);
  await page.click('#saveReplyBtn');
  await page.waitForTimeout(500);

  // Re-query the row fresh after re-rendering
  const updatedRow = await page.$(`#reviewsTableBody tr:has(.view-review-btn[data-id="${targetId}"])`);
  const updatedStatus = await updatedRow.$eval('.status-pill', (el) => el.textContent.trim());
  const updatedAction = await updatedRow.$eval('.view-review-btn', (el) => el.textContent.trim());
  console.log(`After replying: Status = "${updatedStatus}", Action button = "${updatedAction}"`);

  if (!updatedAction.includes('Edit')) {
    throw new Error(`Expected action button to switch to "Edit", but got "${updatedAction}"`);
  }
  console.log('✔ Action button successfully updated to "Edit" after review was responded!');

  // Test clicking "Edit" on this responded review
  console.log('\n--- Testing Edit on Responded review ---');
  await page.click(`.view-review-btn[data-id="${targetId}"]`);
  await page.waitForTimeout(300);

  const isComposerOpen = await page.$eval('#replyComposer', (el) => !el.classList.contains('collapsed'));
  console.log('Composer open on Edit click:', isComposerOpen);
  if (!isComposerOpen) {
    throw new Error('Expected reply composer to be open on Edit action!');
  }
  console.log('✔ Modal opened with response composer uncollapsed ready to edit!');

  // Close modal
  await page.click('#closeReviewModal');

  // Take screenshot of the updated reviews table
  await page.screenshot({ path: path.resolve('scratch/reviews_table_actions_verified.png') });
  console.log('\nSaved verification screenshot to scratch/reviews_table_actions_verified.png');

  console.log('--- ALL CHECKS PASSED SUCCESSFULLY! ---');
  await browser.close();
})();
