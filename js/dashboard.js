function renderDashboard() {
  const isDark = document.body.classList.contains('theme-dark');
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
  }

  const reviews = getReviews();
  const selectedRange = document.getElementById('dateRangeFilter')?.value || getSettings().dateRange || '30';
  const customDateRange = document.getElementById('customDateRange');
  if (customDateRange) customDateRange.hidden = selectedRange !== 'custom';
  const categoryFilter = document.getElementById('dashboardCategoryFilter');
  const categories = [...new Set(reviews.map((review) => review.category).filter(Boolean))].sort();
  if (categoryFilter) {
    const previousValue = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="all">All categories</option>' +
      categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
    categoryFilter.value = categories.includes(previousValue) ? previousValue : 'all';
  }
  const filtered = filterReviewsByDate(
    reviews,
    selectedRange,
    document.getElementById('customDateFrom')?.value,
    document.getElementById('customDateTo')?.value
  )
    .filter((review) => !categoryFilter || categoryFilter.value === 'all' || review.category === categoryFilter.value);

  const totalReviews = filtered.length;
  const avgRating = calculateAverageRating(filtered);
  const positiveCount = filtered.filter((r) => r.sentiment === 'Positive').length;
  const negativeCount = filtered.filter((r) => r.sentiment === 'Negative').length;
  const neutralCount = filtered.filter((r) => r.sentiment === 'Neutral').length;
  const satisfaction = calculateCustomerSatisfaction(filtered);

  // Dynamic greeting based on current local time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const welcomeTitle = document.querySelector('.welcome-card h2');
  if (welcomeTitle) {
    welcomeTitle.innerHTML = `${greeting}, Admin <span class="wave-emoji">👋</span>`;
  }

  const welcomeSub = document.querySelector('.welcome-card p:not(.eyebrow)');
  if (welcomeSub) {
    welcomeSub.textContent = `${totalReviews} customer reviews analyzed in this period • ${avgRating.toFixed(1)}/5.0 average rating`;
  }

  const kpiGrid = document.getElementById('kpiGrid');
  if (kpiGrid) {
    const cards = [
      { label: 'Total Reviews', value: totalReviews, detail: 'in selected period', icon: 'fa-comments', tone: 'primary', badge: 'Current dataset' },
      { label: 'Average Rating', value: `${avgRating.toFixed(1)}`, detail: 'out of 5.0 stars', icon: 'fa-star', tone: 'amber', badge: `${totalReviews} ratings` },
      { label: 'Positive Reviews', value: `${((positiveCount / Math.max(totalReviews, 1)) * 100).toFixed(0)}%`, detail: `${positiveCount} positive reviews`, icon: 'fa-thumbs-up', tone: 'green', badge: 'Sentiment share' },
      { label: 'Negative Reviews', value: `${((negativeCount / Math.max(totalReviews, 1)) * 100).toFixed(0)}%`, detail: `${negativeCount} critical reviews`, icon: 'fa-triangle-exclamation', tone: 'rose', badge: 'Sentiment share' },
      { label: 'Neutral Reviews', value: `${((neutralCount / Math.max(totalReviews, 1)) * 100).toFixed(0)}%`, detail: `${neutralCount} neutral reviews`, icon: 'fa-face-meh', tone: 'slate', badge: 'Sentiment share' },
      { label: 'Customer Satisfaction', value: `${satisfaction.toFixed(0)}%`, detail: 'based on review ratings', icon: 'fa-award', tone: 'blue', badge: `${totalReviews} responses` }
    ];

    kpiGrid.innerHTML = cards.map((card) => `
      <div class="kpi-card tone-${card.tone}">
        <div class="kpi-top">
          <span class="kpi-label">${card.label}</span>
          <div class="kpi-icon"><i class="fa-solid ${card.icon}"></i></div>
        </div>
        <div class="kpi-value">${card.value}</div>
        <div class="kpi-bottom">
          <span class="kpi-meta">${card.detail}</span>
          <span class="kpi-badge tone-${card.tone}">${card.badge}</span>
        </div>
      </div>
    `).join('');
  }

  renderTrendChart(filtered);
  renderSentimentChart(filtered);
  renderRatingChart(filtered);
  renderProductChart(filtered);
  renderCategoryChart(filtered);
  renderAnalyticsDetails(filtered);
  renderRecentReviews(filtered);
  renderInsights(filtered);
  renderSatisfactionGauge(satisfaction);
  renderSentimentSummary(filtered);
  renderKeywordInsights(filtered);
  renderAdvancedInsights();
  renderNotificationCenter();
}

