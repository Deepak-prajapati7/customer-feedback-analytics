const PORTAL_PAGE_SIZE = 9;
let activePortalTab = 'browse';
let selectedPortalProduct = 'all';
let currentPortalPage = 1;
let lookupEmailOverride = '';

function getActiveCustomerIdentity() {
  const auth = typeof ensureAuth === 'function' ? ensureAuth() : { isLoggedIn: false };
  const profile = typeof getCustomerProfile === 'function' ? getCustomerProfile() : { name: '', email: '' };
  if (auth.isLoggedIn && auth.role === 'customer') {
    return {
      name: auth.name || profile.name || 'Customer',
      email: lookupEmailOverride || auth.email || profile.email || '',
      accountEmail: auth.email || '',
      isLoggedInCustomer: true,
      isAdmin: false
    };
  }
  if (auth.isLoggedIn && (auth.role || 'admin') === 'admin') {
    return {
      name: profile.name || auth.name || 'Admin',
      email: lookupEmailOverride || profile.email || '',
      accountEmail: '',
      isLoggedInCustomer: false,
      isAdmin: true
    };
  }
  return {
    name: profile.name || '',
    email: lookupEmailOverride || profile.email || '',
    accountEmail: '',
    isLoggedInCustomer: false,
    isAdmin: false
  };
}

function switchPortalTab(tabName) {
  const allowed = ['browse', 'write', 'mine'];
  activePortalTab = allowed.includes(tabName) ? tabName : 'browse';

  document.querySelectorAll('.portal-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.portalTab === activePortalTab);
  });

  const views = {
    browse: document.getElementById('portalBrowseView'),
    write: document.getElementById('portalWriteView'),
    mine: document.getElementById('portalMineView')
  };
  Object.entries(views).forEach(([key, section]) => {
    if (section) section.classList.toggle('active', key === activePortalTab);
  });

  if (activePortalTab === 'write') {
    prefillWriteFormIdentity();
  }
}

function prefillWriteFormIdentity() {
  const identity = getActiveCustomerIdentity();
  const nameInput = document.getElementById('portalCustomerName');
  const emailInput = document.getElementById('portalCustomerEmail');
  const preferredEmail = identity.accountEmail || identity.email;
  if (nameInput && !nameInput.value && identity.name && !identity.isAdmin) {
    nameInput.value = identity.name;
  }
  if (emailInput && !emailInput.value && preferredEmail && !identity.isAdmin) {
    emailInput.value = preferredEmail;
  }
}

function renderCustomerHeaderAuth() {
  const container = document.getElementById('customerHeaderAuth');
  if (!container) return;
  const auth = typeof ensureAuth === 'function' ? ensureAuth() : { isLoggedIn: false };

  if (auth.isLoggedIn && auth.role === 'customer') {
    const initial = (auth.name || 'C').charAt(0).toUpperCase();
    container.innerHTML = `
      <div class="customer-session-pill">
        <span class="avatar customer-avatar">${escapeHtml(initial)}</span>
        <div class="customer-session-meta">
          <strong>${escapeHtml(auth.name || 'Customer')}</strong>
          <small>${escapeHtml(auth.email || '')}</small>
        </div>
      </div>
      <button type="button" class="secondary-btn" id="customerLogoutBtn">
        <i class="fa-solid fa-right-from-bracket"></i> Sign Out
      </button>
    `;
  } else if (auth.isLoggedIn && (auth.role || 'admin') === 'admin') {
    container.innerHTML = `
      <a href="index.html" class="primary-btn">
        <i class="fa-solid fa-gauge-high"></i> Admin Dashboard
      </a>
      <button type="button" class="secondary-btn" id="customerLogoutBtn">
        <i class="fa-solid fa-right-from-bracket"></i> Sign Out
      </button>
    `;
  } else {
    container.innerHTML = `
      <a href="login.html" class="primary-btn">
        <i class="fa-solid fa-right-to-bracket"></i> Sign In
      </a>
    `;
  }

  document.getElementById('customerLogoutBtn')?.addEventListener('click', () => {
    setAuthState({ isLoggedIn: false });
    showToast('Signed out successfully.', 'success');
    renderCustomerPortal();
  });
}

