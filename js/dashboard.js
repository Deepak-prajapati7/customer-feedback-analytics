function renderDashboard() {
  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#667085';

  const reviews = getReviews();
  const selectedRange = document.getElementById('dateRangeFilter')?.value || getSettings().dateRange || '30';
  const filtered = filterReviewsByDate(reviews, selectedRange);

  const totalReviews = filtered.length;
  const avgRating = calculateAverageRating(filtered);
  const positiveCount = filtered.filter((r) => r.sentiment === 'Positive').length;
  const negativeCount = filtered.filter((r) => r.sentiment === 'Negative').length;
  const neutralCount = filtered.filter((r) => r.sentiment === 'Neutral').length;
  const satisfaction = calculateCustomerSatisfaction(filtered);

  const kpiGrid = document.getElementById('kpiGrid');
  if (kpiGrid) {
    const cards = [
      { label: 'Total Reviews', value: totalReviews, detail: 'in selected period', icon: 'fa-comment-dots', tone: 'primary' },
      { label: 'Average Rating', value: `${avgRating.toFixed(1)}`, detail: 'out of 5 stars', icon: 'fa-star', tone: 'amber' },
      { label: 'Positive Reviews', value: `${((positiveCount / Math.max(totalReviews, 1)) * 100).toFixed(0)}%`, detail: `${positiveCount} positive reviews`, icon: 'fa-thumbs-up', tone: 'green' },
      { label: 'Negative Reviews', value: `${((negativeCount / Math.max(totalReviews, 1)) * 100).toFixed(0)}%`, detail: `${negativeCount} reviews`, icon: 'fa-thumbs-down', tone: 'rose' },
      { label: 'Neutral Reviews', value: `${((neutralCount / Math.max(totalReviews, 1)) * 100).toFixed(0)}%`, detail: `${neutralCount} reviews`, icon: 'fa-face-meh', tone: 'slate' },
      { label: 'Customer Satisfaction', value: `${satisfaction.toFixed(0)}%`, detail: 'based on review ratings', icon: 'fa-trophy', tone: 'blue' }
    ];

    kpiGrid.innerHTML = cards.map((card) => `
      <div class="kpi-card tone-${card.tone}">
        <div class="kpi-top">
          <span class="kpi-label">${card.label}</span>
          <div class="kpi-icon"><i class="fa-solid ${card.icon}"></i></div>
        </div>
        <div class="kpi-value">${card.value}</div>
        <div class="kpi-meta">${card.detail}</div>
      </div>
    `).join('');
  }

  renderTrendChart(filtered);
  renderSentimentChart(filtered);
  renderRatingChart(filtered);
  renderProductChart(filtered);
  renderCategoryChart(filtered);
  renderRecentReviews(filtered);
  renderInsights(filtered);
  renderSatisfactionGauge(satisfaction);
  renderSentimentSummary(filtered);
  renderKeywordInsights(filtered);
  renderAdvancedInsights();
  renderNotificationCenter();
}

function renderTrendChart(reviews) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;

  const monthlyData = Array.from({ length: 6 }, (_, idx) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - idx));
    const label = date.toLocaleDateString('en-US', { month: 'short' });
    const count = reviews.filter((review) => new Date(review.createdAt).getMonth() === date.getMonth() && new Date(review.createdAt).getFullYear() === date.getFullYear()).length;
    return { label, count };
  });

  if (window.chartInstances && window.chartInstances.trend) window.chartInstances.trend.destroy();
  window.chartInstances = window.chartInstances || {};
  window.chartInstances.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthlyData.map((item) => item.label),
      datasets: [{
        label: 'Reviews',
        data: monthlyData.map((item) => item.count),
        borderColor: '#6547f5',
        backgroundColor: 'rgba(101,71,245,0.16)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointRadius: 3.5,
        pointHoverRadius: 6,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#6547f5',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(16,24,40,0.06)' }, border: { display: false } }
      }
    }
  });
}