function renderAnalyticsDetails(reviews) {
  const kpiGrid = document.getElementById('analyticsKpiGrid');
  if (!kpiGrid) return;

  const total = reviews.length;
  const recommendationCount = reviews.filter((review) => ['Yes', 'No', 'Maybe'].includes(review.recommendation))
    .filter((review) => review.recommendation === 'Yes').length;
  const recommendationResponses = reviews.filter((review) => ['Yes', 'No', 'Maybe'].includes(review.recommendation)).length;
  const negativeCount = reviews.filter((review) => review.sentiment === 'Negative').length;
  const lowRatingCount = reviews.filter((review) => Number(review.rating) <= 2).length;
  const recommendations = recommendationResponses ? Math.round((recommendationCount / recommendationResponses) * 100) : 0;
  const cards = [
    { label: 'Reviews analyzed', value: total, note: 'In the selected filters', icon: 'fa-comments', tone: 'primary' },
    { label: 'Average rating', value: `${calculateAverageRating(reviews).toFixed(1)} / 5`, note: `${reviews.filter((review) => Number(review.rating) > 0).length} rated reviews`, icon: 'fa-star', tone: 'amber' },
    { label: 'Would recommend', value: recommendationResponses ? `${recommendations}%` : '—', note: `${recommendationCount} of ${recommendationResponses} responses`, icon: 'fa-thumbs-up', tone: 'green' },
    { label: 'Needs attention', value: lowRatingCount, note: `${negativeCount} negative sentiment`, icon: 'fa-triangle-exclamation', tone: 'rose' }
  ];
  kpiGrid.innerHTML = cards.map((card) => `
    <article class="analytics-kpi-card tone-${card.tone}">
      <span class="analytics-kpi-icon"><i class="fa-solid ${card.icon}"></i></span>
      <div><span class="analytics-kpi-label">${card.label}</span><strong>${card.value}</strong><small>${card.note}</small></div>
    </article>
  `).join('');

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      date,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      count: reviews.filter((review) => {
        const createdAt = new Date(review.createdAt);
        return createdAt.getMonth() === date.getMonth() && createdAt.getFullYear() === date.getFullYear();
      }).length
    };
  });
  renderAnalyticsTrendChart(months);

  const categoryMap = new Map();
  reviews.forEach((review) => {
    const category = review.category || 'Uncategorized';
    const row = categoryMap.get(category) || { total: 0, ratingTotal: 0, ratings: 0, negative: 0 };
    row.total += 1;
    if (Number(review.rating) > 0) {
      row.ratingTotal += Number(review.rating);
      row.ratings += 1;
    }
    if (review.sentiment === 'Negative') row.negative += 1;
    categoryMap.set(category, row);
  });
  const categoryRows = [...categoryMap.entries()].sort((a, b) => b[1].total - a[1].total);
  const table = document.getElementById('categoryPerformanceBody');
  if (table) {
    table.innerHTML = categoryRows.length
      ? categoryRows.map(([name, row]) => `
        <tr>
          <td><strong>${escapeHtml(name)}</strong></td>
          <td>${row.total}</td>
          <td>${row.ratings ? `${(row.ratingTotal / row.ratings).toFixed(1)} / 5` : '—'}</td>
          <td><span class="analytics-negative-count">${row.negative} <small>(${row.total ? Math.round(row.negative / row.total * 100) : 0}%)</small></span></td>
        </tr>
      `).join('')
      : '<tr><td colspan="4"><div class="empty-state">No category data for these filters.</div></td></tr>';
  }
  renderCategorySentimentChart(reviews);

  const topicTotals = {};
  reviews.filter((review) => review.sentiment === 'Negative').forEach((review) => {
    analyzeSentiment(review.reviewText, review.rating).topics.forEach((topic) => {
      topicTotals[topic] = (topicTotals[topic] || 0) + 1;
    });
  });
  const themes = Object.entries(topicTotals).sort((a, b) => b[1] - a[1]);
  const themeList = document.getElementById('analyticsComplaintThemes');
  if (themeList) {
    themeList.innerHTML = themes.length
      ? themes.map(([topic, count]) => `
        <div class="analytics-theme-row">
          <span><i class="fa-solid fa-hashtag"></i> ${escapeHtml(topic)}</span>
          <strong>${count} <small>${count === 1 ? 'mention' : 'mentions'}</small></strong>
        </div>
      `).join('')
      : '<div class="empty-state">No complaint themes were detected in negative feedback for these filters.</div>';
  }
}

