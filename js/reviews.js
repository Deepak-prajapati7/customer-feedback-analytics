const PAGE_SIZE = 7;
let currentQuickFilter = 'all';

const STANDARD_PRODUCTS = [
  'SmartHub Pro',
  'InsightFlow',
  'Nexa CRM',
  'DeliverLoop',
  'PulseDesk',
  'Luna Support'
];

const STANDARD_CATEGORIES = [
  'Product Quality',
  'Customer Service',
  'Delivery',
  'Pricing',
  'Website Experience',
  'Other'
];

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

  const sidebarPendingBadge = document.getElementById('sidebarPendingReviewsCount');
  if (sidebarPendingBadge) {
    sidebarPendingBadge.textContent = pendingCount;
    sidebarPendingBadge.classList.toggle('hidden', pendingCount === 0);
  }

  const productOptions = [...new Set(reviews.map((r) => r.product).filter(Boolean))].sort();
  if (productFilter) {
    const previousProduct = productFilter.value || 'all';
    productFilter.innerHTML = '<option value="all">All products</option>' +
      productOptions.map((product) => `<option value="${escapeHtml(product)}">${escapeHtml(product)}</option>`).join('');
    productFilter.value = productOptions.includes(previousProduct) ? previousProduct : 'all';
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
    filtered = filtered.filter((review) => String(review.createdAt || '').startsWith(reviewDateFilter.value));
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
    const ratingVal = Math.max(0, Math.min(5, Number(review.rating || 0)));
    const editedBadge = review.editedAt
      ? `<span class="edited-pill" title="Edited by ${escapeHtml(review.editedBy || 'Admin')} on ${formatDate(review.editedAt)}"><i class="fa-solid fa-pen"></i> Edited</span>`
      : '';
    return `
      <tr>
        <td>
          <div class="customer-cell">
            <div class="avatar-circle tone-${colorIndex}">${escapeHtml(initial)}</div>
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
            <span class="stars-gold">${'★'.repeat(ratingVal)}</span><span class="stars-empty">${'☆'.repeat(5 - ratingVal)}</span>
            <span class="rating-num">${ratingVal.toFixed(1)}</span>
          </div>
        </td>
        <td>
          <div class="review-text-cell">
            <strong class="review-title-snippet">${escapeHtml(review.reviewTitle || '')} ${editedBadge}</strong>
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
            <button class="action-btn-view view-review-btn" data-id="${escapeHtml(review.id)}" title="View & Reply">
              <i class="fa-solid fa-reply"></i> Reply
            </button>
            <button class="action-btn-edit edit-review-btn" data-id="${escapeHtml(review.id)}" title="Edit review">
              <i class="fa-regular fa-pen-to-square"></i> Edit
            </button>
            <button class="action-btn-delete delete-review-btn" data-id="${escapeHtml(review.id)}" title="Delete review">
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

  tbody.querySelectorAll('.edit-review-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const review = getReviews().find((item) => item.id === button.dataset.id);
      if (review) openEditReviewModal(review, { returnToView: false });
    });
  });

  tbody.querySelectorAll('.delete-review-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      if (window.confirm('Are you sure you want to delete this customer review?')) {
        const reviews = getReviews();
        const updated = reviews.filter((item) => item.id !== id);
        if (!saveReviews(updated)) return;
        showToast('Review removed from workspace.', 'success');
        renderReviewsTable(updated);
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderReportSummary === 'function') renderReportSummary();
      }
    });
  });
}

function openReviewModal(review) {
  const modal = document.getElementById('reviewModal');
  const content = document.getElementById('reviewModalBody');
  if (!modal || !content || !review) return;

  const initial = (review.customerName || 'A').charAt(0).toUpperCase();
  const colorIndex = (review.customerName || 'A').charCodeAt(0) % 6;
  const isResponded = review.responseStatus === 'responded';
  const ratingVal = Math.max(0, Math.min(5, Number(review.rating || 0)));
  const analysis = typeof analyzeSentiment === 'function'
    ? analyzeSentiment(review.reviewText || '', review.rating || 3)
    : { explanation: 'Sentiment analyzed based on feedback tone.', urgent: false, topics: [], suggestion: 'Acknowledge customer feedback.' };

  content.innerHTML = `
    <div class="review-modal-wrap">
      <div class="review-modal-header">
        <div class="modal-customer-info">
          <div class="avatar-circle-lg tone-${colorIndex}">${escapeHtml(initial)}</div>
          <div>
            <h3 class="modal-customer-name">${escapeHtml(review.customerName || 'Anonymous')}</h3>
            <span class="modal-customer-meta">
              <i class="fa-regular fa-envelope"></i> ${escapeHtml(review.email || 'No email provided')} &bull;
              <i class="fa-regular fa-calendar"></i> ${formatDate(review.createdAt)}
              ${review.editedAt ? `&bull; <span class="edited-pill"><i class="fa-solid fa-pen"></i> Edited ${formatDate(review.editedAt)}</span>` : ''}
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
            <span class="stars-gold">${'★'.repeat(ratingVal)}</span><span class="stars-empty">${'☆'.repeat(5 - ratingVal)}</span>
            <strong>${ratingVal.toFixed(1)} / 5.0</strong>
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
            ${escapeHtml(review.recommendation || 'Yes')}
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
        <div class="modal-review-title-row">
          <h4 class="modal-review-title">${escapeHtml(review.reviewTitle || 'Customer Feedback')}</h4>
          <button type="button" class="secondary-btn modal-edit-trigger" id="openEditFromModalBtn">
            <i class="fa-regular fa-pen-to-square"></i> Edit Review
          </button>
        </div>
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
        <p class="analysis-recommendation"><strong>Suggested next step:</strong> ${escapeHtml(analysis.suggestion)}</p>
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
              <i class="fa-solid fa-paper-plane"></i> Send Reply &amp; Resolve
            </button>
            <button type="button" class="secondary-btn toggle-status-btn" id="toggleStatusBtn">
              ${isResponded ? '<i class="fa-solid fa-clock-rotate-left"></i> Mark as Pending' : '<i class="fa-solid fa-check"></i> Mark as Resolved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  content.querySelector('#openEditFromModalBtn')?.addEventListener('click', () => {
    openEditReviewModal(review, { returnToView: true });
  });

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
      if (!saveReviews(reviews)) return;

      // Add audit notification
      const notifications = getNotifications();
      notifications.unshift({
        id: generateId(),
        title: 'Response sent to customer',
        message: `Admin replied to review by ${review.customerName || 'customer'}.`,
        unread: false,
        createdAt: new Date().toISOString()
      });
      saveNotifications(notifications);

      showToast(`Reply sent to ${review.customerName || 'customer'}!`, 'success');
      renderReviewsTable(getReviews());
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderNotificationList === 'function') renderNotificationList();
      if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
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
      if (!saveReviews(reviews)) return;
      showToast(`Review status updated to ${nextStatus}.`, 'success');
      renderReviewsTable(getReviews());
      if (typeof renderDashboard === 'function') renderDashboard();
      modal.classList.remove('open');
    }
  });

  modal.classList.add('open');
}

