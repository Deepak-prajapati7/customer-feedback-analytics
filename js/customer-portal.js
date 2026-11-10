document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'customer-portal') return;

  const CUSTOMER_AUTH_KEY = 'feedbackpro_customer_auth';
  const CUSTOMER_ACCOUNTS_KEY = 'feedbackpro_customer_accounts';
  const CUSTOMER_SUBMISSIONS_KEY = 'feedbackpro_customer_submissions';
  const CUSTOMER_THEME_KEY = 'feedbackpro_customer_theme';
  const DEMO_CUSTOMER = {
    name: 'Demo Customer',
    email: 'customer@feedbackpro.io',
    password: 'customer123'
  };

  const ratingLabels = {
    1: '1 / 5 — Poor experience',
    2: '2 / 5 — Below average',
    3: '3 / 5 — Average & acceptable',
    4: '4 / 5 — Very good & reliable',
    5: '5 / 5 — Outstanding experience!'
  };

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
  const starButtons = Array.from(document.querySelectorAll('#cpStarRating .star-btn'));
  const ratingInput = document.getElementById('cpRatingValue');
  const ratingText = document.getElementById('cpRatingText');
  const reviewTitleInput = document.getElementById('cpReviewTitle');
  const reviewTextInput = document.getElementById('cpReviewText');
  const titleCounter = document.getElementById('cpTitleCounter');
  const reviewCounter = document.getElementById('cpReviewCounter');
  const submitBtn = document.getElementById('cpSubmitBtn');

  const lookupForm = document.getElementById('cpLookupForm');
  const lookupEmailInput = document.getElementById('cpLookupEmail');
  const resetLookupBtn = document.getElementById('cpResetLookupBtn');
  const historyList = document.getElementById('cpHistoryList');

  let activeTab = 'send';
  let activeEmailFilter = '';

  function createId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `cp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function getCustomerAuth() {
    const auth = getStoredValue(CUSTOMER_AUTH_KEY, { isLoggedIn: false });
    return auth && typeof auth === 'object' ? auth : { isLoggedIn: false };
  }

  function setCustomerAuth(auth) {
    setStoredValue(CUSTOMER_AUTH_KEY, auth);
  }

  function getCustomerAccounts() {
    const accounts = getStoredValue(CUSTOMER_ACCOUNTS_KEY, []);
    return Array.isArray(accounts) ? accounts : [];
  }

  function saveCustomerAccounts(accounts) {
    setStoredValue(CUSTOMER_ACCOUNTS_KEY, accounts);
  }

  function getSavedSubmissionRecords() {
    const records = getStoredValue(CUSTOMER_SUBMISSIONS_KEY, []);
    return Array.isArray(records) ? records : [];
  }

  function saveSubmissionRecord(reviewId, ownerEmail) {
    const records = getSavedSubmissionRecords();
    const exists = records.some((item) => (typeof item === 'string' ? item === reviewId : item.id === reviewId));
    if (!exists) {
      records.unshift({ id: reviewId, email: String(ownerEmail || '').trim().toLowerCase() });
      setStoredValue(CUSTOMER_SUBMISSIONS_KEY, records);
    }
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
        // Ignore preference persistence error
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

  function getMyCustomerReviews() {
    const auth = getCustomerAuth();
    if (!auth.isLoggedIn) return [];

    const accountEmail = String(auth.email || '').trim().toLowerCase();
    const submittedIds = new Set(
      getSavedSubmissionRecords()
        .filter((item) => {
          if (typeof item === 'string') return accountEmail === DEMO_CUSTOMER.email;
          return item && item.email === accountEmail;
        })
        .map((item) => (typeof item === 'string' ? item : item.id))
    );

    return getReviews().filter((review) => {
      if (submittedIds.has(review.id)) return true;
      return Boolean(accountEmail) && String(review.email || '').trim().toLowerCase() === accountEmail;
    });
  }

  function updateSubmissionBadge() {
    if (!submissionCountBadge) return;
    const count = getMyCustomerReviews().length;
    submissionCountBadge.textContent = String(count);
    submissionCountBadge.hidden = count === 0;
  }

  function switchTab(tabName) {
    activeTab = tabName === 'history' ? 'history' : 'send';
    tabButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.cpTab === activeTab);
    });
    if (sendView) sendView.hidden = activeTab !== 'send';
    if (historyView) historyView.hidden = activeTab !== 'history';
    if (activeTab === 'history') {
      renderHistory();
    }
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
    if (ratingText) {
      ratingText.textContent = value > 0 ? ratingLabels[value] : 'Click a star to rate your experience';
      ratingText.classList.toggle('selected', value > 0);
    }
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

  function renderStarsText(rating) {
    const safeRating = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return `<span class="cp-stars-filled">${'★'.repeat(safeRating)}</span><span class="cp-stars-empty">${'☆'.repeat(5 - safeRating)}</span>`;
  }

  function renderConfirmation(review) {
    if (!formCard || !successCard || !successSummary || !successSubtitle) return;
    successSubtitle.textContent = `Thanks, ${review.customerName}! Your feedback has been sent to our team.`;
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
    const auth = getCustomerAuth();
    form?.reset();
    if (customerNameInput) customerNameInput.value = auth.name || '';
    if (emailInput) emailInput.value = auth.email || '';
    setRating(0);
    showFormError('');
    if (titleCounter) titleCounter.textContent = '0';
    if (reviewCounter) reviewCounter.textContent = '0';

    document.querySelectorAll('#cpRecommendationCards .recom-option').forEach((option) => {
      const radio = option.querySelector('input[type="radio"]');
      const isDefault = radio?.value === 'Yes';
      if (radio) radio.checked = isDefault;
      option.classList.toggle('active', isDefault);
    });

    if (successCard) successCard.hidden = true;
    if (formCard) formCard.hidden = false;
  }

  function syncPortalView() {
    const auth = getCustomerAuth();
    const loggedIn = Boolean(auth.isLoggedIn && auth.email);

    if (authSection) authSection.hidden = loggedIn;
    if (portalSection) portalSection.hidden = !loggedIn;
    if (navTabsWrap) navTabsWrap.hidden = !loggedIn;
    if (userPill) userPill.hidden = !loggedIn;
    if (logoutBtn) logoutBtn.hidden = !loggedIn;

    if (!loggedIn) {
      activeEmailFilter = '';
      showAuthError('');
      return;
    }

    const displayName = auth.name || 'Customer';
    const displayEmail = auth.email || '';
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

    activeEmailFilter = '';
    if (lookupEmailInput) lookupEmailInput.value = displayEmail;

    resetFormForAnotherSubmission();
    updateSubmissionBadge();
    switchTab('send');
  }

  function completeCustomerLogin(customer) {
    setCustomerAuth({
      isLoggedIn: true,
      name: customer.name,
      email: customer.email
    });
    syncPortalView();
  }

  function renderHistory() {
    if (!historyList) return;
    const auth = getCustomerAuth();
    const allReviews = getReviews();
    let matchingReviews;

    if (activeEmailFilter) {
      const targetEmail = activeEmailFilter.trim().toLowerCase();
      matchingReviews = allReviews.filter(
        (review) => String(review.email || '').trim().toLowerCase() === targetEmail
      );
      if (resetLookupBtn) resetLookupBtn.hidden = false;
    } else {
      matchingReviews = getMyCustomerReviews();
      if (resetLookupBtn) resetLookupBtn.hidden = true;
    }

    matchingReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!matchingReviews.length) {
      historyList.innerHTML = `
        <div class="card cp-empty-card">
          <div class="cp-empty-icon"><i class="fa-regular fa-comment-dots" aria-hidden="true"></i></div>
          <h3>${activeEmailFilter ? 'No feedback found for that email' : 'No feedback submitted yet'}</h3>
          <p>${
            activeEmailFilter
              ? `We couldn't find any feedback submitted with ${escapeHtml(activeEmailFilter)}.`
              : `No reviews found yet for ${escapeHtml(auth.email || 'your account')}. Send feedback and track replies here.`
          }</p>
          <button type="button" class="primary-btn" id="cpEmptySendBtn">
            <i class="fa-regular fa-paper-plane" aria-hidden="true"></i> Send Feedback
          </button>
        </div>
      `;
      document.getElementById('cpEmptySendBtn')?.addEventListener('click', () => {
        resetFormForAnotherSubmission();
        switchTab('send');
      });
      return;
    }

    historyList.innerHTML = matchingReviews
      .map((review) => {
        const isResponded = review.responseStatus === 'responded';
        const hasReply = Boolean(review.reply && review.reply.trim());
        const recommendation = review.recommendation || 'Yes';
        return `
          <article class="card cp-history-card">
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
                      <span><i class="fa-solid fa-user-shield" aria-hidden="true"></i> Team Response</span>
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

  initTheme();
  syncPortalView();

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

  demoLoginBtn?.addEventListener('click', () => {
    if (loginEmailInput) loginEmailInput.value = DEMO_CUSTOMER.email;
    if (loginPasswordInput) loginPasswordInput.value = DEMO_CUSTOMER.password;
    completeCustomerLogin({ name: DEMO_CUSTOMER.name, email: DEMO_CUSTOMER.email });
    showToast('Signed in as Demo Customer.', 'success');
  });

  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    showAuthError('');

    const email = (loginEmailInput?.value || '').trim().toLowerCase();
    const password = (loginPasswordInput?.value || '').trim();

    if (!isValidEmail(email) || !password) {
      showAuthError('Please enter your email address and password.');
      return;
    }

    if (email === DEMO_CUSTOMER.email && password === DEMO_CUSTOMER.password) {
      completeCustomerLogin({ name: DEMO_CUSTOMER.name, email: DEMO_CUSTOMER.email });
      showToast('Welcome back!', 'success');
      return;
    }

    const account = getCustomerAccounts().find(
      (item) => String(item.email || '').trim().toLowerCase() === email && item.password === password
    );
    if (!account) {
      showAuthError('Invalid customer credentials. Use customer@feedbackpro.io / customer123 or create a new account.');
      return;
    }

    completeCustomerLogin({ name: account.name, email: account.email });
    showToast(`Welcome back, ${account.name}!`, 'success');
  });

  signupForm?.addEventListener('submit', (event) => {
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

    const accounts = getCustomerAccounts();
    const duplicate =
      email === DEMO_CUSTOMER.email ||
      accounts.some((item) => String(item.email || '').trim().toLowerCase() === email);
    if (duplicate) {
      showAuthError('An account with this email already exists. Please sign in instead.');
      return;
    }

    const newAccount = {
      id: createId(),
      name,
      email,
      password,
      createdAt: new Date().toISOString()
    };
    saveCustomerAccounts([newAccount, ...accounts]);
    signupForm.reset();
    completeCustomerLogin({ name: newAccount.name, email: newAccount.email });
    showToast(`Welcome, ${name}! Your customer account is ready.`, 'success');
  });

  logoutBtn?.addEventListener('click', () => {
    setCustomerAuth({ isLoggedIn: false });
    syncPortalView();
    showToast('Signed out of Customer Portal.', 'success');
  });

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.cpTab);
    });
  });

  // Star rating interactions (mouse + keyboard)
  starButtons.forEach((button, index) => {
    const starValue = Number(button.dataset.value);

    button.addEventListener('mouseenter', () => {
      updateStarVisuals(starValue);
      if (ratingText) ratingText.textContent = ratingLabels[starValue] || 'Click a star to rate your experience';
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
      ratingText.textContent = selected > 0 ? ratingLabels[selected] : 'Click a star to rate your experience';
    }
  });

  // Recommendation selection cards
  document.querySelectorAll('#cpRecommendationCards .recom-option').forEach((option) => {
    option.addEventListener('click', () => {
      document.querySelectorAll('#cpRecommendationCards .recom-option').forEach((opt) => opt.classList.remove('active'));
      option.classList.add('active');
    });
  });

  reviewTitleInput?.addEventListener('input', () => {
    if (titleCounter) titleCounter.textContent = String(reviewTitleInput.value.length);
  });

  reviewTextInput?.addEventListener('input', () => {
    if (reviewCounter) reviewCounter.textContent = String(reviewTextInput.value.length);
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    showFormError('');

    const auth = getCustomerAuth();
    if (!auth.isLoggedIn) {
      syncPortalView();
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

    setTimeout(() => {
      const analysis = analyzeSentiment(reviewText, rating);
      const newReview = {
        id: createId(),
        customerName,
        email,
        product,
        category,
        rating,
        reviewTitle,
        reviewText,
        recommendation,
        sentiment: analysis.sentiment,
        sentimentScore: analysis.score,
        createdAt: new Date().toISOString(),
        responseStatus: 'pending',
        reply: '',
        replyDate: ''
      };

      const reviews = getReviews();
      reviews.unshift(newReview);
      if (!saveReviews(reviews)) {
        if (submitBtn) submitBtn.disabled = false;
        btnText?.classList.remove('hidden');
        btnLoader?.classList.add('hidden');
        showFormError('Unable to save your feedback right now. Please try again.');
        return;
      }

      const notifications = getNotifications();
      notifications.unshift({
        id: createId(),
        title: 'New customer review',
        message: `${customerName} added a ${analysis.sentiment.toLowerCase()} review for ${product}.`,
        unread: true,
        createdAt: new Date().toISOString()
      });
      saveNotifications(notifications);

      saveSubmissionRecord(newReview.id, auth.email);

      if (submitBtn) submitBtn.disabled = false;
      btnText?.classList.remove('hidden');
      btnLoader?.classList.add('hidden');

      updateSubmissionBadge();
      renderConfirmation(newReview);
      showToast('Thank you! Your feedback has been sent.', 'success');
    }, 350);
  });

  sendAnotherBtn?.addEventListener('click', () => {
    resetFormForAnotherSubmission();
  });

  goToHistoryBtn?.addEventListener('click', () => {
    activeEmailFilter = '';
    switchTab('history');
  });

  lookupForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const enteredEmail = lookupEmailInput.value.trim();
    if (!enteredEmail) {
      activeEmailFilter = '';
      renderHistory();
      return;
    }
    activeEmailFilter = enteredEmail;
    renderHistory();
  });

  resetLookupBtn?.addEventListener('click', () => {
    activeEmailFilter = '';
    const auth = getCustomerAuth();
    if (lookupEmailInput) lookupEmailInput.value = auth.email || '';
    renderHistory();
  });

  // Live updates when admin replies or updates status in another tab
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.reviews || event.key === null) {
      updateSubmissionBadge();
      if (activeTab === 'history') {
        renderHistory();
      }
    }
  });
});