function renderAnalyticsTrendChart(months) {
  const canvas = document.getElementById('analyticsTrendChart');
  if (!canvas) return;
  const isDark = document.body.classList.contains('theme-dark');
  if (typeof Chart !== 'undefined') {
    window.chartInstances = window.chartInstances || {};
    window.chartInstances.analyticsTrend?.destroy();
    window.chartInstances.analyticsTrend = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months.map((month) => month.label),
        datasets: [{
          label: 'Reviews',
          data: months.map((month) => month.count),
          backgroundColor: isDark ? 'rgba(129, 140, 248, 0.8)' : 'rgba(79, 70, 229, 0.82)',
          borderRadius: 7,
          maxBarThickness: 42
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: isDark ? '#94a3b8' : '#64748b' }, border: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0, color: isDark ? '#94a3b8' : '#64748b' }, grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }, border: { display: false } }
        }
      }
    });
    return;
  }
  const maximum = Math.max(1, ...months.map((month) => month.count));
  canvas.parentElement.innerHTML = `<div class="analytics-fallback-chart">${months.map((month) => `
    <div class="analytics-fallback-bar"><strong>${month.count}</strong><span style="height:${Math.max(3, month.count / maximum * 100)}%"></span><small>${escapeHtml(month.label)}</small></div>
  `).join('')}</div>`;
}

function renderCategorySentimentChart(reviews) {
  const canvas = document.getElementById('categorySentimentChart');
  if (!canvas) return;
  const selectedCategories = new Set(reviews.map((review) => review.category || 'Uncategorized'));
  const rows = [...selectedCategories].map((category) => {
    const categoryReviews = reviews.filter((review) => (review.category || 'Uncategorized') === category);
    return {
      category,
      positive: categoryReviews.filter((review) => review.sentiment === 'Positive').length,
      neutral: categoryReviews.filter((review) => review.sentiment === 'Neutral').length,
      negative: categoryReviews.filter((review) => review.sentiment === 'Negative').length
    };
  });
  const isDark = document.body.classList.contains('theme-dark');
  if (typeof Chart !== 'undefined') {
    window.chartInstances = window.chartInstances || {};
    window.chartInstances.categorySentiment?.destroy();
    window.chartInstances.categorySentiment = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: rows.map((row) => row.category),
        datasets: [
          { label: 'Positive', data: rows.map((row) => row.positive), backgroundColor: '#10b981', borderRadius: 3 },
          { label: 'Neutral', data: rows.map((row) => row.neutral), backgroundColor: '#94a3b8', borderRadius: 3 },
          { label: 'Negative', data: rows.map((row) => row.negative), backgroundColor: '#f43f5e', borderRadius: 3 }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, beginAtZero: true, ticks: { precision: 0, color: isDark ? '#94a3b8' : '#64748b' }, grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }, border: { display: false } },
          y: { stacked: true, ticks: { color: isDark ? '#94a3b8' : '#64748b' }, grid: { display: false }, border: { display: false } }
        },
        plugins: { legend: { position: 'bottom', labels: { color: isDark ? '#cbd5e1' : '#475569', usePointStyle: true, padding: 14 } } }
      }
    });
    return;
  }
  canvas.parentElement.innerHTML = rows.length ? rows.map((row) => {
    const total = row.positive + row.neutral + row.negative || 1;
    return `<div class="analytics-sentiment-row"><span>${escapeHtml(row.category)}</span><div><i style="width:${row.positive / total * 100}%;background:#10b981"></i><i style="width:${row.neutral / total * 100}%;background:#94a3b8"></i><i style="width:${row.negative / total * 100}%;background:#f43f5e"></i></div><small>${total}</small></div>`;
  }).join('') : '<div class="empty-state">No category data for these filters.</div>';
}

