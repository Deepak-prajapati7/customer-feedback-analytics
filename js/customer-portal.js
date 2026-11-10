document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'customer-portal') return;

  const CUSTOMER_THEME_KEY = 'feedbackpro_customer_theme';
  const DEMO_EMAIL = 'customer@feedbackpro.io';
  const DEMO_PASSWORD = 'customer123';

  const ratingLabels = {
    1: '😞 1 / 5 — Poor experience',
    2: '😕 2 / 5 — Below average',
    3: '😐 3 / 5 — Average & acceptable',
    4: '😊 4 / 5 — Very good & reliable',
    5: '🤩 5 / 5 — Outstanding experience!'
  };

  const serverAlert = document.getElementById('cpServerAlert');
  const authSection = document.getElementById('cpAuthSection');
  const portalSection = document.getElementById('cpPortalSection');
  const navTabsWrap = document.getElementById('cpNavTabs');
  const userPill = document.getElementById('cpUserPill');
  const userAvatar = document.getElementById('cpUserAvatar');
  const userNameEl = document.getElementById('cpUserName');
  const userEmailEl = document.getElementById('cpUserEmail');
  const logoutBtn = document.getElementById('cpLogoutBtn');

  const authTabButtons = document.querySelectorAll('[data-cp-auth-tab]');
  const loginForm = document.getElementById('cpLoginForm');
  const signupForm = document.getElementById('cpSignupForm');
  const authError = document.getElementById('cpAuthError');
  const demoLoginBtn = document.getElementById('cpDemoLoginBtn');
  const loginEmailInput = document.getElementById('cpLoginEmail');
  const loginPasswordInput = document.getElementById('cpLoginPassword');
  const signupNameInput = document.getElementById('cpSignupName');
  const signupEmailInput = document.getElementById('cpSignupEmail');
  const signupPasswordInput = document.getElementById('cpSignupPassword');

  const tabButtons = document.querySelectorAll('[data-cp-tab]');
  const sendView = document.getElementById('cpSendView');
  const historyView = document.getElementById('cpHistoryView');
  const submissionCountBadge = document.getElementById('cpSubmissionCount');
  const themeToggleBtn = document.getElementById('cpThemeToggle');
  const heroTitle = document.getElementById('cpHeroTitle');

  const statTotalEl = document.getElementById('cpStatTotal');
  const statRepliedEl = document.getElementById('cpStatReplied');
  const statPendingEl = document.getElementById('cpStatPending');

  const formCard = document.getElementById('cpFormCard');
  const successCard = document.getElementById('cpSuccessCard');
  const successSubtitle = document.getElementById('cpSuccessSubtitle');
  const successSummary = document.getElementById('cpSuccessSummary');
  const sendAnotherBtn = document.getElementById('cpSendAnotherBtn');
  const goToHistoryBtn = document.getElementById('cpGoToHistoryBtn');

  const form = document.getElementById('cpFeedbackForm');
  const formError = document.getElementById('cpFormError');
  const customerNameInput = document.getElementById('cpCustomerName');
  const emailInput = document.getElementById('cpEmail');
  const productSelect = document.getElementById('cpProduct');
  const categorySelect = document.getElementById('cpCategory');
  const ratingCard = document.getElementById('cpRatingCard');
  const starButtons = Array.from(document.querySelectorAll('#cpStarRating .star-btn'));
  const ratingInput = document.getElementById('cpRatingValue');
  const ratingText = document.getElementById('cpRatingText');
  const reviewTitleInput = document.getElementById('cpReviewTitle');
  const reviewTextInput = document.getElementById('cpReviewText');
  const titleCounter = document.getElementById('cpTitleCounter');
  const reviewCounter = document.getElementById('cpReviewCounter');
  const reviewBar = document.getElementById('cpReviewBar');
  const submitBtn = document.getElementById('cpSubmitBtn');

  const previewProduct = document.getElementById('cpPreviewProduct');
  const previewCategory = document.getElementById('cpPreviewCategory');
  const previewStars = document.getElementById('cpPreviewStars');
  const previewTitle = document.getElementById('cpPreviewTitle');
  const previewText = document.getElementById('cpPreviewText');
  const previewAuthor = document.getElementById('cpPreviewAuthor');
  const previewRecommend = document.getElementById('cpPreviewRecommend');

  const historyFilters = document.querySelectorAll('[data-cp-filter]');
  const historySearchInput = document.getElementById('cpHistorySearch');
  const historyList = document.getElementById('cpHistoryList');

  let currentCustomer = null;
  let customerReviews = [];
  let activeTab = 'send';
  let activeHistoryFilter = 'all';
  let pollTimer = null;

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  async function portalApi(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }
    if (!response.ok) {
      const err = new Error(payload?.error || `Request failed (${response.status})`);
      err.status = response.status;
      throw err;
    }
    return payload;
  }

  function applyCustomerTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('theme-dark', isDark);
    document.body.classList.toggle('theme-light', !isDark);
    const icon = themeToggleBtn?.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-moon', !isDark);
      icon.classList.toggle('fa-sun', isDark);
    }
  }

  function initTheme() {
    let savedTheme = 'light';
    try {
      savedTheme = localStorage.getItem(CUSTOMER_THEME_KEY) || 'light';
    } catch (error) {
      savedTheme = 'light';
    }
    applyCustomerTheme(savedTheme);

    themeToggleBtn?.addEventListener('click', () => {
      const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
      applyCustomerTheme(nextTheme);
      try {
        localStorage.setItem(CUSTOMER_THEME_KEY, nextTheme);
      } catch (error) {
        // Ignore preference error
      }
    });
  }

  function showAuthError(message) {
    if (!authError) return;
    if (!message) {
      authError.hidden = true;
      authError.textContent = '';
      return;
    }
    authError.textContent = message;
    authError.hidden = false;
  }

  function showFormError(message) {
    if (!formError) return;
    if (!message) {
      formError.hidden = true;
      formError.textContent = '';
      return;
    }
    formError.textContent = message;
    formError.hidden = false;
  }

  function switchAuthTab(mode) {
    const nextMode = mode === 'signup' ? 'signup' : 'login';
    authTabButtons.forEach((button) => {
      const isActive = button.dataset.cpAuthTab === nextMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
    loginForm?.classList.toggle('active', nextMode === 'login');
    signupForm?.classList.toggle('active', nextMode === 'signup');
    showAuthError('');
  }

  function updateStatsAndBadge() {
    const total = customerReviews.length;
    const replied = customerReviews.filter((item) => item.responseStatus === 'responded').length;
    const pending = total - replied;

    if (statTotalEl) statTotalEl.textContent = String(total);
    if (statRepliedEl) statRepliedEl.textContent = String(replied);
    if (statPendingEl) statPendingEl.textContent = String(pending);

    if (submissionCountBadge) {
      submissionCountBadge.textContent = String(total);
      submissionCountBadge.hidden = total === 0;
    }
  }

  function updateLivePreview() {
    const product = productSelect?.value || 'Product';
    const category = categorySelect?.value || 'Category';
    const rating = Math.max(0, Math.min(5, Number(ratingInput?.value || 0)));
    const title = reviewTitleInput?.value.trim() || 'Your feedback title will appear here';
    const text = reviewTextInput?.value.trim() || 'Start typing your experience and see how your submission will appear to our team.';
    const author = customerNameInput?.value.trim() || currentCustomer?.name || 'Customer';
    const recommendation = document.querySelector('input[name="cpRecommendation"]:checked')?.value || 'Yes';

    if (previewProduct) previewProduct.innerHTML = `<i class="fa-solid fa-cube" aria-hidden="true"></i> ${escapeHtml(product)}`;
    if (previewCategory) previewCategory.innerHTML = `<i class="fa-solid fa-tag" aria-hidden="true"></i> ${escapeHtml(category)}`;
    if (previewStars) previewStars.textContent = `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
    if (previewTitle) previewTitle.textContent = title;
    if (previewText) previewText.textContent = text;
    if (previewAuthor) previewAuthor.textContent = author;
    if (previewRecommend) previewRecommend.textContent = `Recommend: ${recommendation}`;
  }

  function updateStarVisuals(value) {
    const numeric = Number(value) || 0;
    const selected = Number(ratingInput.value || 0);
    starButtons.forEach((star) => {
      const starValue = Number(star.dataset.value);
      const icon = star.querySelector('i');
      star.classList.toggle('active', starValue <= numeric);
      star.setAttribute('aria-checked', String(starValue === selected));
      if (icon) {
        icon.classList.toggle('fa-solid', starValue <= numeric);
        icon.classList.toggle('fa-regular', starValue > numeric);
      }
    });
  }

  function setRating(value) {
    ratingInput.value = String(value);
    updateStarVisuals(value);
    ratingCard?.classList.toggle('rated', value > 0);
    if (ratingText) {
      ratingText.textContent = value > 0 ? ratingLabels[value] : 'Click a star to rate';
      ratingText.classList.toggle('selected', value > 0);
    }
    updateLivePreview();
  }

  function renderStarsText(rating) {
    const safeRating = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return `<span class="cp-stars-filled">${'★'.repeat(safeRating)}</span><span class="cp-stars-empty">${'☆'.repeat(5 - safeRating)}</span>`;
  }

  function renderConfirmation(review) {
    if (!formCard || !successCard || !successSummary || !successSubtitle) return;
    successSubtitle.textContent = `Thanks, ${review.customerName}! Your feedback is saved in our system for our team to review.`;
    successSummary.innerHTML = `
      <div class="cp-summary-top">
        <div class="cp-summary-meta">
          <span class="product-badge"><i class="fa-solid fa-cube" aria-hidden="true"></i> ${escapeHtml(review.product)}</span>
          <span class="category-badge"><i class="fa-solid fa-tag" aria-hidden="true"></i> ${escapeHtml(review.category)}</span>
        </div>
        <div class="cp-history-rating" aria-label="${Number(review.rating)} out of 5 stars">
          ${renderStarsText(review.rating)}
          <span>${Number(review.rating).toFixed(1)}</span>
        </div>
      </div>
      <h3 class="cp-summary-title">${escapeHtml(review.reviewTitle)}</h3>
      <p class="cp-summary-text">${escapeHtml(review.reviewText)}</p>
      <div class="cp-summary-footer">
        <span>Reference: #${escapeHtml(String(review.id).slice(0, 8).toUpperCase())}</span>
        <span class="status-pill status-pending"><i class="fa-solid fa-clock" aria-hidden="true"></i> Pending Review</span>
      </div>
    `;
    formCard.hidden = true;
    successCard.hidden = false;
  }

  function resetFormForAnotherSubmission() {
    form?.reset();
    if (customerNameInput) customerNameInput.value = currentCustomer?.name || '';
    if (emailInput) emailInput.value = currentCustomer?.email || '';
    setRating(0);
    showFormError('');
    if (titleCounter) titleCounter.textContent = '0';
    if (reviewCounter) reviewCounter.textContent = '0';
    if (reviewBar) reviewBar.style.width = '0%';

    document.querySelectorAll('#cpRecommendationCards .recom-option').forEach((option) => {
      const radio = option.querySelector('input[type="radio"]');
      const isDefault = radio?.value === 'Yes';
      if (radio) radio.checked = isDefault;
      option.classList.toggle('active', isDefault);
    });

    if (successCard) successCard.hidden = true;
    if (formCard) formCard.hidden = false;
    updateLivePreview();
  }

  function renderHistory() {
    if (!historyList) return;
    const query = (historySearchInput?.value || '').trim().toLowerCase();

    let filtered = [...customerReviews];
    if (activeHistoryFilter === 'responded') {
      filtered = filtered.filter((item) => item.responseStatus === 'responded');
    } else if (activeHistoryFilter === 'pending') {
      filtered = filtered.filter((item) => item.responseStatus !== 'responded');
    }

    if (query) {
      filtered = filtered.filter((item) => (
        (item.product || '').toLowerCase().includes(query) ||
        (item.category || '').toLowerCase().includes(query) ||
        (item.reviewTitle || '').toLowerCase().includes(query) ||
        (item.reviewText || '').toLowerCase().includes(query)
      ));
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!filtered.length) {
      historyList.innerHTML = `
        <div class="card cp-empty-card">
          <div class="cp-empty-icon"><i class="fa-regular fa-comment-dots" aria-hidden="true"></i></div>
          <h3>${customerReviews.length ? 'No matching feedback' : 'No feedback submitted yet'}</h3>
          <p>${
            customerReviews.length
              ? 'Try clearing your filter or search term to view all of your feedback.'
              : `No reviews found yet for ${escapeHtml(currentCustomer?.email || 'your account')}. Write your first feedback and track replies here.`
          }</p>
          <button type="button" class="primary-btn" id="cpEmptySendBtn">
            <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i> Write Feedback
          </button>
        </div>
      `;
      document.getElementById('cpEmptySendBtn')?.addEventListener('click', () => {
        resetFormForAnotherSubmission();
        switchTab('send');
      });
      return;
    }

    historyList.innerHTML = filtered
      .map((review) => {
        const isResponded = review.responseStatus === 'responded';
        const hasReply = Boolean(review.reply && review.reply.trim());
        const recommendation = review.recommendation || 'Yes';
        return `
          <article class="card cp-history-card ${isResponded ? 'is-responded' : ''}">
            <div class="cp-history-top">
              <div class="cp-history-badges">
                <span class="product-badge"><i class="fa-solid fa-cube" aria-hidden="true"></i> ${escapeHtml(review.product || 'General')}</span>
                <span class="category-badge"><i class="fa-solid fa-tag" aria-hidden="true"></i> ${escapeHtml(review.category || 'Feedback')}</span>
                <span class="status-pill status-${isResponded ? 'responded' : 'pending'}">
                  <i class="fa-solid ${isResponded ? 'fa-check' : 'fa-clock'}" aria-hidden="true"></i>
                  ${isResponded ? 'Responded' : 'Awaiting Response'}
                </span>
              </div>
              <div class="cp-history-rating" aria-label="${Number(review.rating)} out of 5 stars">
                ${renderStarsText(review.rating)}
                <span>${Number(review.rating).toFixed(1)}</span>
              </div>
            </div>

            <h3 class="cp-history-title">${escapeHtml(review.reviewTitle || 'Customer Feedback')}</h3>
            <p class="cp-history-text">${escapeHtml(review.reviewText || '')}</p>

            <div class="cp-history-meta">
              <span><i class="fa-regular fa-user" aria-hidden="true"></i> ${escapeHtml(review.customerName || 'Customer')} (${escapeHtml(review.email || '')})</span>
              <span><i class="fa-regular fa-calendar" aria-hidden="true"></i> Sent ${escapeHtml(formatDate(review.createdAt))} &bull; Recommend: <strong>${escapeHtml(recommendation)}</strong></span>
            </div>

            ${
              hasReply
                ? `
                  <div class="cp-reply-box">
                    <div class="cp-reply-header">
                      <span><i class="fa-solid fa-user-shield" aria-hidden="true"></i> Support Team Reply</span>
                      <small>${review.replyDate ? escapeHtml(formatDate(review.replyDate)) : 'Recently'}</small>
                    </div>
                    <p>${escapeHtml(review.reply)}</p>
                  </div>
                `
                : ''
            }
          </article>
        `;
      })
      .join('');
  }

  async function refreshCustomerFeedback(silent = true) {
    if (!currentCustomer) return;
    try {
      const data = await portalApi('/api/customer/feedback', { method: 'GET' });
      customerReviews = Array.isArray(data.reviews) ? data.reviews : [];
      updateStatsAndBadge();
      if (activeTab === 'history') {
        renderHistory();
      }
    } catch (error) {
      if (error.status === 401) {
        currentCustomer = null;
        customerReviews = [];
        syncAuthUI();
        return;
      }
      if (!silent) {
        showToast(error.message || 'Could not load your feedback.', 'error');
      }
    }
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
      if (currentCustomer) refreshCustomerFeedback(true);
    }, 3000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function switchTab(tabName) {
    activeTab = tabName === 'history' ? 'history' : 'send';
    tabButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.cpTab === activeTab);
    });
    if (sendView) sendView.hidden = activeTab !== 'send';
    if (historyView) historyView.hidden = activeTab !== 'history';
    if (activeTab === 'history') {
      refreshCustomerFeedback(true);
      renderHistory();
    }
  }

  function syncAuthUI() {
    const loggedIn = Boolean(currentCustomer && currentCustomer.email);

    if (authSection) authSection.hidden = loggedIn;
    if (portalSection) portalSection.hidden = !loggedIn;
    if (navTabsWrap) navTabsWrap.hidden = !loggedIn;
    if (userPill) userPill.hidden = !loggedIn;
    if (logoutBtn) logoutBtn.hidden = !loggedIn;

    if (!loggedIn) {
      stopPolling();
      customerReviews = [];
      updateStatsAndBadge();
      showAuthError('');
      return;
    }

    const displayName = currentCustomer.name || 'Customer';
    const displayEmail = currentCustomer.email || '';
    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    if (userAvatar) userAvatar.textContent = initials || 'C';
    if (userNameEl) userNameEl.textContent = displayName;
    if (userEmailEl) userEmailEl.textContent = displayEmail;
    if (heroTitle) heroTitle.textContent = `Welcome, ${displayName}! Share your experience`;

    resetFormForAnotherSubmission();
    switchTab('send');
    refreshCustomerFeedback(true);
    startPolling();
  }

  async function initSession() {
    initTheme();
    try {
      const health = await portalApi('/api/health', { method: 'GET' });
      if (!health?.ok) throw new Error('Backend unavailable');
      if (serverAlert) serverAlert.hidden = true;
    } catch (error) {
      if (serverAlert) serverAlert.hidden = false;
      return;
    }

    try {
      const me = await portalApi('/api/customer/me', { method: 'GET' });
      currentCustomer = me?.authenticated ? me.customer : null;
      syncAuthUI();
    } catch (error) {
      currentCustomer = null;
      syncAuthUI();
    }
  }

  authTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      switchAuthTab(button.dataset.cpAuthTab);
    });
  });

  [['cpToggleLoginPassword', 'cpLoginPassword'], ['cpToggleSignupPassword', 'cpSignupPassword']].forEach(([buttonId, inputId]) => {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!button || !input) return;
    button.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const icon = button.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye', !isPassword);
        icon.classList.toggle('fa-eye-slash', isPassword);
      }
    });
  });

  async function submitLogin(email, password) {
    showAuthError('');
    try {
      const data = await portalApi('/api/customer/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (serverAlert) serverAlert.hidden = true;
      currentCustomer = data.customer;
      syncAuthUI();
      showToast(`Signed in as ${currentCustomer.name}.`, 'success');
    } catch (error) {
      if (error.status === 404 || error.status === 405 || error.status === 501) {
        if (serverAlert) serverAlert.hidden = false;
        showAuthError('Python backend server is not running. Start it with: python3 server.py');
        return;
      }
      showAuthError(error.message || 'Sign in failed.');
    }
  }

  demoLoginBtn?.addEventListener('click', () => {
    if (loginEmailInput) loginEmailInput.value = DEMO_EMAIL;
    if (loginPasswordInput) loginPasswordInput.value = DEMO_PASSWORD;
    submitLogin(DEMO_EMAIL, DEMO_PASSWORD);
  });

  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = (loginEmailInput?.value || '').trim().toLowerCase();
    const password = (loginPasswordInput?.value || '').trim();
    if (!isValidEmail(email) || !password) {
      showAuthError('Please enter your email address and password.');
      return;
    }
    submitLogin(email, password);
  });

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showAuthError('');

    const name = (signupNameInput?.value || '').trim();
    const email = (signupEmailInput?.value || '').trim().toLowerCase();
    const password = signupPasswordInput?.value || '';

    if (!name) {
      showAuthError('Please enter your full name.');
      signupNameInput?.focus();
      return;
    }
    if (!isValidEmail(email)) {
      showAuthError('Please enter a valid email address.');
      signupEmailInput?.focus();
      return;
    }
    if (password.length < 6) {
      showAuthError('Choose a password with at least 6 characters.');
      signupPasswordInput?.focus();
      return;
    }

    try {
      const data = await portalApi('/api/customer/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      if (serverAlert) serverAlert.hidden = true;
      signupForm.reset();
      currentCustomer = data.customer;
      syncAuthUI();
      showToast(`Welcome, ${name}! Your account is ready.`, 'success');
    } catch (error) {
      if (error.status === 404 || error.status === 405 || error.status === 501) {
        if (serverAlert) serverAlert.hidden = false;
        showAuthError('Python backend server is not running. Start it with: python3 server.py');
        return;
      }
      showAuthError(error.message || 'Could not create customer account.');
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    try {
      await portalApi('/api/customer/logout', { method: 'POST', body: '{}' });
    } catch (error) {
      // Clear local UI state regardless
    }
    currentCustomer = null;
    syncAuthUI();
    showToast('Signed out of Customer Portal.', 'success');
  });

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.cpTab);
    });
  });

  starButtons.forEach((button, index) => {
    const starValue = Number(button.dataset.value);

    button.addEventListener('mouseenter', () => {
      updateStarVisuals(starValue);
      if (ratingText) ratingText.textContent = ratingLabels[starValue] || 'Click a star to rate';
    });

    button.addEventListener('click', () => {
      setRating(starValue);
      showFormError('');
    });

    button.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = Math.min(starButtons.length - 1, index + 1);
        setRating(Number(starButtons[nextIndex].dataset.value));
        starButtons[nextIndex].focus();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        const prevIndex = Math.max(0, index - 1);
        setRating(Number(starButtons[prevIndex].dataset.value));
        starButtons[prevIndex].focus();
      }
    });
  });

  document.getElementById('cpStarRating')?.addEventListener('mouseleave', () => {
    const selected = Number(ratingInput.value || 0);
    updateStarVisuals(selected);
    if (ratingText) {
      ratingText.textContent = selected > 0 ? ratingLabels[selected] : 'Click a star to rate';
    }
  });

  document.querySelectorAll('#cpRecommendationCards .recom-option').forEach((option) => {
    option.addEventListener('click', () => {
      document.querySelectorAll('#cpRecommendationCards .recom-option').forEach((opt) => opt.classList.remove('active'));
      option.classList.add('active');
      updateLivePreview();
    });
  });

  [customerNameInput, productSelect, categorySelect, reviewTitleInput, reviewTextInput].forEach((field) => {
    field?.addEventListener('input', updateLivePreview);
    field?.addEventListener('change', updateLivePreview);
  });

  reviewTitleInput?.addEventListener('input', () => {
    if (titleCounter) titleCounter.textContent = String(reviewTitleInput.value.length);
  });

  reviewTextInput?.addEventListener('input', () => {
    const len = reviewTextInput.value.length;
    if (reviewCounter) reviewCounter.textContent = String(len);
    if (reviewBar) reviewBar.style.width = `${Math.min(100, (len / 500) * 100)}%`;
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showFormError('');

    if (!currentCustomer) {
      syncAuthUI();
      showAuthError('Please sign in first to send feedback.');
      return;
    }

    const customerName = customerNameInput.value.trim();
    const email = emailInput.value.trim();
    const product = productSelect.value;
    const category = categorySelect.value;
    const rating = Number(ratingInput.value || 0);
    const reviewTitle = reviewTitleInput.value.trim();
    const reviewText = reviewTextInput.value.trim();
    const recommendation = document.querySelector('input[name="cpRecommendation"]:checked')?.value || 'Yes';

    if (!customerName) {
      showFormError('Please enter your name.');
      customerNameInput.focus();
      return;
    }
    if (!email || !isValidEmail(email)) {
      showFormError('Please enter a valid email address.');
      emailInput.focus();
      return;
    }
    if (!product) {
      showFormError('Please select a product or service.');
      productSelect.focus();
      return;
    }
    if (!category) {
      showFormError('Please select a feedback category.');
      categorySelect.focus();
      return;
    }
    if (rating < 1 || rating > 5) {
      showFormError('Please choose a star rating between 1 and 5.');
      starButtons[0]?.focus();
      return;
    }
    if (!reviewTitle) {
      showFormError('Please provide a brief feedback title.');
      reviewTitleInput.focus();
      return;
    }
    if (!reviewText) {
      showFormError('Please write your detailed feedback before sending.');
      reviewTextInput.focus();
      return;
    }

    const btnText = submitBtn?.querySelector('.btn-text');
    const btnLoader = submitBtn?.querySelector('.btn-loader');
    if (submitBtn) submitBtn.disabled = true;
    btnText?.classList.add('hidden');
    btnLoader?.classList.remove('hidden');

    try {
      const data = await portalApi('/api/customer/feedback', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          email,
          product,
          category,
          rating,
          reviewTitle,
          reviewText,
          recommendation
        })
      });

      const createdReview = data.review;
      customerReviews = [createdReview, ...customerReviews.filter((item) => item.id !== createdReview.id)];
      updateStatsAndBadge();
      renderConfirmation(createdReview);
      showToast('Thank you! Your feedback has been sent.', 'success');
    } catch (error) {
      if (error.status === 401) {
        currentCustomer = null;
        syncAuthUI();
        showAuthError('Your customer session expired. Please sign in again.');
        return;
      }
      showFormError(error.message || 'Unable to send your feedback right now. Please try again.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      btnText?.classList.remove('hidden');
      btnLoader?.classList.add('hidden');
    }
  });

  sendAnotherBtn?.addEventListener('click', () => {
    resetFormForAnotherSubmission();
  });

  goToHistoryBtn?.addEventListener('click', () => {
    switchTab('history');
  });

  historyFilters.forEach((chip) => {
    chip.addEventListener('click', () => {
      historyFilters.forEach((item) => item.classList.remove('active'));
      chip.classList.add('active');
      activeHistoryFilter = chip.dataset.cpFilter || 'all';
      renderHistory();
    });
  });

  historySearchInput?.addEventListener('input', () => {
    renderHistory();
  });

  window.addEventListener('focus', () => {
    if (currentCustomer) refreshCustomerFeedback(true);
  });

  initSession();
});
