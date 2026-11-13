const COMPLAINTS_KEY = 'feedbackpro_complaints';
let pendingImportRows = [];

function getComplaints() {
  try {
    const stored = JSON.parse(localStorage.getItem(COMPLAINTS_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.error('Unable to read complaint records.', error);
    showToast('Complaint data could not be read from this browser.', 'error');
    return [];
  }
}

function saveComplaints(complaints) {
  try {
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(complaints));
    if (typeof syncSaveComplaints === 'function') syncSaveComplaints(complaints);
    return true;
  } catch (error) {
    console.error('Unable to save complaint records.', error);
    showToast('Complaint changes could not be saved. Check available browser storage.', 'error');
    return false;
  }
}

function renderComplaints() {
  const tbody = document.getElementById('complaintsTableBody');
  const summary = document.getElementById('complaintSummary');
  if (!tbody || !summary) return;
  const complaints = getComplaints().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const openCount = complaints.filter((item) => item.status !== 'Resolved').length;
  const urgentCount = complaints.filter((item) => item.priority === 'Urgent' && item.status !== 'Resolved').length;
  summary.innerHTML = `
    <div class="complaint-stat"><span>Tracked issues</span><strong>${complaints.length}</strong></div>
    <div class="complaint-stat"><span>Open</span><strong>${openCount}</strong></div>
    <div class="complaint-stat"><span>Urgent open</span><strong>${urgentCount}</strong></div>
  `;
  if (!complaints.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No complaints tracked yet. Use “Create from negative reviews” to start from your actual feedback.</div></td></tr>';
    return;
  }
  tbody.innerHTML = complaints.map((issue) => `
    <tr>
      <td><strong>${escapeHtml(issue.title)}</strong><small class="complaint-description">${escapeHtml(issue.description)}</small></td>
      <td>${escapeHtml(issue.customerName)}<small class="complaint-description">${escapeHtml(issue.product)}</small></td>
      <td><select class="complaint-field priority-field" data-id="${escapeHtml(issue.id)}" data-field="priority" aria-label="Priority for ${escapeHtml(issue.title)}">
        ${['Low', 'Medium', 'High', 'Urgent'].map((value) => `<option ${issue.priority === value ? 'selected' : ''}>${value}</option>`).join('')}
      </select></td>
      <td><input class="complaint-field assignee-field" data-id="${escapeHtml(issue.id)}" data-field="assignee" value="${escapeHtml(issue.assignee || '')}" placeholder="Assign owner" aria-label="Assignee for ${escapeHtml(issue.title)}" /></td>
      <td><select class="complaint-field status-field" data-id="${escapeHtml(issue.id)}" data-field="status" aria-label="Status for ${escapeHtml(issue.title)}">
        ${['Open', 'In progress', 'Resolved'].map((value) => `<option ${issue.status === value ? 'selected' : ''}>${value}</option>`).join('')}
      </select></td>
      <td>${escapeHtml(formatDate(issue.createdAt))}</td>
    </tr>
  `).join('');
}

function createComplaintsFromReviews() {
  const reviews = getReviews().filter((review) => review.sentiment === 'Negative');
  const complaints = getComplaints();
  const existingReviewIds = new Set(complaints.map((item) => item.reviewId));
  const createdAt = new Date().toISOString();
  const additions = reviews.filter((review) => !existingReviewIds.has(review.id)).map((review) => {
    const analysis = analyzeSentiment(review.reviewText, review.rating);
    const priority = analysis.urgent ? 'Urgent' : Number(review.rating) <= 2 ? 'High' : 'Medium';
    const topic = analysis.topics[0];
    return {
      id: generateId(),
      reviewId: review.id,
      title: review.reviewTitle || `${topic || 'Customer'} complaint`,
      description: review.reviewText || '',
      customerName: review.customerName || 'Anonymous',
      product: review.product || 'Unspecified',
      priority,
      assignee: '',
      status: 'Open',
      createdAt
    };
  });
  if (!additions.length) {
    showToast(reviews.length ? 'Every negative review is already tracked.' : 'No negative reviews are available to track.', 'info');
    return;
  }
  if (!saveComplaints([...complaints, ...additions])) return;
  renderComplaints();
  showToast(`${additions.length} complaint${additions.length === 1 ? '' : 's'} created from negative reviews.`, 'success');
}

function updateComplaint(event) {
  const field = event.target.closest('.complaint-field');
  if (!field) return;
  const complaints = getComplaints();
  const complaint = complaints.find((item) => item.id === field.dataset.id);
  if (!complaint) return;
  complaint[field.dataset.field] = field.value.trim();
  if (!saveComplaints(complaints)) return;
  renderComplaints();
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) records.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error('The CSV file contains an unterminated quoted field.');
  row.push(cell);
  if (row.some((value) => value.trim())) records.push(row);
  return records;
}

function normalizeHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pickColumn(row, headers, aliases) {
  const index = headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
  return index < 0 ? '' : String(row[index] ?? '').trim();
}

function readCsvRows(text) {
  const records = parseCsv(text);
  if (records.length < 2) throw new Error('The file has no feedback rows.');
  const headers = records[0];
  return records.slice(1).map((row, index) => normalizeImportedRow({
    customerName: pickColumn(row, headers, ['customername', 'customer', 'name']),
    email: pickColumn(row, headers, ['email', 'emailaddress']),
    product: pickColumn(row, headers, ['product', 'service', 'productname']),
    category: pickColumn(row, headers, ['category', 'feedbackcategory', 'topic']),
    rating: pickColumn(row, headers, ['rating', 'stars', 'score']),
    reviewTitle: pickColumn(row, headers, ['reviewtitle', 'title', 'subject']),
    reviewText: pickColumn(row, headers, ['reviewtext', 'review', 'feedback', 'comment', 'text']),
    createdAt: pickColumn(row, headers, ['date', 'createdat', 'timestamp'])
  }, index));
}

function normalizeImportedRow(row, index) {
  const rating = Number(row.rating);
  const reviewText = String(row.reviewText || '').trim();
  const date = row.createdAt ? new Date(row.createdAt) : new Date();
  const errors = [];
  if (!reviewText) errors.push('review text is required');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.push('rating must be 1–5');
  if (row.createdAt && Number.isNaN(date.getTime())) errors.push('date is invalid');
  const review = {
    id: generateId(),
    customerName: String(row.customerName || 'Anonymous').trim(),
    email: String(row.email || '').trim(),
    product: String(row.product || 'Unspecified').trim(),
    category: String(row.category || 'Other').trim(),
    rating,
    reviewTitle: String(row.reviewTitle || reviewText.slice(0, 60)).trim(),
    reviewText,
    recommendation: rating >= 4 ? 'Yes' : rating <= 2 ? 'No' : 'Maybe',
    createdAt: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
    responseStatus: 'pending',
    reply: '',
    replyDate: ''
  };
  const analysis = analyzeSentiment(review.reviewText, review.rating);
  return { ...review, ...analysis, rowNumber: index + 2, importError: errors.join('; ') };
}

function isDuplicateReview(review, reviews) {
  const signature = (item) => [item.customerName, item.product, item.reviewText]
    .map((value) => String(value || '').trim().toLowerCase()).join('|');
  return reviews.some((existing) => signature(existing) === signature(review));
}

