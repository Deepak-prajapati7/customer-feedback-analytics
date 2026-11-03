const PAGE_SIZE = 7;
let currentQuickFilter = 'all';

function renderReviewsTable(reviews) {
  const tbody = document.getElementById('reviewsTableBody');
  const pagination = document.getElementById('reviewPagination');
  const productFilter = document.getElementById('productFilter');
  const reviewSearchInput = document.getElementById('reviewSearchInput');
  const ratingFilter = document.getElementById('ratingFilter');
  const sentimentFilter = document.getElementById('sentimentFilter');
  const reviewDateFilter = document.getElementById('reviewDateFilter');
  const sortFilter = document.getElementById('reviewSortFilter');

  if (!tbody) return;

  // Update quick filter counts
  const totalCount = reviews.length;
  const pendingCount = reviews.filter((r) => r.responseStatus === 'pending').length;
  const positiveCount = reviews.filter((r) => r.sentiment === 'Positive').length;
  const negativeCount = reviews.filter((r) => r.sentiment === 'Negative').length;
  const fiveStarCount = reviews.filter((r) => Number(r.rating) === 5).length;

  const countAllEl = document.getElementById('countAllReviews');
  const countPendingEl = document.getElementById('countPendingReviews');
  const countPositiveEl = document.getElementById('countPositiveReviews');
  const countNegativeEl = document.getElementById('countNegativeReviews');
  const countFiveStarEl = document.getElementById('countFiveStarReviews');

  if (countAllEl) countAllEl.textContent = totalCount;
  if (countPendingEl) countPendingEl.textContent = pendingCount;
  if (countPositiveEl) countPositiveEl.textContent = positiveCount;
  if (countNegativeEl) countNegativeEl.textContent = negativeCount;
  if (countFiveStarEl) countFiveStarEl.textContent = fiveStarCount;

  const productOptions = [...new Set(reviews.map((r) => r.product))];
  if (productFilter && !productFilter.dataset.ready) {
    productFilter.innerHTML = '<option value="all">All products</option>' + productOptions.map((product) => `<option value="${product}">${product}</option>`).join('');
    productFilter.dataset.ready = 'true';
  }

  let filtered = [...reviews];

  // Quick filter tabs
  if (currentQuickFilter === 'pending') {
    filtered = filtered.filter((r) => r.responseStatus === 'pending');
  } else if (currentQuickFilter === 'positive') {
    filtered = filtered.filter((r) => r.sentiment === 'Positive');
  } else if (currentQuickFilter === 'negative') {
    filtered = filtered.filter((r) => r.sentiment === 'Negative');
  } else if (currentQuickFilter === 'fiveStar') {
    filtered = filtered.filter((r) => Number(r.rating) === 5);
  }

  const query = (reviewSearchInput?.value || '').trim().toLowerCase();
  if (query) {
    filtered = filtered.filter((review) => (
      (review.customerName || '').toLowerCase().includes(query) ||
      (review.email || '').toLowerCase().includes(query) ||
      (review.product || '').toLowerCase().includes(query) ||
      (review.reviewTitle || '').toLowerCase().includes(query) ||
      (review.reviewText || '').toLowerCase().includes(query)
    ));
  }

  if (ratingFilter && ratingFilter.value !== 'all') {
    filtered = filtered.filter((review) => String(review.rating) === ratingFilter.value);
  }

  if (sentimentFilter && sentimentFilter.value !== 'all') {
    filtered = filtered.filter((review) => review.sentiment === sentimentFilter.value);
  }

  if (productFilter && productFilter.value !== 'all') {
    filtered = filtered.filter((review) => review.product === productFilter.value);
  }

  if (reviewDateFilter && reviewDateFilter.value) {
    filtered = filtered.filter((review) => review.createdAt.startsWith(reviewDateFilter.value));
  }

  const sortOrder = sortFilter?.value || 'newest';
  filtered.sort((a, b) => {
    if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortOrder === 'rating-high') return Number(b.rating) - Number(a.rating);
    if (sortOrder === 'rating-low') return Number(a.rating) - Number(b.rating);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const page = Number(document.body.dataset.reviewPage || 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  document.body.dataset.reviewPage = String(safePage);

  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  if (!pageItems.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-magnifying-glass" style="margin-bottom:0.4rem;font-size:1.2rem;opacity:0.6;"></i><br/>No customer reviews match your active filter criteria.</div></td></tr>';
    pagination.innerHTML = '';
    return;
  }

  tbody.innerHTML = pageItems.map((review) => {
    const initial = (review.customerName || 'A').charAt(0).toUpperCase();
    const colorIndex = (review.customerName || 'A').charCodeAt(0) % 6;
    const isResponded = review.responseStatus === 'responded';
    const analysis = analyzeSentiment(review.reviewText, review.rating);
    return `
      <tr>
        <td>
          <div class="customer-cell">
            <div class="avatar-circle tone-${colorIndex}">${initial}</div>
            <div class="customer-info">
              <strong class="customer-name">${escapeHtml(review.customerName || 'Anonymous')}</strong>
              <small class="customer-email">${escapeHtml(review.email || '')}</small>
            </div>
          </div>
        </td>
        <td>
          <span class="product-badge"><i class="fa-solid fa-cube"></i> ${escapeHtml(review.product || '')}</span>
        </td>
        <td>
          <div class="rating-display">
            <span class="stars-gold">${'★'.repeat(review.rating || 0)}</span><span class="stars-empty">${'☆'.repeat(5 - (review.rating || 0))}</span>
            <span class="rating-num">${(review.rating || 0).toFixed(1)}</span>
          </div>
        </td>
        <td>
          <div class="review-text-cell">
            <strong class="review-title-snippet">${escapeHtml(review.reviewTitle || '')}</strong>
            <span class="review-body-snippet">${escapeHtml((review.reviewText || '').slice(0, 75))}${review.reviewText?.length > 75 ? '...' : ''}</span>
          </div>
        </td>
        <td>
          <span class="${getSentimentClass(review.sentiment || 'Neutral')}">
            <span class="badge-dot"></span>
            ${escapeHtml(review.sentiment || 'Neutral')}
          </span>
        </td>
        <td>
          <span class="table-date">${formatDate(review.createdAt)}</span>
        </td>
        <td>
          <span class="status-pill status-${isResponded ? 'responded' : 'pending'}">
            <i class="fa-solid ${isResponded ? 'fa-check' : 'fa-clock'}"></i>
            ${isResponded ? 'Responded' : 'Pending'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-btn-view view-review-btn" data-id="${review.id}" title="View & Reply">
              <i class="fa-solid fa-reply"></i> Reply
            </button>
            <button class="action-btn-delete delete-review-btn" data-id="${review.id}" title="Delete review">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Pagination with prev/next buttons
  const startItem = (safePage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safePage * PAGE_SIZE, filtered.length);
  const paginationControls = `
    <div class="pagination-info">Showing <strong>${startItem}-${endItem}</strong> of <strong>${filtered.length}</strong> reviews</div>
    <div class="pagination-buttons">
      <button class="page-btn page-arrow" data-page="${Math.max(1, safePage - 1)}" ${safePage === 1 ? 'disabled' : ''} aria-label="Previous page">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      ${Array.from({ length: totalPages }, (_, idx) => idx + 1)
        .map((p) => `<button class="page-btn ${p === safePage ? 'active' : ''}" data-page="${p}">${p}</button>`)
        .join('')}
      <button class="page-btn page-arrow" data-page="${Math.min(totalPages, safePage + 1)}" ${safePage === totalPages ? 'disabled' : ''} aria-label="Next page">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  `;
  pagination.innerHTML = paginationControls;

  pagination.querySelectorAll('.page-btn:not([disabled])').forEach((button) => {
    button.addEventListener('click', () => {
      document.body.dataset.reviewPage = button.dataset.page;
      renderReviewsTable(getReviews());
    });
  });

  tbody.querySelectorAll('.view-review-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const review = getReviews().find((item) => item.id === button.dataset.id);
      if (review) openReviewModal(review);
    });
  });

  tbody.querySelectorAll('.delete-review-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      if (window.confirm('Are you sure you want to delete this customer review?')) {
        const reviews = getReviews();
        const updated = reviews.filter((item) => item.id !== id);
        saveReviews(updated);
        showToast('Review removed from workspace.', 'success');
        renderReviewsTable(updated);
        if (typeof renderDashboard === 'function') renderDashboard();
      }
    });
  });
}

function openReviewModal(review) {
  const modal = document.getElementById('reviewModal');
  const content = document.getElementById('reviewModalBody');
  if (!modal || !content) return;

  const initial = (review.customerName || 'A').charAt(0).toUpperCase();
  const colorIndex = (review.customerName || 'A').charCodeAt(0) % 6;
  const isResponded = review.responseStatus === 'responded';

  content.innerHTML = `
    <div class="review-modal-wrap">
      <div class="review-modal-header">
        <div class="modal-customer-info">
          <div class="avatar-circle-lg tone-${colorIndex}">${initial}</div>
          <div>
            <h3 class="modal-customer-name">${escapeHtml(review.customerName || 'Anonymous')}</h3>
            <span class="modal-customer-meta">
              <i class="fa-regular fa-envelope"></i> ${escapeHtml(review.email || 'No email provided')} &bull;
              <i class="fa-regular fa-calendar"></i> ${formatDate(review.createdAt)}
            </span>
          </div>
        </div>
        <div class="modal-meta-pills">
          <span class="product-badge"><i class="fa-solid fa-cube"></i> ${escapeHtml(review.product || 'General')}</span>
          <span class="category-badge"><i class="fa-solid fa-tag"></i> ${escapeHtml(review.category || 'Feedback')}</span>
        </div>
      </div>

      <div class="modal-score-card">
        <div class="score-item">
          <span class="score-label">Customer Rating</span>
          <div class="rating-display-lg">
            <span class="stars-gold">${'★'.repeat(review.rating || 0)}</span><span class="stars-empty">${'☆'.repeat(5 - (review.rating || 0))}</span>
            <strong>${(review.rating || 0).toFixed(1)} / 5.0</strong>
          </div>
        </div>
        <div class="score-item">
          <span class="score-label">Sentiment</span>
          <span class="${getSentimentClass(review.sentiment || 'Neutral')}">
            <span class="badge-dot"></span>
            ${escapeHtml(review.sentiment || 'Neutral')} (${review.sentimentScore > 0 ? '+' : ''}${review.sentimentScore || 0})
          </span>
        </div>
        <div class="score-item">
          <span class="score-label">Recommendation</span>
          <span class="recom-badge ${review.recommendation === 'Yes' ? 'recom-yes' : review.recommendation === 'No' ? 'recom-no' : 'recom-maybe'}">
            <i class="fa-solid ${review.recommendation === 'Yes' ? 'fa-thumbs-up' : review.recommendation === 'No' ? 'fa-thumbs-down' : 'fa-minus'}"></i>
            ${review.recommendation || 'Yes'}
          </span>
        </div>
        <div class="score-item">
          <span class="score-label">Status</span>
          <span class="status-pill status-${isResponded ? 'responded' : 'pending'}">
            <i class="fa-solid ${isResponded ? 'fa-check' : 'fa-clock'}"></i>
            ${isResponded ? 'Responded' : 'Pending Response'}
          </span>
        </div>
      </div>

      <div class="modal-review-body">
        <h4 class="modal-review-title">${escapeHtml(review.reviewTitle || 'Customer Feedback')}</h4>
        <blockquote class="modal-review-quote">
          <i class="fa-solid fa-quote-left quote-icon"></i>
          <p>${escapeHtml(review.reviewText || '')}</p>
        </blockquote>
      </div>

      <div class="card review-analysis-card">
        <div class="card-header">
          <div>
            <h4>Sentiment analysis</h4>
            <p class="chart-description">${escapeHtml(analysis.explanation)}</p>
          </div>
          ${analysis.urgent ? '<span class="urgent-review-label"><i class="fa-solid fa-triangle-exclamation"></i> Urgent</span>' : ''}
        </div>
        <div class="review-topic-list">${analysis.topics.length
          ? analysis.topics.map((topic) => `<span class="chip">${escapeHtml(topic)}</span>`).join('')
          : '<span class="data-disclaimer">No topic matched confidently.</span>'}</div>
        <p class="analysis-recommendation"><strong>Suggested next step:</strong> ${escapeHtml(analysis.recommendation)}</p>
        <small class="data-disclaimer">Rule-based analysis runs locally; it is not a hosted AI model.</small>
      </div>

      <div class="modal-reply-section">
        ${review.reply ? `
          <div class="existing-reply-box" id="existingReplyBox">
            <div class="reply-header">
              <div class="reply-sender">
                <i class="fa-solid fa-user-shield"></i>
                <strong>Admin Team Response</strong>
                <small>${review.replyDate ? formatDate(review.replyDate) : 'Recently'}</small>
              </div>
              <button type="button" class="text-btn small edit-reply-trigger" id="editReplyBtn">
                <i class="fa-regular fa-pen-to-square"></i> Edit Response
              </button>
            </div>
            <p class="reply-text">${escapeHtml(review.reply)}</p>
          </div>
        ` : ''}

        <div class="reply-composer ${review.reply ? 'collapsed' : ''}" id="replyComposer">
          <div class="composer-header">
            <label for="replyInput">
              <i class="fa-solid fa-reply"></i>
              <span>${review.reply ? 'Update Customer Response' : 'Write Customer Response'}</span>
            </label>
            <div class="canned-templates">
              <span class="template-label">Quick templates:</span>
              <button type="button" class="template-chip" data-template="appreciation">❤️ Appreciation</button>
              <button type="button" class="template-chip" data-template="investigation">🛠️ Investigation</button>
              <button type="button" class="template-chip" data-template="feature">💡 Feature Noted</button>
            </div>
          </div>
          <textarea id="replyInput" rows="3" placeholder="Type a professional response to ${escapeHtml(review.customerName || 'the customer')}...">${escapeHtml(review.reply || '')}</textarea>
          <div class="composer-actions">
            <button type="button" class="primary-btn submit-modal-reply-btn" id="saveReplyBtn">
              <i class="fa-solid fa-paper-plane"></i> Send Reply & Resolve
            </button>
            <button type="button" class="secondary-btn toggle-status-btn" id="toggleStatusBtn">
              ${isResponded ? '<i class="fa-solid fa-clock-rotate-left"></i> Mark as Pending' : '<i class="fa-solid fa-check"></i> Mark as Resolved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Template button actions
  const replyInput = content.querySelector('#replyInput');
  content.querySelectorAll('.template-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.template;
      if (type === 'appreciation') {
        replyInput.value = `Thank you so much for the wonderful review, ${review.customerName || 'valued customer'}! Our team is thrilled to hear this and truly appreciates your support.`;
      } else if (type === 'investigation') {
        replyInput.value = `Thank you for bringing this to our attention, ${review.customerName || ''}. We sincerely apologize for any frustration caused. Our team is actively investigating this to resolve it immediately.`;
      } else if (type === 'feature') {
        replyInput.value = `Thank you for the thoughtful suggestion, ${review.customerName || ''}! We've logged this feature request with our product engineering team for our upcoming release cycle.`;
      }
      replyInput.focus();
    });
  });

  // Edit existing reply button
  content.querySelector('#editReplyBtn')?.addEventListener('click', () => {
    const composer = content.querySelector('#replyComposer');
    if (composer) {
      composer.classList.remove('collapsed');
      replyInput.focus();
    }
  });

  // Save response handler
  content.querySelector('#saveReplyBtn')?.addEventListener('click', () => {
    const text = replyInput.value.trim();
    if (!text) {
      showToast('Please type a response before sending.', 'error');
      return;
    }
    const reviews = getReviews();
    const index = reviews.findIndex((item) => item.id === review.id);
    if (index >= 0) {
      reviews[index].reply = text;
      reviews[index].responseStatus = 'responded';
      reviews[index].replyDate = new Date().toISOString();
      saveReviews(reviews);

      // Add audit notification
      const notifications = getNotifications();
      notifications.unshift({
        id: crypto.randomUUID(),
        title: 'Response sent to customer',
        message: `Admin replied to review by ${review.customerName || 'customer'}.`,
        unread: false,
        createdAt: new Date().toISOString()
      });
      saveNotifications(notifications);

      showToast(`Reply sent to ${review.customerName || 'customer'}!`, 'success');
      renderReviewsTable(reviews);
      if (typeof renderDashboard === 'function') renderDashboard();
      modal.classList.remove('open');
    }
  });

  // Toggle status button
  content.querySelector('#toggleStatusBtn')?.addEventListener('click', () => {
    const reviews = getReviews();
    const index = reviews.findIndex((item) => item.id === review.id);
    if (index >= 0) {
      const nextStatus = reviews[index].responseStatus === 'responded' ? 'pending' : 'responded';
      reviews[index].responseStatus = nextStatus;
      saveReviews(reviews);
      showToast(`Review status updated to ${nextStatus}.`, 'success');
      renderReviewsTable(reviews);
      if (typeof renderDashboard === 'function') renderDashboard();
      modal.classList.remove('open');
    }
  });

  modal.classList.add('open');
}

function exportReviewsCsv(reviews) {
  const rows = [
    ['Customer', 'Email', 'Product', 'Category', 'Rating', 'Review Title', 'Review Text', 'Sentiment', 'Recommendation', 'Date', 'Response Status', 'Admin Response'],
    ...reviews.map((r) => [
      r.customerName,
      r.email,
      r.product,
      r.category,
      r.rating,
      r.reviewTitle,
      r.reviewText,
      r.sentiment,
      r.recommendation,
      formatDate(r.createdAt),
      r.responseStatus,
      r.reply
    ])
  ];

  const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `feedbackpro_reviews_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Reviews exported as CSV successfully!', 'success');
}

function initializeReviewFilters() {
  const searchInput = document.getElementById('reviewSearchInput');
  const ratingFilter = document.getElementById('ratingFilter');
  const sentimentFilter = document.getElementById('sentimentFilter');
  const productFilter = document.getElementById('productFilter');
  const dateFilter = document.getElementById('reviewDateFilter');
  const sortFilter = document.getElementById('reviewSortFilter');

  if (!searchInput) return;

  searchInput.addEventListener('input', () => renderReviewsTable(getReviews()));
  ratingFilter?.addEventListener('change', () => renderReviewsTable(getReviews()));
  sentimentFilter?.addEventListener('change', () => renderReviewsTable(getReviews()));
  productFilter?.addEventListener('change', () => renderReviewsTable(getReviews()));
  dateFilter?.addEventListener('change', () => renderReviewsTable(getReviews()));
  sortFilter?.addEventListener('change', () => renderReviewsTable(getReviews()));

  // Quick filter chips click handlers
  document.querySelectorAll('#quickFilterChips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#quickFilterChips .chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentQuickFilter = chip.dataset.filter || 'all';
      document.body.dataset.reviewPage = '1';
      renderReviewsTable(getReviews());
    });
  });
}