function renderSentimentChart(reviews) {
  const ctx = document.getElementById('sentimentChart');
  if (!ctx) return;
  const summary = getSentimentSummary(reviews);
  const total = reviews.length || 1;
  const data = [
    ((summary.Positive || 0) / total) * 100,
    ((summary.Negative || 0) / total) * 100,
    ((summary.Neutral || 0) / total) * 100
  ];

  if (window.chartInstances && window.chartInstances.sentiment) window.chartInstances.sentiment.destroy();
  window.chartInstances.sentiment = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Positive', 'Negative', 'Neutral'],
      datasets: [{
        data,
        backgroundColor: ['#17a879', '#ef5365', '#9ba9bf'],
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderRatingChart(reviews) {
  const ctx = document.getElementById('ratingChart');
  if (!ctx) return;
  const counts = [1, 2, 3, 4, 5].map((rating) => reviews.filter((review) => Number(review.rating) === rating).length);

  if (window.chartInstances && window.chartInstances.rating) window.chartInstances.rating.destroy();
  window.chartInstances.rating = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['1★', '2★', '3★', '4★', '5★'],
      datasets: [{
        data: counts,
        backgroundColor: ['#ff647c', '#ffb547', '#9ba9bf', '#518cf5', '#16b889'],
        borderRadius: 5,
        maxBarThickness: 30
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(16,24,40,0.06)' }, border: { display: false } }
      }
    }
  });
}

function renderProductChart(reviews) {
  const ctx = document.getElementById('productChart');
  if (!ctx) return;
  const avgByProduct = getTopProducts(reviews).slice(0, 5);

  if (window.chartInstances && window.chartInstances.product) window.chartInstances.product.destroy();
  window.chartInstances.product = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: avgByProduct.map((item) => item.product),
      datasets: [{
        label: 'Avg. Rating',
        data: avgByProduct.map((item) => item.avg),
        backgroundColor: '#6554ee',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, max: 5, grid: { color: 'rgba(16,24,40,0.06)' }, border: { display: false } },
        y: { grid: { display: false }, border: { display: false } }
      }
    }
  });
}

function renderCategoryChart(reviews) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  const categories = reviews.reduce((acc, review) => {
    acc[review.category] = (acc[review.category] || 0) + 1;
    return acc;
  }, {});

  const labels = Object.keys(categories);
  const data = Object.values(categories);

  if (window.chartInstances && window.chartInstances.category) window.chartInstances.category.destroy();
  window.chartInstances.category = new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#6554ee', '#17a879', '#f3a83b', '#ef5365', '#2e9ed1', '#a047d1'],
        borderColor: '#ffffff',
        borderWidth: 1
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderRecentReviews(reviews) {
  const container = document.getElementById('recentReviewsList');
  if (!container) return;
  const recent = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  if (!recent.length) {
    container.innerHTML = '<div class="empty-state">No reviews yet. Add a new feedback record to get started.</div>';
    return;
  }
  container.innerHTML = recent.map((review) => `
    <div class="recent-review-row" role="row">
      <div class="recent-review-customer" role="cell">
        <span class="review-identity">${escapeHtml((review.customerName || 'A').charAt(0).toUpperCase())}</span>
        <span class="recent-review-name">
          <strong>${escapeHtml(review.customerName || 'Customer')}</strong>
          <small>${escapeHtml(review.product || 'Feedback')}</small>
        </span>
      </div>
      <span class="recent-review-rating" role="cell" aria-label="${Number(review.rating)} out of 5 stars">
        <span class="rating-stars">${'★'.repeat(Number(review.rating))}${'☆'.repeat(5 - Number(review.rating))}</span>
      </span>
      <span class="${getSentimentClass(review.sentiment || 'Neutral')}" role="cell">${escapeHtml(review.sentiment || 'Neutral')}</span>
      <span class="recent-review-date" role="cell">${formatDate(review.createdAt)}</span>
    </div>
  `).join('');
}

function renderInsights(reviews) {
  const container = document.getElementById('insightsList');
  if (!container) return;
  const lines = buildInsights(reviews);
  container.innerHTML = lines.map((insight) => `
    <div class="insight-item">
      <strong>Insight</strong>
      <span>${insight}</span>
    </div>
  `).join('');
}

function renderSatisfactionGauge(satisfaction) {
  const value = document.getElementById('satisfactionValue');
  if (!value) return;
  const percentage = Math.min(100, Math.max(0, satisfaction));
  value.textContent = `${percentage.toFixed(0)}%`;
  const gauge = document.querySelector('.gauge');
  if (gauge) {
    const degrees = Math.round((percentage / 100) * 360);
    gauge.style.background = `conic-gradient(var(--secondary) 0deg ${degrees}deg, var(--line) ${degrees}deg 360deg)`;
  }
}

function renderSentimentSummary(reviews) {
  const positive = document.getElementById('positivePercent');
  const negative = document.getElementById('negativePercent');
  const neutral = document.getElementById('neutralPercent');
  if (!positive || !negative || !neutral) return;
  const total = reviews.length || 1;
  const summary = getSentimentSummary(reviews);
  positive.textContent = `${((summary.Positive || 0) / total * 100).toFixed(0)}%`;
  negative.textContent = `${((summary.Negative || 0) / total * 100).toFixed(0)}%`;
  neutral.textContent = `${((summary.Neutral || 0) / total * 100).toFixed(0)}%`;
}