function renderTrendChart(reviews) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  const isDark = document.body.classList.contains('theme-dark');

  const monthlyData = Array.from({ length: 6 }, (_, idx) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - idx));
    const label = date.toLocaleDateString('en-US', { month: 'short' });
    const count = reviews.filter((review) => new Date(review.createdAt).getMonth() === date.getMonth() && new Date(review.createdAt).getFullYear() === date.getFullYear()).length;
    return { label, count };
  });

  if (typeof Chart !== 'undefined') {
    const ctx2d = ctx.getContext('2d');
    const gradient = ctx2d.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.45)' : 'rgba(79, 70, 229, 0.28)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.00)');

    if (window.chartInstances && window.chartInstances.trend) window.chartInstances.trend.destroy();
    window.chartInstances = window.chartInstances || {};
    window.chartInstances.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthlyData.map((item) => item.label),
        datasets: [{
          label: 'Reviews',
          data: monthlyData.map((item) => item.count),
          borderColor: isDark ? '#818cf8' : '#4f46e5',
          backgroundColor: gradient,
          borderWidth: 2.8,
          fill: true,
          tension: 0.38,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: isDark ? '#0f172a' : '#ffffff',
          pointBorderColor: isDark ? '#818cf8' : '#4f46e5',
          pointBorderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: isDark ? '#94a3b8' : '#64748b' },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: isDark ? '#94a3b8' : '#64748b' },
            grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' },
            border: { display: false }
          }
        }
      }
    });
  } else {
    // Beautiful resilient SVG chart when Chart.js CDN is unavailable
    const maxVal = Math.max(...monthlyData.map((d) => d.count), 5);
    const width = 420;
    const height = 190;
    const padX = 35;
    const padY = 25;
    const stepX = (width - padX * 2) / (monthlyData.length - 1);
    const points = monthlyData.map((d, i) => {
      const x = padX + i * stepX;
      const y = height - padY - (d.count / maxVal) * (height - padY * 2);
      return { x, y, ...d };
    });
    const pathD = points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = prev.x + (p.x - prev.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    }, '');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

    const container = ctx.parentElement;
    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:100%;overflow:visible;">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${isDark ? '#818cf8' : '#4f46e5'}" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="${isDark ? '#818cf8' : '#4f46e5'}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}" stroke-dasharray="3,3" />
        <path d="${areaD}" fill="url(#trendGrad)" />
        <path d="${pathD}" fill="none" stroke="${isDark ? '#818cf8' : '#4f46e5'}" stroke-width="2.8" stroke-linecap="round" />
        ${points.map((p) => `
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="${isDark ? '#0f172a' : '#ffffff'}" stroke="${isDark ? '#818cf8' : '#4f46e5'}" stroke-width="2.5" />
          <text x="${p.x}" y="${height - 8}" font-size="11" fill="${isDark ? '#94a3b8' : '#64748b'}" text-anchor="middle" font-family="Inter, sans-serif">${p.label}</text>
          <text x="${p.x}" y="${p.y - 8}" font-size="10" font-weight="700" fill="${isDark ? '#f8fafc' : '#0f172a'}" text-anchor="middle" font-family="Inter, sans-serif">${p.count}</text>
        `).join('')}
      </svg>
    `;
  }
}

function renderSentimentChart(reviews) {
  const ctx = document.getElementById('sentimentChart');
  if (!ctx) return;
  const isDark = document.body.classList.contains('theme-dark');
  const summary = getSentimentSummary(reviews);
  const total = reviews.length || 1;
  const posPct = Math.round(((summary.Positive || 0) / total) * 100);
  const negPct = Math.round(((summary.Negative || 0) / total) * 100);
  const neuPct = Math.max(0, 100 - posPct - negPct);

  if (typeof Chart !== 'undefined') {
    if (window.chartInstances && window.chartInstances.sentiment) window.chartInstances.sentiment.destroy();
    window.chartInstances = window.chartInstances || {};
    window.chartInstances.sentiment = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Positive', 'Negative', 'Neutral'],
        datasets: [{
          data: [posPct, negPct, neuPct],
          backgroundColor: ['#10b981', '#f43f5e', '#64748b'],
          borderColor: isDark ? '#111827' : '#ffffff',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: isDark ? '#cbd5e1' : '#475569',
              font: { size: 12, weight: '500' },
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ${item.raw}%`
            }
          }
        }
      }
    });
  } else {
    // High-end SVG donut fallback when Chart.js CDN is unavailable
    const r = 58;
    const c = 2 * Math.PI * r;
    const posStroke = (posPct / 100) * c;
    const negStroke = (negPct / 100) * c;
    const neuStroke = (neuPct / 100) * c;

    const container = ctx.parentElement;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
        <div style="position:relative;width:150px;height:150px;">
          <svg viewBox="0 0 160 160" style="width:100%;height:100%;transform:rotate(-90deg);">
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}" stroke-width="18" />
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="#10b981" stroke-width="18" stroke-dasharray="${posStroke} ${c - posStroke}" stroke-dashoffset="0" />
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="#f43f5e" stroke-width="18" stroke-dasharray="${negStroke} ${c - negStroke}" stroke-dashoffset="-${posStroke}" />
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="#64748b" stroke-width="18" stroke-dasharray="${neuStroke} ${c - neuStroke}" stroke-dashoffset="-${posStroke + negStroke}" />
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
            <strong style="font-size:1.4rem;font-weight:750;color:${isDark ? '#f8fafc' : '#0f172a'};line-height:1;">${posPct}%</strong>
            <small style="font-size:0.68rem;color:${isDark ? '#94a3b8' : '#64748b'};margin-top:2px;">Positive</small>
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-top:14px;font-size:0.75rem;color:${isDark ? '#cbd5e1' : '#475569'};font-weight:600;">
          <span style="display:inline-flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:#10b981;"></span> Positive ${posPct}%</span>
          <span style="display:inline-flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:#f43f5e;"></span> Negative ${negPct}%</span>
          <span style="display:inline-flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:#64748b;"></span> Neutral ${neuPct}%</span>
        </div>
      </div>
    `;
  }
}

function renderRatingChart(reviews) {
  const ctx = document.getElementById('ratingChart');
  if (!ctx) return;
  const isDark = document.body.classList.contains('theme-dark');
  const counts = [1, 2, 3, 4, 5].map((rating) => reviews.filter((review) => Number(review.rating) === rating).length);
  const maxCount = Math.max(...counts, 1);

  if (typeof Chart !== 'undefined') {
    if (window.chartInstances && window.chartInstances.rating) window.chartInstances.rating.destroy();
    window.chartInstances = window.chartInstances || {};
    window.chartInstances.rating = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['1 Star ★', '2 Stars ★', '3 Stars ★', '4 Stars ★', '5 Stars ★'],
        datasets: [{
          data: counts,
          backgroundColor: ['#f43f5e', '#fb923c', '#94a3b8', '#60a5fa', '#10b981'],
          borderRadius: 6,
          maxBarThickness: 34
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: isDark ? '#94a3b8' : '#64748b' },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: isDark ? '#94a3b8' : '#64748b' },
            grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' },
            border: { display: false }
          }
        }
      }
    });
  } else {
    // High-end HTML/CSS horizontal rating bars when Chart.js CDN is unavailable
    const colors = ['#f43f5e', '#fb923c', '#94a3b8', '#60a5fa', '#10b981'];
    const labels = ['1 Star ★', '2 Stars ★', '3 Stars ★', '4 Stars ★', '5 Stars ★'];
    const container = ctx.parentElement;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;justify-content:space-around;height:100%;padding:8px 4px;">
        ${counts.map((cnt, i) => `
          <div style="display:flex;align-items:center;gap:10px;font-size:0.75rem;">
            <span style="width:68px;color:${isDark ? '#cbd5e1' : '#475569'};font-weight:600;">${labels[i]}</span>
            <div style="flex:1;height:12px;background:${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};border-radius:99px;overflow:hidden;">
              <div style="width:${(cnt / maxCount) * 100}%;height:100%;background:${colors[i]};border-radius:99px;transition:width 0.4s ease;"></div>
            </div>
            <strong style="width:28px;text-align:right;color:${isDark ? '#f8fafc' : '#0f172a'};">${cnt}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }
}

