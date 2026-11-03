const PAGE_SIZE = 7;

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

  const productOptions = [...new Set(reviews.map((r) => r.product))];
  if (!productFilter.dataset.ready) {
    productFilter.innerHTML = '<option value="all">All products</option>' + productOptions.map((product) => `<option value="${product}">${product}</option>`).join('');
    productFilter.dataset.ready = 'true';
  }

  let filtered = [...reviews];
  const query = (reviewSearchInput?.value || '').trim().toLowerCase();
  if (query) {
    filtered = filtered.filter((review) => (
      (review.customerName || '').toLowerCase().includes(query) ||
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
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">No reviews match the current filters.</div></td></tr>';
    pagination.innerHTML = '';
    return;
  }

  tbody.innerHTML = pageItems.map((review) => `
    <tr>
      <td>
        <div class="review-header">
          <div class="review-identity">${(review.customerName || 'A').charAt(0).toUpperCase()}</div>
          <div>
            <strong>${escapeHtml(review.customerName || 'Anonymous')}</strong>
            <small>${escapeHtml(review.email || '')}</small>
          </div>
        </div>
      </td>
      <td>${escapeHtml(review.product || '')}</td>
      <td>${'★'.repeat(review.rating || 0)}${'☆'.repeat(5 - (review.rating || 0))}</td>
      <td>${escapeHtml((review.reviewTitle || review.reviewText || '').slice(0, 60))}</td>
      <td><span class="${getSentimentClass(review.sentiment || 'Neutral')}">${review.sentiment || 'Neutral'}</span></td>
      <td>${formatDate(review.createdAt)}</td>
      <td><span class="status-pill">${review.responseStatus || 'pending'}</span></td>
      <td>
        <div class="table-actions">
          <button class="text-btn-ghost view-review-btn" data-id="${review.id}">View</button>
          <button class="secondary-btn delete-review-btn" data-id="${review.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  pagination.innerHTML = Array.from({ length: totalPages }, (_, idx) => idx + 1)
    .map((pageNumber) => `<button class="page-btn ${pageNumber === safePage ? 'active' : ''}" data-page="${pageNumber}">${pageNumber}</button>`)
    .join('');

  pagination.querySelectorAll('.page-btn').forEach((button) => {
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
      const reviews = getReviews();
      const updated = reviews.filter((item) => item.id !== id);
      saveReviews(updated);
      showToast('Review deleted successfully.', 'success');
      renderReviewsTable(updated);
      if (typeof renderDashboard === 'function') renderDashboard();
    });
  });
}

function openReviewModal(review) {
  const modal = document.getElementById('reviewModal');
  const content = document.getElementById('reviewModalBody');
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="modal-body-grid">
      <div>
        <span class="modal-label">Customer</span>
        <p class="modal-stat">${escapeHtml(review.customerName || 'Anonymous')}</p>
      </div>
      <div>
        <span class="modal-label">Product</span>
        <p class="modal-stat">${escapeHtml(review.product || '')}</p>
      </div>
      <div>
        <span class="modal-label">Rating</span>
        <p class="modal-stat">${'★'.repeat(review.rating || 0)}${'☆'.repeat(5 - (review.rating || 0))}</p>
      </div>
      <div>
        <span class="modal-label">Sentiment</span>
        <p class="modal-stat"><span class="${getSentimentClass(review.sentiment || 'Neutral')}">${review.sentiment || 'Neutral'}</span></p>
      </div>
      <div class="full">
        <span class="modal-label">Review title</span>
        <p class="modal-stat">${escapeHtml(review.reviewTitle || '')}</p>
      </div>
      <div class="full">
        <span class="modal-label">Review</span>
        <p class="modal-stat">${escapeHtml(review.reviewText || '')}</p>
      </div>
      <div class="full">
        <span class="modal-label">Admin response</span>
        <p class="modal-stat">${escapeHtml(review.reply || 'No response yet.')}</p>
      </div>
    </div>
    <div class="review-detail-actions">
      <button class="primary-btn respond-review-btn" data-id="${review.id}">Reply</button>
      <button class="secondary-btn markReviewedBtn" data-id="${review.id}">${review.responseStatus === 'responded' ? 'Mark pending' : 'Mark resolved'}</button>
    </div>
  `;

  content.querySelector('.respond-review-btn')?.addEventListener('click', () => {
    const reply = window.prompt('Enter an admin response for this customer review:');
    if (reply === null) return;
    const reviews = getReviews();
    const index = reviews.findIndex((item) => item.id === review.id);
    if (index >= 0) {
      reviews[index].reply = reply.trim();
      reviews[index].responseStatus = 'responded';
      reviews[index].replyDate = new Date().toISOString();
      saveReviews(reviews);
      showToast('Customer reply saved.', 'success');
      renderReviewsTable(reviews);
      if (typeof renderDashboard === 'function') renderDashboard();
      modal.classList.remove('open');
    }
  });

  content.querySelector('.markReviewedBtn')?.addEventListener('click', () => {
    const reviews = getReviews();
    const index = reviews.findIndex((item) => item.id === review.id);
    if (index >= 0) {
      reviews[index].responseStatus = reviews[index].responseStatus === 'responded' ? 'pending' : 'responded';
      saveReviews(reviews);
      showToast('Response status updated.', 'success');
      renderReviewsTable(reviews);
      if (typeof renderDashboard === 'function') renderDashboard();
      modal.classList.remove('open');
    }
  });

  modal.classList.add('open');
}

function exportReviewsCsv(reviews) {
  const rows = [
    ['Customer', 'Product', 'Rating', 'Review', 'Sentiment', 'Date', 'Response'],
    ...reviews.map((review) => [
      review.customerName,
      review.product,
      review.rating,
      review.reviewText,
      review.sentiment,
      formatDate(review.createdAt),
      review.responseStatus
    ])
  ];

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'feedback_reviews.csv';
  link.click();
  URL.revokeObjectURL(link.href);
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
}