function openEditReviewModal(review, options = {}) {
  const modal = document.getElementById('reviewModal');
  const content = document.getElementById('reviewModalBody');
  if (!modal || !content || !review) return;

  const currentReviews = getReviews();
  const productSuggestions = [...new Set([
    ...STANDARD_PRODUCTS,
    ...currentReviews.map((item) => item.product).filter(Boolean)
  ])];
  const categoryOptions = [...new Set([
    ...STANDARD_CATEGORIES,
    review.category
  ].filter(Boolean))];
  const currentRating = Math.max(1, Math.min(5, Number(review.rating || 5)));

  content.innerHTML = `
    <div class="review-modal-wrap">
      <div class="edit-modal-header">
        <div>
          <p class="eyebrow">Admin Editor</p>
          <h3 class="modal-customer-name">Edit Customer Review</h3>
          <span class="modal-customer-meta">
            Submitted ${formatDate(review.createdAt)}
            ${review.editedAt ? `&bull; Last edited ${formatDate(review.editedAt)} by ${escapeHtml(review.editedBy || 'Admin')}` : ''}
          </span>
        </div>
      </div>

      <form id="editReviewForm" class="edit-review-form">
        <div class="form-grid">
          <div class="input-group">
            <label for="editCustomerName">Customer name</label>
            <input id="editCustomerName" type="text" value="${escapeHtml(review.customerName || '')}" required />
          </div>
          <div class="input-group">
            <label for="editCustomerEmail">Email address</label>
            <input id="editCustomerEmail" type="email" value="${escapeHtml(review.email || '')}" placeholder="customer@example.com" />
          </div>
          <div class="input-group">
            <label for="editProduct">Product or service</label>
            <input id="editProduct" type="text" list="editProductDatalist" value="${escapeHtml(review.product || '')}" required />
            <datalist id="editProductDatalist">
              ${productSuggestions.map((product) => `<option value="${escapeHtml(product)}"></option>`).join('')}
            </datalist>
          </div>
          <div class="input-group">
            <label for="editCategory">Feedback category</label>
            <select id="editCategory" required>
              ${categoryOptions.map((cat) => `<option value="${escapeHtml(cat)}" ${cat === review.category ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label>Overall rating</label>
            <div class="edit-rating-control">
              <div class="edit-star-rating" id="editStarRating">
                ${[1, 2, 3, 4, 5].map((num) => `
                  <button type="button" class="edit-star-btn ${num <= currentRating ? 'active' : ''}" data-value="${num}" aria-label="${num} star${num > 1 ? 's' : ''}">
                    <i class="${num <= currentRating ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                  </button>
                `).join('')}
              </div>
              <span class="edit-rating-badge" id="editRatingBadge">${currentRating} / 5</span>
              <input type="hidden" id="editRatingValue" value="${currentRating}" />
            </div>
          </div>
          <div class="input-group">
            <label for="editRecommendation">Would recommend?</label>
            <select id="editRecommendation">
              ${['Yes', 'Maybe', 'No'].map((opt) => `<option value="${opt}" ${(review.recommendation || 'Yes') === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="input-group">
          <label for="editReviewTitle">Review title</label>
          <input id="editReviewTitle" type="text" maxlength="100" value="${escapeHtml(review.reviewTitle || '')}" required />
        </div>

        <div class="input-group">
          <label for="editReviewText">Detailed review</label>
          <textarea id="editReviewText" rows="4" maxlength="1000" required>${escapeHtml(review.reviewText || '')}</textarea>
          <div class="sentiment-live-pill" id="editSentimentLivePill">
            <span class="pill-dot"></span>
            <span id="editSentimentLiveText">Calculating sentiment...</span>
          </div>
        </div>

        <div class="form-grid">
          <div class="input-group">
            <label for="editResponseStatus">Response status</label>
            <select id="editResponseStatus">
              <option value="pending" ${review.responseStatus !== 'responded' ? 'selected' : ''}>Pending</option>
              <option value="responded" ${review.responseStatus === 'responded' ? 'selected' : ''}>Responded</option>
            </select>
          </div>
          <div class="input-group">
            <label for="editReplyText">Admin team response (optional)</label>
            <textarea id="editReplyText" rows="2" placeholder="Optional response visible to customer">${escapeHtml(review.reply || '')}</textarea>
          </div>
        </div>

        <div class="edit-modal-actions">
          <button type="button" class="secondary-btn" id="cancelEditReviewBtn">Cancel</button>
          <button type="submit" class="primary-btn"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>
        </div>
      </form>
    </div>
  `;

  const ratingInput = content.querySelector('#editRatingValue');
  const ratingBadge = content.querySelector('#editRatingBadge');
  const starButtons = content.querySelectorAll('.edit-star-btn');
  const titleInput = content.querySelector('#editReviewTitle');
  const reviewTextInput = content.querySelector('#editReviewText');
  const livePill = content.querySelector('#editSentimentLivePill');
  const liveText = content.querySelector('#editSentimentLiveText');

  const updateEditStarVisuals = (val) => {
    starButtons.forEach((btn) => {
      const num = Number(btn.dataset.value);
      const icon = btn.querySelector('i');
      btn.classList.toggle('active', num <= val);
      if (icon) {
        icon.classList.toggle('fa-solid', num <= val);
        icon.classList.toggle('fa-regular', num > val);
      }
    });
    if (ratingBadge) ratingBadge.textContent = `${val} / 5`;
  };

  const refreshLiveSentiment = () => {
    if (!livePill || !liveText || typeof analyzeSentiment !== 'function') return;
    const text = reviewTextInput.value.trim();
    const ratingVal = Number(ratingInput.value || 0);
    if (!text) {
      livePill.className = 'sentiment-live-pill';
      liveText.textContent = 'Enter review text to preview sentiment...';
      return;
    }
    const result = analyzeSentiment(text, ratingVal);
    livePill.className = `sentiment-live-pill tone-${result.sentiment.toLowerCase()}`;
    liveText.textContent = `Updated sentiment: ${result.sentiment} (${result.score > 0 ? '+' : ''}${result.score})`;
  };

  starButtons.forEach((btn) => {
    const val = Number(btn.dataset.value);
    btn.addEventListener('mouseenter', () => updateEditStarVisuals(val));
    btn.addEventListener('click', () => {
      ratingInput.value = String(val);
      updateEditStarVisuals(val);
      refreshLiveSentiment();
    });
  });

  content.querySelector('#editStarRating')?.addEventListener('mouseleave', () => {
    updateEditStarVisuals(Number(ratingInput.value || currentRating));
  });

  reviewTextInput?.addEventListener('input', refreshLiveSentiment);
  refreshLiveSentiment();

  content.querySelector('#cancelEditReviewBtn')?.addEventListener('click', () => {
    if (options.returnToView) {
      const latest = getReviews().find((item) => item.id === review.id) || review;
      openReviewModal(latest);
    } else {
      modal.classList.remove('open');
    }
  });

  content.querySelector('#editReviewForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const customerName = content.querySelector('#editCustomerName').value.trim();
    const email = content.querySelector('#editCustomerEmail').value.trim();
    const product = content.querySelector('#editProduct').value.trim();
    const category = content.querySelector('#editCategory').value.trim();
    const rating = Number(ratingInput.value || 0);
    const recommendation = content.querySelector('#editRecommendation').value;
    const reviewTitle = titleInput.value.trim();
    const reviewText = reviewTextInput.value.trim();
    const responseStatus = content.querySelector('#editResponseStatus').value;
    const reply = content.querySelector('#editReplyText').value.trim();

    if (!customerName || !product || !category || rating < 1 || rating > 5 || !reviewTitle || !reviewText) {
      showToast('Please fill out all required review fields and select a rating.', 'error');
      return;
    }

    const reviews = getReviews();
    const index = reviews.findIndex((item) => item.id === review.id);
    if (index < 0) {
      showToast('Review could not be found.', 'error');
      return;
    }

    const previousReply = String(reviews[index].reply || '').trim();
    const sentiment = typeof analyzeSentiment === 'function'
      ? analyzeSentiment(reviewText, rating)
      : { sentiment: 'Neutral', score: 0 };

    const auth = ensureAuth();
    const editorName = getSettings().displayName || auth.name || 'Admin';
    const nowIso = new Date().toISOString();

    reviews[index] = {
      ...reviews[index],
      customerName,
      email,
      product,
      category,
      rating,
      recommendation,
      reviewTitle,
      reviewText,
      ...sentiment,
      sentiment: sentiment.sentiment,
      sentimentScore: sentiment.score,
      responseStatus: reply && responseStatus === 'pending' && reply !== previousReply ? 'responded' : responseStatus,
      reply,
      replyDate: reply ? (reply !== previousReply || !reviews[index].replyDate ? nowIso : reviews[index].replyDate) : '',
      editedAt: nowIso,
      editedBy: editorName
    };

    if (!saveReviews(reviews)) return;

    // Keep any linked complaint record synchronized
    if (typeof getComplaints === 'function' && typeof saveComplaints === 'function') {
      const complaints = getComplaints();
      let changed = false;
      complaints.forEach((issue) => {
        if (issue.reviewId === review.id) {
          issue.title = reviewTitle;
          issue.description = reviewText;
          issue.customerName = customerName;
          issue.product = product;
          changed = true;
        }
      });
      if (changed) saveComplaints(complaints);
    }

    const notifications = getNotifications();
    notifications.unshift({
      id: generateId(),
      title: 'Review edited by admin',
      message: `${editorName} updated ${customerName}'s review for ${product}.`,
      unread: false,
      createdAt: nowIso
    });
    saveNotifications(notifications);

    const refreshed = getReviews();
    renderReviewsTable(refreshed);
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderComplaints === 'function') renderComplaints();
    if (typeof renderReportSummary === 'function') renderReportSummary();
    if (typeof renderNotificationList === 'function') renderNotificationList();
    if (typeof renderNotificationCenter === 'function') renderNotificationCenter();

    showToast('Review updated successfully!', 'success');

    if (options.returnToView) {
      const updated = refreshed.find((item) => item.id === review.id);
      if (updated) {
        openReviewModal(updated);
        return;
      }
    }
    modal.classList.remove('open');
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

  const csv = rows.map((row) => row.map((cell) => {
    const value = String(cell || '');
    const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replace(/"/g, '""')}"`;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `feedbackpro_reviews_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
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

  const resetAndRender = () => {
    document.body.dataset.reviewPage = '1';
    renderReviewsTable(getReviews());
  };

  searchInput.addEventListener('input', resetAndRender);
  ratingFilter?.addEventListener('change', resetAndRender);
  sentimentFilter?.addEventListener('change', resetAndRender);
  productFilter?.addEventListener('change', resetAndRender);
  dateFilter?.addEventListener('change', resetAndRender);
  sortFilter?.addEventListener('change', resetAndRender);

  // Quick filter chips click handlers
  document.querySelectorAll('#quickFilterChips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#quickFilterChips .chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentQuickFilter = chip.dataset.filter || 'all';
      resetAndRender();
    });
  });
}
