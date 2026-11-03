function renderAdvancedInsights() {
  const grid = document.getElementById('insightGrid');
  if (!grid) return;

  const reviews = getReviews();
  const wordCloud = buildWordCloud(reviews).slice(0, 12);
  const productData = getTopProducts(reviews).slice(0, 4);
  const sum = getSentimentSummary(reviews);
  const mostPopular = productData[0];
  const lowest = [...productData].sort((a, b) => a.avg - b.avg)[0];
  const negativeReviews = reviews.filter((review) => review.sentiment === 'Negative');
  const topicCounts = {};
  negativeReviews.forEach((review) => analyzeSentiment(review.reviewText, review.rating).topics.forEach((topic) => {
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  }));
  const topComplaint = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0];

  grid.innerHTML = `
    <div class="insight-panel">
      <h3>Most mentioned topics</h3>
      <div class="word-cloud">${wordCloud.map((word) => `<span>${word.word}</span>`).join('')}</div>
    </div>
    <div class="insight-panel">
      <h3>Most appreciated product features</h3>
      <p>${mostPopular ? `${escapeHtml(mostPopular.product)} leads with ${mostPopular.avg} star rating.` : 'No data yet.'}</p>
    </div>
    <div class="insight-panel">
      <h3>Most common complaints</h3>
      <p>${topComplaint ? `${topComplaint[1]} negative review${topComplaint[1] === 1 ? '' : 's'} mention ${escapeHtml(topComplaint[0])}.` : negativeReviews.length ? `${negativeReviews.length} negative reviews need review; no common topic matched confidently.` : 'No negative reviews are present in this dataset.'}</p>
    </div>
    <div class="insight-panel">
      <h3>Products with lowest ratings</h3>
      <p>${lowest ? `${escapeHtml(lowest.product)} averages ${lowest.avg} stars.` : 'No rating comparison yet.'}</p>
    </div>
    <div class="insight-panel">
      <h3>Customer satisfaction</h3>
      <p>${calculateCustomerSatisfaction(reviews).toFixed(0)}% rating-based satisfaction across ${reviews.length} reviews.</p>
    </div>
    <div class="insight-panel">
      <h3>Actionable recommendations</h3>
      <p>${topComplaint ? `Review the ${escapeHtml(topComplaint[0])} complaints, assign an owner, and follow up with affected customers.` : sum.Negative ? 'Review negative feedback individually and monitor for a recurring topic.' : 'No negative sentiment was detected; continue collecting feedback to validate current performance.'}</p>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'dashboard') {
    renderAdvancedInsights();
  }
});
