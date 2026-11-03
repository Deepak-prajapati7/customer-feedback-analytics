function buildReportSummary() {
  const reviews = getReviews();
  const sentimentSummary = getSentimentSummary(reviews);
  const total = reviews.length;
  const avgRating = calculateAverageRating(reviews);
  return {
    total,
    avgRating,
    positive: sentimentSummary.Positive || 0,
    negative: sentimentSummary.Negative || 0,
    neutral: sentimentSummary.Neutral || 0,
    insights: buildInsights(reviews),
    recommendations: [
      'Improve delivery response time and shipping accuracy.',
      'Continue investing in the highest-rated product features.',
      'Focus support training on recurring service complaints.'
    ]
  };
}

function renderReportSummary() {
  const target = document.getElementById('reportSummary');
  if (!target) return;
  const summary = buildReportSummary();
  target.innerHTML = `
    <div class="summary-grid">
      <div class="summary-item"><span>Total reviews</span><strong>${summary.total}</strong></div>
      <div class="summary-item"><span>Average rating</span><strong>${summary.avgRating.toFixed(1)}</strong></div>
      <div class="summary-item"><span>Positive</span><strong>${summary.positive}</strong></div>
      <div class="summary-item"><span>Negative</span><strong>${summary.negative}</strong></div>
    </div>
    <div class="insight-list" style="margin-top: 1rem;">
      <h3>Key insights</h3>
      <ul>
        ${summary.insights.map((item) => `<li>${item}</li>`).join('')}
      </ul>
      <h3>Recommendations</h3>
      <ul>
        ${summary.recommendations.map((item) => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `;
}

function generateReportPdf() {
  const { jsPDF } = window.jspdf;
  const summary = buildReportSummary();
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('FeedbackPro Analytics Report', 14, 20);
  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  doc.text(`Total reviews: ${summary.total}`, 14, 40);
  doc.text(`Average rating: ${summary.avgRating.toFixed(1)}`, 14, 48);
  doc.text(`Positive: ${summary.positive} | Neutral: ${summary.neutral} | Negative: ${summary.negative}`, 14, 56);
  let y = 72;
  summary.insights.forEach((item) => {
    doc.text(`• ${item}`, 14, y);
    y += 10;
  });
  y += 8;
  doc.text('Recommendations:', 14, y);
  y += 8;
  summary.recommendations.forEach((item) => {
    doc.text(`• ${item}`, 14, y);
    y += 8;
  });
  doc.save('feedbackpro-report.pdf');
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'dashboard') {
    renderReportSummary();
  }
});