function renderHeroStats(reviews) {
  const heroTitle = document.getElementById('portalHeroTitle');
  const heroStats = document.getElementById('portalHeroStats');
  const identity = getActiveCustomerIdentity();

  if (heroTitle) {
    heroTitle.textContent = identity.isLoggedInCustomer
      ? `Welcome back, ${identity.name}`
      : 'Share your experience & explore verified reviews';
  }

  if (!heroStats) return;
  const total = reviews.length;
  const avg = typeof calculateAverageRating === 'function' ? calculateAverageRating(reviews) : 0;
  const recResponses = reviews.filter((r) => ['Yes', 'Maybe', 'No'].includes(r.recommendation));
  const yesCount = recResponses.filter((r) => r.recommendation === 'Yes').length;
  const recPct = recResponses.length ? Math.round((yesCount / recResponses.length) * 100) : 0;
  const respondedCount = reviews.filter((r) => r.responseStatus === 'responded' || Boolean(r.reply)).length;

  heroStats.innerHTML = `
    <div class="hero-stat-card">
      <span class="hero-stat-label">Average Rating</span>
      <strong class="hero-stat-value">${avg.toFixed(1)} <small>/ 5.0</small></strong>
      <span class="hero-stat-sub stars-gold">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))}</span>
    </div>
    <div class="hero-stat-card">
      <span class="hero-stat-label">Total Reviews</span>
      <strong class="hero-stat-value">${total}</strong>
      <span class="hero-stat-sub">Community feedback</span>
    </div>
    <div class="hero-stat-card">
      <span class="hero-stat-label">Would Recommend</span>
      <strong class="hero-stat-value">${recResponses.length ? `${recPct}%` : '—'}</strong>
      <span class="hero-stat-sub">${yesCount} of ${recResponses.length} voters</span>
    </div>
    <div class="hero-stat-card">
      <span class="hero-stat-label">Team Responses</span>
      <strong class="hero-stat-value">${respondedCount}</strong>
      <span class="hero-stat-sub">Official replies posted</span>
    </div>
  `;
}

function renderProductStrip(reviews) {
  const strip = document.getElementById('portalProductStrip');
  if (!strip) return;

  const productStats = new Map();
  reviews.forEach((review) => {
    const product = review.product || 'Other';
    const entry = productStats.get(product) || { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(review.rating || 0);
    productStats.set(product, entry);
  });

  const sortedProducts = [...productStats.entries()].sort((a, b) => b[1].count - a[1].count);
  if (selectedPortalProduct !== 'all' && !productStats.has(selectedPortalProduct)) {
    selectedPortalProduct = 'all';
  }

  strip.innerHTML = `
    <button type="button" class="portal-product-pill ${selectedPortalProduct === 'all' ? 'active' : ''}" data-product="all">
      <span>All Products</span>
      <strong>${reviews.length}</strong>
    </button>
    ${sortedProducts.map(([product, stats]) => {
      const avg = stats.count ? (stats.total / stats.count).toFixed(1) : '0.0';
      return `
        <button type="button" class="portal-product-pill ${selectedPortalProduct === product ? 'active' : ''}" data-product="${escapeHtml(product)}">
          <span>${escapeHtml(product)}</span>
          <small><i class="fa-solid fa-star"></i> ${avg}</small>
          <strong>${stats.count}</strong>
        </button>
      `;
    }).join('')}
  `;

  strip.querySelectorAll('.portal-product-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedPortalProduct = btn.dataset.product || 'all';
      currentPortalPage = 1;
      renderProductStrip(getReviews());
      renderCommunityReviews(getReviews());
    });
  });
}