function renderImportPreview() {
  const tbody = document.getElementById('importPreviewBody');
  const wrap = document.getElementById('importPreviewWrap');
  const actions = document.getElementById('importActions');
  const count = document.getElementById('importCount');
  const status = document.getElementById('importStatus');
  if (!tbody || !wrap || !actions || !count || !status) return;
  const reviews = getReviews();
  const known = [...reviews];
  const classified = pendingImportRows.map((row) => {
    const duplicate = !row.importError && isDuplicateReview(row, known);
    if (!duplicate && !row.importError) known.push(row);
    return { ...row, duplicate };
  });
  const validCount = classified.filter((row) => !row.importError && !row.duplicate).length;
  tbody.innerHTML = classified.slice(0, 100).map((row) => `
    <tr>
      <td>${escapeHtml(row.customerName)}</td>
      <td>${escapeHtml(row.product)}</td>
      <td>${row.rating >= 1 && row.rating <= 5 ? row.rating : '—'}</td>
      <td title="${escapeHtml(row.reviewText)}">${escapeHtml(row.reviewText.slice(0, 100))}</td>
      <td><span class="${getSentimentClass(row.sentiment)}">${escapeHtml(row.sentiment)}</span></td>
      <td class="${row.importError || row.duplicate ? 'import-invalid' : 'import-valid'}">${row.importError ? `Invalid: ${escapeHtml(row.importError)}` : row.duplicate ? 'Duplicate' : 'Ready'}</td>
    </tr>
  `).join('');
  wrap.hidden = false;
  actions.hidden = false;
  count.textContent = `${validCount} ready · ${classified.filter((row) => row.duplicate).length} duplicates · ${classified.filter((row) => row.importError).length} invalid`;
  status.textContent = classified.length > 100 ? `Showing the first 100 of ${classified.length} rows.` : `${classified.length} rows previewed.`;
  document.getElementById('confirmImportBtn').disabled = validCount === 0;
  pendingImportRows = classified;
}

async function loadImportFile(file) {
  const status = document.getElementById('importStatus');
  if (!file) return;
  pendingImportRows = [];
  if (file.size > 10 * 1024 * 1024) {
    status.textContent = 'File is larger than 10 MB. Choose a smaller file.';
    return;
  }
  try {
    const extension = file.name.split('.').pop().toLowerCase();
    let rows;
    if (extension === 'csv') {
      rows = readCsvRows(await file.text());
    } else if (['xlsx', 'xls'].includes(extension) && window.XLSX) {
      const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error('The workbook does not contain a worksheet.');
      const records = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
      if (records.length < 2) throw new Error('The selected worksheet has no feedback rows.');
      const headers = records[0];
      rows = records.slice(1).map((row, index) => normalizeImportedRow({
        customerName: pickColumn(row, headers, ['customername', 'customer', 'name']),
        email: pickColumn(row, headers, ['email', 'emailaddress']),
        product: pickColumn(row, headers, ['product', 'service', 'productname']),
        category: pickColumn(row, headers, ['category', 'feedbackcategory', 'topic']),
        rating: pickColumn(row, headers, ['rating', 'stars', 'score']),
        reviewTitle: pickColumn(row, headers, ['reviewtitle', 'title', 'subject']),
        reviewText: pickColumn(row, headers, ['reviewtext', 'review', 'feedback', 'comment', 'text']),
        createdAt: pickColumn(row, headers, ['date', 'createdat', 'timestamp'])
      }, index));
    } else if (['xlsx', 'xls'].includes(extension)) {
      throw new Error('Excel import is unavailable because the spreadsheet library did not load. Use CSV or reconnect to the internet.');
    } else {
      throw new Error('Choose a CSV, XLSX, or XLS file.');
    }
    if (rows.length > 5000) throw new Error('This file has more than 5,000 rows. Split it into smaller files.');
    pendingImportRows = rows;
    renderImportPreview();
  } catch (error) {
    console.error('Feedback import preview failed.', error);
    status.textContent = error.message || 'The selected file could not be read.';
    showToast(status.textContent, 'error');
  }
}