function renderProductChart(reviews) {
  const ctx = document.getElementById('productChart');
  if (!ctx) return;
  const isDark = document.body.classList.contains('theme-dark');
  const avgByProduct = getTopProducts(reviews).slice(0, 5);

  if (typeof Chart !== 'undefined') {
    if (window.chartInstances && window.chartInstances.product) window.chartInstances.product.destroy();
    window.chartInstances = window.chartInstances || {};
    window.chartInstances.product = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: avgByProduct.map((item) => item.product),
        datasets: [{
          label: 'Avg. Rating',
          data: avgByProduct.map((item) => item.avg),
          backgroundColor: isDark ? '#818cf8' : '#4f46e5',
          borderRadius: 6,
          maxBarThickness: 26
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            max: 5,
            ticks: { color: isDark ? '#94a3b8' : '#64748b' },
            grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' },
            border: { display: false }
          },
          y: {
            grid: { display: false },
            ticks: { color: isDark ? '#94a3b8' : '#64748b' },
            border: { display: false }
          }
        }
      }
    });
  } else {
    const container = ctx.parentElement;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;justify-content:space-around;height:100%;padding:10px 4px;">
        ${avgByProduct.map((item) => `
          <div style="display:flex;align-items:center;gap:12px;font-size:0.78rem;">
            <span style="width:110px;font-weight:600;color:${isDark ? '#cbd5e1' : '#334155'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.product)}</span>
            <div style="flex:1;height:12px;background:${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};border-radius:99px;overflow:hidden;">
              <div style="width:${(item.avg / 5) * 100}%;height:100%;background:${isDark ? '#818cf8' : '#4f46e5'};border-radius:99px;"></div>
            </div>
            <strong style="width:36px;text-align:right;color:${isDark ? '#f8fafc' : '#0f172a'};">${item.avg.toFixed(1)} ★</strong>
          </div>
        `).join('')}
      </div>
    `;
  }
}

function renderCategoryChart(reviews) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  const isDark = document.body.classList.contains('theme-dark');
  const categories = reviews.reduce((acc, review) => {
    acc[review.category] = (acc[review.category] || 0) + 1;
    return acc;
  }, {});

  const labels = Object.keys(categories);
  const data = Object.values(categories);
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const palette = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];

  if (typeof Chart !== 'undefined') {
    if (window.chartInstances && window.chartInstances.category) window.chartInstances.category.destroy();
    window.chartInstances = window.chartInstances || {};
    window.chartInstances.category = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: palette,
          borderColor: isDark ? '#111827' : '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: isDark ? '#cbd5e1' : '#475569', padding: 12, usePointStyle: true }
          }
        },
        scales: {
          r: {
            grid: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' },
            ticks: { display: false }
          }
        }
      }
    });
  } else {
    const container = ctx.parentElement;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;justify-content:space-around;height:100%;padding:10px 4px;">
        ${labels.map((lbl, idx) => `
          <div style="display:flex;align-items:center;gap:12px;font-size:0.78rem;">
            <span style="display:inline-flex;align-items:center;gap:6px;width:130px;font-weight:600;color:${isDark ? '#cbd5e1' : '#334155'};">
              <span style="width:8px;height:8px;border-radius:50%;background:${palette[idx % palette.length]};"></span>
              ${escapeHtml(lbl)}
            </span>
            <div style="flex:1;height:12px;background:${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};border-radius:99px;overflow:hidden;">
              <div style="width:${(data[idx] / total) * 100}%;height:100%;background:${palette[idx % palette.length]};border-radius:99px;"></div>
            </div>
            <strong style="width:38px;text-align:right;color:${isDark ? '#f8fafc' : '#0f172a'};">${data[idx]} (${Math.round((data[idx] / total) * 100)}%)</strong>
          </div>
        `).join('')}
      </div>
    `;
  }
}