function renderPortalReviewCard(review, activeEmail) {
  const initial = (review.customerName || 'A').charAt(0).toUpperCase();
  const colorIndex = (review.customerName || 'A').charCodeAt(0) % 6;
  const ratingVal = Math.max(0, Math.min(5, Number(review.rating || 0)));
  const isOwner = Boolean(
    activeEmail &&
    review.email &&
    String(review.email).trim().toLowerCase() === String(activeEmail).trim().toLowerCase()
  );
  const isResponded = review.responseStatus === 'responded' || Boolean(review.reply);
  const recomLabel = review.recommendation === 'Yes'
    ? 'Recommends'
    : review.recommendation === 'No'
      ? 'Does not recommend'
      : 'Neutral recommendation';
  const recomClass = review.recommendation === 'Yes'
    ? 'recom-yes'
    : review.recommendation === 'No'
      ? 'recom-no'
      : 'recom-maybe';

  return `
    <article class="card portal-review-card ${isOwner ? 'is-own-review' : ''}">
      <div class="portal-card-top">
        <div class="customer-cell">
          <div class="avatar-circle tone-${colorIndex}">${escapeHtml(initial)}</div>
          <div class="customer-info">
            <strong class="customer-name">
              ${escapeHtml(review.customerName || 'Customer')}
              ${isOwner ? '<span class="own-review-pill">Your Review</span>' : ''}
            </strong>
            <small class="customer-email">${formatDate(review.createdAt)}</small>
          </div>
        </div>
        <div class="portal-card-rating">
          <span class="stars-gold">${'★'.repeat(ratingVal)}</span><span class="stars-empty">${'☆'.repeat(5 - ratingVal)}</span>
          <strong>${ratingVal.toFixed(1)}</strong>
        </div>
      </div>

      <div class="portal-card-tags">
        <span class="product-badge"><i class="fa-solid fa-cube"></i> ${escapeHtml(review.product || 'General')}</span>
        <span class="category-badge"><i class="fa-solid fa-tag"></i> ${escapeHtml(review.category || 'Feedback')}</span>
        ${review.editedAt ? `<span class="edited-pill" title="Edited by ${escapeHtml(review.editedBy || 'Admin')} on ${formatDate(review.editedAt)}"><i class="fa-solid fa-pen"></i> Edited by Admin</span>` : ''}
      </div>

      <div class="portal-card-body">
        <h3>${escapeHtml(review.reviewTitle || 'Customer Review')}</h3>
        <p>${escapeHtml(review.reviewText || '')}</p>
      </div>

      <div class="portal-card-footer">
        <span class="recom-badge ${recomClass}">
          <i class="fa-solid ${review.recommendation === 'Yes' ? 'fa-thumbs-up' : review.recommendation === 'No' ? 'fa-thumbs-down' : 'fa-minus'}"></i>
          ${recomLabel}
        </span>
        <span class="status-pill status-${isResponded ? 'responded' : 'pending'}">
          <i class="fa-solid ${isResponded ? 'fa-check' : 'fa-clock'}"></i>
          ${isResponded ? 'Team Responded' : 'Pending Review'}
        </span>
      </div>

      ${review.reply ? `
        <div class="portal-admin-reply">
          <div class="portal-reply-header">
            <span><i class="fa-solid fa-user-shield"></i> Official Team Response</span>
            <small>${review.replyDate ? formatDate(review.replyDate) : 'Recently'}</small>
          </div>
          <p>${escapeHtml(review.reply)}</p>
        </div>
      ` : ''}
    </article>
  `;
}