function confirmFeedbackImport() {
  const readyRows = pendingImportRows.filter((row) => !row.importError && !row.duplicate);
  if (!readyRows.length) return;
  const reviews = getReviews();
  const cleanRows = readyRows.map(({ rowNumber, importError, duplicate, ...review }) => review);
  if (!saveReviews([...cleanRows, ...reviews])) return;
  if (typeof syncImportReviews === 'function') syncImportReviews(cleanRows);
  pendingImportRows = [];
  document.getElementById('feedbackFileInput').value = '';
  document.getElementById('importPreviewWrap').hidden = true;
  document.getElementById('importActions').hidden = true;
  document.getElementById('importStatus').textContent = `Imported ${cleanRows.length} feedback records.`;
  renderDashboard();
  renderReviewsTable(getReviews());
  showToast(`${cleanRows.length} feedback records imported.`, 'success');
}

function buildCopilotAnswer(question) {
  const reviews = getReviews();
  if (!reviews.length) return { text: 'There are no feedback records in this workspace yet. Import a CSV or add feedback before asking a question.', evidence: [] };
  const query = question.toLowerCase();
  const negative = reviews.filter((review) => review.sentiment === 'Negative');
  const sentimentTotals = getSentimentSummary(reviews);
  let answer;
  let evidence = [];

  if (/\b(lowest|worst|least|bottom)\b/.test(query) && /product|rating|rated/.test(query)) {
    const ranked = getTopProducts(reviews).map((product) => ({
      ...product,
      count: reviews.filter((review) => review.product === product.product).length
    })).sort((a, b) => a.avg - b.avg);
    const lowest = ranked[0];
    answer = lowest
      ? `${lowest.product} has the lowest average rating in this dataset: ${lowest.avg}/5 across ${lowest.count} review${lowest.count === 1 ? '' : 's'}.`
      : 'There are not enough product ratings to compare.';
    evidence = reviews.filter((review) => review.product === lowest?.product).slice(0, 3);
  } else if (/\b(highest|best|top)\b/.test(query) && /product|rating|rated/.test(query)) {
    const ranked = getTopProducts(reviews).map((product) => ({
      ...product,
      count: reviews.filter((review) => review.product === product.product).length
    })).sort((a, b) => b.avg - a.avg);
    const highest = ranked[0];
    answer = highest
      ? `${highest.product} has the highest average rating in this dataset: ${highest.avg}/5 across ${highest.count} review${highest.count === 1 ? '' : 's'}.`
      : 'There are not enough product ratings to compare.';
    evidence = reviews.filter((review) => review.product === highest?.product).slice(0, 3);
  } else if (/trend|month|week|recent/.test(query)) {
    const monthlyCounts = Array.from({ length: 6 }, (_, index) => {
      const month = new Date();
      month.setDate(1);
      month.setMonth(month.getMonth() - (5 - index));
      const label = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const count = reviews.filter((review) => {
        const date = new Date(review.createdAt);
        return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
      }).length;
      return `${label}: ${count}`;
    });
    answer = `Review counts for the last six calendar months are ${monthlyCounts.join('; ')}. These are counts from stored review dates.`;
    evidence = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  } else if (/categor(y|ies)/.test(query)) {
    const counts = {};
    reviews.forEach((review) => {
      const category = review.category || 'Uncategorized';
      counts[category] = (counts[category] || 0) + 1;
    });
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    answer = ranked.length
      ? `Feedback by category: ${ranked.map(([category, count]) => `${category} (${count})`).join(', ')}.`
      : 'No categorized reviews are available.';
    evidence = reviews.slice(0, 3);
  } else if (/negative|complaint|problem|issue|improve|urgent/.test(query)) {
    const topicCounts = {};
    negative.forEach((review) => analyzeSentiment(review.reviewText, review.rating).topics.forEach((topic) => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }));
    const commonTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0];
    answer = `${negative.length} of ${reviews.length} reviews are classified as negative.`;
    if (commonTopic) answer += ` The most common detected topic among them is ${commonTopic[0]} (${commonTopic[1]} mentions).`;
    const urgentCount = negative.filter((review) => analyzeSentiment(review.reviewText, review.rating).urgent).length;
    if (urgentCount) answer += ` ${urgentCount} contain explicit urgency language and are flagged urgent.`;
    evidence = negative.slice(0, 3);
  } else if (/sentiment|positive|neutral|distribution/.test(query)) {
    answer = `In ${reviews.length} reviews, sentiment analysis classifies ${sentimentTotals.Positive} as positive, ${sentimentTotals.Neutral} as neutral, and ${sentimentTotals.Negative} as negative. These are counts from the current dataset, not a time trend.`;
    evidence = [...reviews].sort((a, b) => (a.sentiment === 'Negative' ? -1 : 0) - (b.sentiment === 'Negative' ? -1 : 0)).slice(0, 3);
  } else if (/delivery|shipping|support|service|pricing|price|quality|website|usability/.test(query)) {
    const topics = ['delivery', 'support', 'pricing', 'product', 'usability'];
    const topic = topics.find((item) => query.includes(item) || (item === 'delivery' && query.includes('shipping')) || (item === 'support' && query.includes('service')) || (item === 'pricing' && query.includes('price')));
    const matched = reviews.filter((review) => analyzeSentiment(review.reviewText, review.rating).topics.includes(topic));
    const avg = calculateAverageRating(matched);
    const negCount = matched.filter((review) => review.sentiment === 'Negative').length;
    answer = matched.length
      ? `${matched.length} reviews mention ${topic}; their average rating is ${avg}/5 and ${negCount} are classified negative.`
      : `No reviews mentioning ${topic} were found in this dataset.`;
    evidence = matched.slice(0, 3);
  } else if (/rating|average|satisfaction|csat/.test(query)) {
    answer = `The average rating across ${reviews.length} reviews is ${calculateAverageRating(reviews)}/5. Rating-based satisfaction is ${calculateCustomerSatisfaction(reviews).toFixed(0)}% (average rating divided by 5).`;
    evidence = reviews.slice(0, 3);
  } else {
    answer = `I can summarize the ${reviews.length} reviews by sentiment, rating, product, or themes such as delivery, support, pricing, product quality, and usability. Try asking about one of those.`;
  }
  return { text: answer, evidence };
}