function renderRecentReviews(reviews) {
  const container = document.getElementById('recentReviewsList');
  if (!container) return;
  const recent = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  if (!recent.length) {
    container.innerHTML = '<div class="empty-state">No reviews yet. Add a new feedback record to get started.</div>';
    return;
  }
  container.innerHTML = recent.map((review) => {
    const initial = (review.customerName || 'A').charAt(0).toUpperCase();
    const colorIndex = (review.customerName || 'A').charCodeAt(0) % 6;
    return `
      <div class="recent-review-row" role="row">
        <div class="recent-review-customer" role="cell">
          <span class="review-identity tone-${colorIndex}">${escapeHtml(initial)}</span>
          <span class="recent-review-name">
            <strong>${escapeHtml(review.customerName || 'Customer')}</strong>
            <small>${escapeHtml(review.product || 'Feedback')}</small>
          </span>
        </div>
        <span class="recent-review-rating" role="cell" aria-label="${Number(review.rating)} out of 5 stars">
          <span class="rating-stars">${'★'.repeat(Number(review.rating))}${'☆'.repeat(5 - Number(review.rating))}</span>
          <strong class="rating-num">${Number(review.rating).toFixed(1)}</strong>
        </span>
        <span class="${getSentimentClass(review.sentiment || 'Neutral')}" role="cell">
          <span class="badge-dot"></span>
          ${escapeHtml(review.sentiment || 'Neutral')}
        </span>
        <span class="recent-review-date" role="cell">${formatDate(review.createdAt)}</span>
      </div>
    `;
  }).join('');
}