function renderCommunityReviews(reviews) {
  const grid = document.getElementById('portalReviewsGrid');
  const pagination = document.getElementById('portalPagination');
  const categorySelect = document.getElementById('portalCategoryFilter');
  const browseCount = document.getElementById('portalBrowseCount');
  if (!grid || !pagination) return;

  if (browseCount) browseCount.textContent = reviews.length;

  const categories = [...new Set(reviews.map((r) => r.category).filter(Boolean))].sort();
  if (categorySelect) {
    const previous = categorySelect.value || 'all';
    categorySelect.innerHTML = '<option value="all">All categories</option>' +
      categories.map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
    categorySelect.value = categories.includes(previous) ? previous : 'all';
  }

  const query = (document.getElementById('portalSearchInput')?.value || '').trim().toLowerCase();
  const ratingFilter = document.getElementById('portalRatingFilter')?.value || 'all';
  const categoryFilter = categorySelect?.value || 'all';
  const responseFilter = document.getElementById('portalResponseFilter')?.value || 'all';
  const sortOrder = document.getElementById('portalSortFilter')?.value || 'newest';

  let filtered = [...reviews];

  if (selectedPortalProduct !== 'all') {
    filtered = filtered.filter((r) => r.product === selectedPortalProduct);
  }
  if (query) {
    filtered = filtered.filter((r) => (
      (r.customerName || '').toLowerCase().includes(query) ||
      (r.product || '').toLowerCase().includes(query) ||
      (r.category || '').toLowerCase().includes(query) ||
      (r.reviewTitle || '').toLowerCase().includes(query) ||
      (r.reviewText || '').toLowerCase().includes(query)
    ));
  }
  if (ratingFilter !== 'all') {
    filtered = filtered.filter((r) => String(r.rating) === ratingFilter);
  }
  if (categoryFilter !== 'all') {
    filtered = filtered.filter((r) => r.category === categoryFilter);
  }
  if (responseFilter === 'responded') {
    filtered = filtered.filter((r) => r.responseStatus === 'responded' || Boolean(r.reply));
  } else if (responseFilter === 'pending') {
    filtered = filtered.filter((r) => r.responseStatus !== 'responded' && !r.reply);
  }

  filtered.sort((a, b) => {
    if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortOrder === 'rating-high') return Number(b.rating) - Number(a.rating);
    if (sortOrder === 'rating-low') return Number(a.rating) - Number(b.rating);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state portal-empty-span">
        <i class="fa-regular fa-comment-dots"></i>
        <strong>No matching reviews found</strong>
        <p>Try adjusting your search or product filters, or be the first to write a review.</p>
        <button type="button" class="primary-btn" id="emptyWriteBtn">Write a Review</button>
      </div>
    `;
    pagination.innerHTML = '';
    pagination.classList.add('hidden');
    document.getElementById('emptyWriteBtn')?.addEventListener('click', () => switchPortalTab('write'));
    return;
  }

  pagination.classList.remove('hidden');
  const totalPages = Math.max(1, Math.ceil(filtered.length / PORTAL_PAGE_SIZE));
  currentPortalPage = Math.min(currentPortalPage, totalPages);
  const pageItems = filtered.slice((currentPortalPage - 1) * PORTAL_PAGE_SIZE, currentPortalPage * PORTAL_PAGE_SIZE);
  const identity = getActiveCustomerIdentity();

  grid.innerHTML = pageItems.map((review) => renderPortalReviewCard(review, identity.email)).join('');

  const startItem = (currentPortalPage - 1) * PORTAL_PAGE_SIZE + 1;
  const endItem = Math.min(currentPortalPage * PORTAL_PAGE_SIZE, filtered.length);
  pagination.innerHTML = `
    <div class="pagination-info">Showing <strong>${startItem}-${endItem}</strong> of <strong>${filtered.length}</strong> reviews</div>
    <div class="pagination-buttons">
      <button class="page-btn page-arrow" data-page="${Math.max(1, currentPortalPage - 1)}" ${currentPortalPage === 1 ? 'disabled' : ''} aria-label="Previous page">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      ${Array.from({ length: totalPages }, (_, idx) => idx + 1)
        .map((p) => `<button class="page-btn ${p === currentPortalPage ? 'active' : ''}" data-page="${p}">${p}</button>`)
        .join('')}
      <button class="page-btn page-arrow" data-page="${Math.min(totalPages, currentPortalPage + 1)}" ${currentPortalPage === totalPages ? 'disabled' : ''} aria-label="Next page">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  `;

  pagination.querySelectorAll('.page-btn:not([disabled])').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPortalPage = Number(btn.dataset.page || 1);
      renderCommunityReviews(getReviews());
    });
  });
}

function renderMyReviews(reviews) {
  const grid = document.getElementById('portalMyReviewsGrid');
  const emailInput = document.getElementById('myReviewsEmailInput');
  const statusEl = document.getElementById('myReviewsEmailStatus');
  const mineCountEl = document.getElementById('portalMineCount');
  const identity = getActiveCustomerIdentity();
  const activeEmail = String(identity.email || '').trim().toLowerCase();

  const myReviews = activeEmail
    ? reviews
        .filter((r) => String(r.email || '').trim().toLowerCase() === activeEmail)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  if (mineCountEl) mineCountEl.textContent = myReviews.length;
  if (emailInput && activeEmail && !emailInput.value) {
    emailInput.value = identity.email;
  }

  if (!grid || !statusEl) return;

  if (!activeEmail) {
    statusEl.textContent = 'Enter your email address below to track reviews you submitted and view admin updates or responses.';
    grid.innerHTML = `
      <div class="empty-state portal-empty-span">
        <i class="fa-solid fa-user-check"></i>
        <strong>Find your submitted reviews</strong>
        <p>Submit a new review or look up an email address (like <code>ava@example.com</code>) to see your reviews and admin responses.</p>
        <div class="empty-actions">
          <button type="button" class="primary-btn" id="myEmptyWriteBtn">Write a Review</button>
          <button type="button" class="secondary-btn" id="trySampleEmailBtn">Preview ava@example.com</button>
        </div>
      </div>
    `;
    document.getElementById('myEmptyWriteBtn')?.addEventListener('click', () => switchPortalTab('write'));
    document.getElementById('trySampleEmailBtn')?.addEventListener('click', () => {
      lookupEmailOverride = 'ava@example.com';
      saveCustomerProfile({ name: 'Ava Thompson', email: 'ava@example.com' });
      if (emailInput) emailInput.value = 'ava@example.com';
      renderMyReviews(getReviews());
      renderCommunityReviews(getReviews());
    });
    return;
  }

  statusEl.innerHTML = `Showing <strong>${myReviews.length}</strong> review${myReviews.length === 1 ? '' : 's'} for <strong>${escapeHtml(identity.email)}</strong>.`;

  if (!myReviews.length) {
    grid.innerHTML = `
      <div class="empty-state portal-empty-span">
        <i class="fa-regular fa-star"></i>
        <strong>No reviews found for ${escapeHtml(identity.email)}</strong>
        <p>Share your first review and it will appear right here along with any team replies.</p>
        <button type="button" class="primary-btn" id="myFirstReviewBtn">Write Your First Review</button>
      </div>
    `;
    document.getElementById('myFirstReviewBtn')?.addEventListener('click', () => switchPortalTab('write'));
    return;
  }

  grid.innerHTML = myReviews.map((review) => renderPortalReviewCard(review, identity.email)).join('');
}

function initWriteReviewForm() {
  const form = document.getElementById('portalReviewForm');
  if (!form) return;

  const starButtons = form.querySelectorAll('#portalStarRating .star-btn');
  const ratingInput = document.getElementById('portalRatingValue');
  const ratingFeedbackText = document.getElementById('portalRatingFeedbackText');
  const titleInput = document.getElementById('portalReviewTitle');
  const reviewTextInput = document.getElementById('portalReviewText');
  const titleCounter = document.getElementById('portalTitleCounter');
  const reviewCounter = document.getElementById('portalReviewCounter');
  const livePill = document.getElementById('portalSentimentLivePill');
  const liveText = document.getElementById('portalSentimentLiveText');
  const productSelect = document.getElementById('portalProductSelect');
  const customProductGroup = document.getElementById('portalCustomProductGroup');
  const customProductInput = document.getElementById('portalCustomProduct');

  const ratingLabels = {
    1: '★ 1 - Poor experience',
    2: '★★ 2 - Below average',
    3: '★★★ 3 - Average & acceptable',
    4: '★★★★ 4 - Very good & reliable',
    5: '★★★★★ 5 - Outstanding experience!'
  };

  const updateStarVisuals = (val) => {
    starButtons.forEach((star) => {
      const value = Number(star.dataset.value);
      const icon = star.querySelector('i');
      star.classList.toggle('active', value <= val);
      if (icon) {
        icon.classList.toggle('fa-solid', value <= val);
        icon.classList.toggle('fa-regular', value > val);
      }
    });
  };

  const updateLiveSentiment = () => {
    if (!livePill || !liveText || typeof analyzeSentiment !== 'function') return;
    const text = reviewTextInput.value.trim();
    if (!text) {
      livePill.className = 'sentiment-live-pill';
      liveText.textContent = 'Local sentiment: Start typing your review...';
      return;
    }
    const result = analyzeSentiment(text, Number(ratingInput.value || 0));
    livePill.className = `sentiment-live-pill tone-${result.sentiment.toLowerCase()}`;
    if (result.sentiment === 'Positive') {
      liveText.innerHTML = `<strong>Local sentiment: Positive</strong> ✨ (Score: +${result.score})`;
    } else if (result.sentiment === 'Negative') {
      liveText.innerHTML = `<strong>Local sentiment: Needs Attention</strong> ⚠️ (Score: ${result.score})`;
    } else {
      liveText.innerHTML = `<strong>Local sentiment: Balanced / Constructive</strong> 💬`;
    }
  };

  starButtons.forEach((button) => {
    const val = Number(button.dataset.value);
    button.addEventListener('mouseenter', () => {
      updateStarVisuals(val);
      if (ratingFeedbackText) ratingFeedbackText.textContent = ratingLabels[val] || 'Click to rate';
    });
    button.addEventListener('click', () => {
      ratingInput.value = String(val);
      updateStarVisuals(val);
      if (ratingFeedbackText) {
        ratingFeedbackText.textContent = ratingLabels[val];
        ratingFeedbackText.classList.add('selected');
      }
      updateLiveSentiment();
    });
  });

  document.getElementById('portalStarRating')?.addEventListener('mouseleave', () => {
    const selected = Number(ratingInput.value || 0);
    updateStarVisuals(selected);
    if (ratingFeedbackText) {
      ratingFeedbackText.textContent = selected > 0 ? ratingLabels[selected] : 'Click a star to rate your experience';
    }
  });

  productSelect?.addEventListener('change', () => {
    const isCustom = productSelect.value === '__custom__';
    customProductGroup?.classList.toggle('hidden', !isCustom);
    if (customProductInput) customProductInput.required = isCustom;
  });

  form.querySelectorAll('.recom-option').forEach((option) => {
    option.addEventListener('click', () => {
      form.querySelectorAll('.recom-option').forEach((opt) => opt.classList.remove('active'));
      option.classList.add('active');
      const radio = option.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  titleInput?.addEventListener('input', () => {
    if (titleCounter) titleCounter.textContent = titleInput.value.length;
  });

  reviewTextInput?.addEventListener('input', () => {
    if (reviewCounter) reviewCounter.textContent = reviewTextInput.value.length;
    updateLiveSentiment();
  });

  document.getElementById('portalCancelWriteBtn')?.addEventListener('click', () => {
    switchPortalTab('browse');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const customerName = document.getElementById('portalCustomerName').value.trim();
    const email = document.getElementById('portalCustomerEmail').value.trim();
    const productChoice = productSelect.value;
    const product = productChoice === '__custom__' ? customProductInput.value.trim() : productChoice;
    const category = document.getElementById('portalCategorySelect').value;
    const rating = Number(ratingInput.value || 0);
    const reviewTitle = titleInput.value.trim();
    const reviewTextValue = reviewTextInput.value.trim();
    const recommendation = form.querySelector('input[name="portalRecommendation"]:checked')?.value || 'Yes';

    if (!customerName || !email || !product || !category || rating < 1 || !reviewTitle || !reviewTextValue) {
      showToast('Please complete all fields and select a star rating.', 'error');
      return;
    }

    const submitBtn = document.getElementById('portalSubmitBtn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const btnLoader = submitBtn?.querySelector('.btn-loader');
    btnText?.classList.add('hidden');
    btnLoader?.classList.remove('hidden');

    setTimeout(() => {
      const sentiment = analyzeSentiment(reviewTextValue, rating);
      const nowIso = new Date().toISOString();
      const newReview = {
        id: generateId(),
        customerName,
        email,
        product,
        category,
        rating,
        reviewTitle,
        reviewText: reviewTextValue,
        recommendation,
        sentiment: sentiment.sentiment,
        sentimentScore: sentiment.score,
        createdAt: nowIso,
        responseStatus: 'pending',
        reply: '',
        replyDate: ''
      };

      const reviews = getReviews();
      reviews.unshift(newReview);
      if (!saveReviews(reviews)) {
        btnText?.classList.remove('hidden');
        btnLoader?.classList.add('hidden');
        return;
      }

      const auth = ensureAuth();
      if (!auth.isLoggedIn || auth.role !== 'admin') {
        saveCustomerProfile({ name: customerName, email });
      }

      const settings = getSettings();
      settings.dateRange = '30';
      saveSettings(settings);

      const notifications = getNotifications();
      notifications.unshift({
        id: generateId(),
        reviewId: newReview.id,
        title: 'New customer review',
        message: `${customerName} submitted a ${rating}-star review for ${product} via Customer Portal.`,
        unread: true,
        createdAt: nowIso
      });
      saveNotifications(notifications);

      btnText?.classList.remove('hidden');
      btnLoader?.classList.add('hidden');

      form.reset();
      customProductGroup?.classList.add('hidden');
      if (customProductInput) customProductInput.required = false;
      updateStarVisuals(0);
      ratingInput.value = '0';
      if (ratingFeedbackText) {
        ratingFeedbackText.textContent = 'Click a star to rate your experience';
        ratingFeedbackText.classList.remove('selected');
      }
      if (titleCounter) titleCounter.textContent = '0';
      if (reviewCounter) reviewCounter.textContent = '0';
      if (livePill) livePill.className = 'sentiment-live-pill';
      if (liveText) liveText.textContent = 'Local sentiment: Start typing your review...';
      form.querySelectorAll('.recom-option').forEach((opt, idx) => opt.classList.toggle('active', idx === 0));

      const lookupInput = document.getElementById('myReviewsEmailInput');
      lookupEmailOverride = email;
      if (lookupInput) lookupInput.value = email;

      renderCustomerPortal();
      switchPortalTab('mine');
      showToast('Thank you! Your review has been published.', 'success');
    }, 450);
  });
}

function renderCustomerPortal() {
  const reviews = getReviews();
  renderCustomerHeaderAuth();
  renderHeroStats(reviews);
  renderProductStrip(reviews);
  renderCommunityReviews(reviews);
  renderMyReviews(reviews);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'customer') return;

  document.querySelectorAll('.portal-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchPortalTab(tab.dataset.portalTab);
    });
  });

  document.getElementById('heroWriteReviewBtn')?.addEventListener('click', () => switchPortalTab('write'));
  document.getElementById('heroMyReviewsBtn')?.addEventListener('click', () => switchPortalTab('mine'));
  document.getElementById('mineWriteReviewBtn')?.addEventListener('click', () => switchPortalTab('write'));

  document.getElementById('myReviewsLookupForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const emailVal = document.getElementById('myReviewsEmailInput')?.value.trim() || '';
    lookupEmailOverride = emailVal;
    const auth = ensureAuth();
    if (!auth.isLoggedIn || auth.role !== 'customer') {
      const existingProfile = getCustomerProfile();
      saveCustomerProfile({ name: existingProfile.name || '', email: emailVal });
    }
    renderMyReviews(getReviews());
    renderCommunityReviews(getReviews());
  });

  const resetBrowse = () => {
    currentPortalPage = 1;
    renderCommunityReviews(getReviews());
  };

  document.getElementById('portalSearchInput')?.addEventListener('input', resetBrowse);
  document.getElementById('portalRatingFilter')?.addEventListener('change', resetBrowse);
  document.getElementById('portalCategoryFilter')?.addEventListener('change', resetBrowse);
  document.getElementById('portalResponseFilter')?.addEventListener('change', resetBrowse);
  document.getElementById('portalSortFilter')?.addEventListener('change', resetBrowse);

  initWriteReviewForm();
  renderCustomerPortal();

  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab') || window.location.hash.replace('#', '');
  if (['browse', 'write', 'mine'].includes(initialTab)) {
    switchPortalTab(initialTab);
  }

  let lastPortalSnapshot = `${localStorage.getItem(STORAGE_KEYS.reviews) || ''}|${localStorage.getItem(STORAGE_KEYS.auth) || ''}|${localStorage.getItem(STORAGE_KEYS.settings) || ''}`;
  const syncCustomerPortalIfChanged = () => {
    const nextSnapshot = `${localStorage.getItem(STORAGE_KEYS.reviews) || ''}|${localStorage.getItem(STORAGE_KEYS.auth) || ''}|${localStorage.getItem(STORAGE_KEYS.settings) || ''}`;
    if (nextSnapshot === lastPortalSnapshot) return;
    lastPortalSnapshot = nextSnapshot;
    const nextSettings = getSettings();
    if (typeof applyThemeSelection === 'function') {
      applyThemeSelection(document.body, document.getElementById('themeToggle'), nextSettings.theme || 'light');
    }
    renderCustomerPortal();
  };

  window.addEventListener('storage', (event) => {
    if (![STORAGE_KEYS.reviews, STORAGE_KEYS.settings, STORAGE_KEYS.auth].includes(event.key)) return;
    syncCustomerPortalIfChanged();
  });
  window.addEventListener('pageshow', syncCustomerPortalIfChanged);
  window.addEventListener('focus', syncCustomerPortalIfChanged);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncCustomerPortalIfChanged();
  });
});