function renderKeywordInsights(reviews) {
  const positiveKeywordsEl = document.getElementById('positiveKeywords');
  const negativeKeywordsEl = document.getElementById('negativeKeywords');
  if (!positiveKeywordsEl || !negativeKeywordsEl) return;
  const { positive, negative } = aggregateKeywords(reviews);
  positiveKeywordsEl.innerHTML = positive.length ? positive.map((item) => `<span class="tag-chip">${item.word} (${item.count})</span>`).join('') : '<span class="tag-chip">No data yet</span>';
  negativeKeywordsEl.innerHTML = negative.length ? negative.map((item) => `<span class="tag-chip">${item.word} (${item.count})</span>`).join('') : '<span class="tag-chip">No data yet</span>';
}

function renderNotificationCenter() {
  const container = document.getElementById('notificationCenterList');
  if (!container) return;
  const notifications = getNotifications();
  if (!notifications.length) {
    container.innerHTML = '<div class="empty-state">No notifications available.</div>';
    return;
  }

  container.innerHTML = notifications.map((notification) => `
    <div class="notification-center-card ${notification.unread ? 'unread' : ''}">
      <div class="notification-icon"><i class="fa-solid fa-bell"></i></div>
      <div class="notification-copy">
        <strong>${notification.title}</strong>
        <p>${notification.message}</p>
      </div>
      <button class="text-btn" data-id="${notification.id}">Mark read</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const notifications = getNotifications().map((item) => item.id === button.dataset.id ? { ...item, unread: false } : item);
      saveNotifications(notifications);
      renderNotificationCenter();
      updateNotificationBadge();
    });
  });
}

function updateNotificationBadge() {
  const badge = document.getElementById('notificationBadge');
  if (!badge) return;
  const count = getNotifications().filter((notification) => notification.unread).length;
  badge.textContent = count;
  badge.style.display = count ? 'grid' : 'none';
}

function renderNotificationList() {
  const list = document.getElementById('notificationList');
  if (!list) return;
  const notifications = getNotifications().slice(0, 5);
  if (!notifications.length) {
    list.innerHTML = '<div class="empty-state">No new alerts.</div>';
    return;
  }
  list.innerHTML = notifications.map((notification) => `
    <div class="notification-item ${notification.unread ? 'unread' : ''}">
      <div class="notification-icon"><i class="fa-solid fa-bell"></i></div>
      <div class="notification-copy">
        <strong>${notification.title}</strong>
        <p>${notification.message}</p>
      </div>
      <button class="text-btn small" data-id="${notification.id}">Read</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const notifications = getNotifications().map((item) => item.id === button.dataset.id ? { ...item, unread: false } : item);
      saveNotifications(notifications);
      renderNotificationList();
      renderNotificationCenter();
      updateNotificationBadge();
    });
  });
}

function setupDashboardInteractions() {
  const dateFilter = document.getElementById('dateRangeFilter');
  if (dateFilter) {
    dateFilter.addEventListener('change', () => {
      const settings = getSettings();
      settings.dateRange = dateFilter.value;
      saveSettings(settings);
      renderDashboard();
    });
  }

  const globalSearch = document.getElementById('globalSearch');
  if (globalSearch) {
    globalSearch.addEventListener('input', () => {
      const query = globalSearch.value.trim().toLowerCase();
      const reviews = getReviews();
      const filtered = reviews.filter((review) => {
        return (review.customerName || '').toLowerCase().includes(query) ||
          (review.product || '').toLowerCase().includes(query) ||
          (review.reviewText || '').toLowerCase().includes(query);
      });
      renderRecentReviews(filtered);
      renderInsights(filtered);
      renderSentimentSummary(filtered);
      renderKeywordInsights(filtered);
      renderSatisfactionGauge(calculateCustomerSatisfaction(filtered));
    });
  }

  const exportBtn = document.getElementById('exportReviewsBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportReviewsCsv(getReviews()));
  }

  const pdfBtn = document.getElementById('pdfReportBtn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', () => generateReportPdf());
  }

  const printBtn = document.getElementById('printReportBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
    const notifications = getNotifications().map((item) => ({ ...item, unread: false }));
    saveNotifications(notifications);
    renderNotificationList();
    renderNotificationCenter();
    updateNotificationBadge();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'dashboard') {
    setupDashboardInteractions();
    renderDashboard();
    renderNotificationList();
    updateNotificationBadge();
    initializeReviewFilters();
    renderReviewsTable(getReviews());
  }
});