function renderInsights(reviews) {
  const container = document.getElementById('insightsList');
  if (!container) return;
  const lines = buildInsights(reviews);
  const icons = ['fa-bolt', 'fa-chart-line', 'fa-lightbulb', 'fa-circle-exclamation'];
  container.innerHTML = lines.map((insight, idx) => `
    <div class="insight-item">
      <div class="insight-icon"><i class="fa-solid ${icons[idx % icons.length]}"></i></div>
      <div class="insight-content">
        <strong>Insight & Recommendation</strong>
        <span>${escapeHtml(insight)}</span>
      </div>
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
  positiveKeywordsEl.innerHTML = positive.length ? positive.map((item) => `<span class="tag-chip chip-positive"><i class="fa-solid fa-arrow-trend-up"></i> ${item.word} (${item.count})</span>`).join('') : '<span class="tag-chip">No data yet</span>';
  negativeKeywordsEl.innerHTML = negative.length ? negative.map((item) => `<span class="tag-chip chip-negative"><i class="fa-solid fa-arrow-trend-down"></i> ${item.word} (${item.count})</span>`).join('') : '<span class="tag-chip">No data yet</span>';
}

function renderNotificationCenter() {
  const container = document.getElementById('notificationCenterList');
  if (!container) return;
  const notifications = getNotifications();
  if (!notifications.length) {
    container.innerHTML = '<div class="empty-state">No notifications available. All customer feedback is up to date.</div>';
    return;
  }

  container.innerHTML = notifications.map((notification) => `
    <div class="notification-center-card ${notification.unread ? 'unread' : ''}">
      <div class="notification-icon"><i class="fa-solid fa-bell"></i></div>
      <div class="notification-copy">
        <strong>${escapeHtml(notification.title)}</strong>
        <p>${escapeHtml(notification.message)}</p>
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
    list.innerHTML = '<div class="empty-state">No new alerts. All caught up!</div>';
    return;
  }
  list.innerHTML = notifications.map((notification) => `
    <div class="notification-item ${notification.unread ? 'unread' : ''}">
      <div class="notification-icon"><i class="fa-solid fa-bell"></i></div>
      <div class="notification-copy">
        <strong>${escapeHtml(notification.title)}</strong>
        <p>${escapeHtml(notification.message)}</p>
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
  const savedRange = getSettings().dateRange;
  if (dateFilter && savedRange) dateFilter.value = savedRange;
  const savedSettings = getSettings();
  const customDateFrom = document.getElementById('customDateFrom');
  const customDateTo = document.getElementById('customDateTo');
  if (customDateFrom) customDateFrom.value = savedSettings.customDateFrom || '';
  if (customDateTo) customDateTo.value = savedSettings.customDateTo || '';
  if (dateFilter) {
    dateFilter.addEventListener('change', () => {
      const settings = getSettings();
      settings.dateRange = dateFilter.value;
      saveSettings(settings);
      renderDashboard();
    });
  }
  ['customDateFrom', 'customDateTo'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', (event) => {
      const settings = getSettings();
      settings[id] = event.target.value;
      saveSettings(settings);
      renderDashboard();
    });
  });
  document.getElementById('dashboardCategoryFilter')?.addEventListener('change', () => renderDashboard());

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
    showToast('All notifications marked as read', 'success');
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