function appendCopilotMessage(question) {
  const conversation = document.getElementById('copilotConversation');
  if (!conversation) return;
  const { text, evidence } = buildCopilotAnswer(question);
  const evidenceHtml = evidence.length
    ? `<ul class="copilot-evidence">${evidence.map((review) => `<li><strong>${escapeHtml(review.product || 'Feedback')}</strong> · ${escapeHtml(review.sentiment)} · ${Number(review.rating)}/5 — “${escapeHtml((review.reviewText || '').slice(0, 180))}”</li>`).join('')}</ul>`
    : '';
  conversation.insertAdjacentHTML('beforeend', `
    <article class="copilot-message user-message"><span>You</span><p>${escapeHtml(question)}</p></article>
    <article class="copilot-message assistant-message"><span><i class="fa-solid fa-sparkles"></i> FeedbackPro · dataset answer</span><p>${escapeHtml(text)}</p>${evidenceHtml}</article>
  `);
  conversation.scrollTop = conversation.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'dashboard') return;
  renderComplaints();
  document.getElementById('syncComplaintsBtn')?.addEventListener('click', createComplaintsFromReviews);
  document.getElementById('complaintsTableBody')?.addEventListener('change', updateComplaint);
  document.getElementById('complaintsTableBody')?.addEventListener('blur', updateComplaint, true);
  document.getElementById('feedbackFileInput')?.addEventListener('change', (event) => loadImportFile(event.target.files[0]));
  document.getElementById('confirmImportBtn')?.addEventListener('click', confirmFeedbackImport);
  document.getElementById('copilotForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('copilotQuestion');
    const question = input.value.trim();
    if (!question) return;
    appendCopilotMessage(question);
    input.value = '';
  });
  document.querySelectorAll('.copilot-prompt').forEach((button) => {
    button.addEventListener('click', () => appendCopilotMessage(button.textContent.trim()));
  });
});
