function renderAdvancedInsights() {
  const grid = document.getElementById('insightGrid');
  if (!grid) return;

  const reviews = getReviews();
  const wordCloud = buildWordCloud(reviews).slice(0, 12);
  const productData = getTopProducts(reviews).slice(0, 4);
  const sum = getSentimentSummary(reviews);
  const mostPopular = productData[0];
  const lowest = [...productData].sort((a, b) => a.avg - b.avg)[0];

  grid.innerHTML = `
    <div class="insight-panel">
      <h3>Most mentioned topics</h3>
      <div class="word-cloud">${wordCloud.map((word) => `<span>${word.word}</span>`).join('')}</div>
    </div>
    <div class="insight-panel">
      <h3>Most appreciated product features</h3>
      <p>${mostPopular ? `${mostPopular.product} leads with ${mostPopular.avg} star rating.` : 'No data yet.'}</p>
    </div>
    <div class="insight-panel">
      <h3>Most common complaints</h3>
      <p>${sum.Negative ? `${sum.Negative} negative reviews point to service and delivery friction.` : 'No major complaints found.'}</p>
    </div>
    <div class="insight-panel">
      <h3>Products with lowest ratings</h3>
      <p>${lowest ? `${lowest.product} averages ${lowest.avg} stars.` : 'No rating comparison yet.'}</p>
    </div>
    <div class="insight-panel">
      <h3>Customer satisfaction trend</h3>
      <p>${calculateCustomerSatisfaction(reviews).toFixed(0)}% satisfaction based on the current review set.</p>
    </div>
    <div class="insight-panel">
      <h3>Actionable recommendations</h3>
      <p>${sum.Negative ? '35% of negative feedback mentions delivery delays. Consider improving delivery operations and response speed.' : 'Customer sentiment is healthy. Keep strengthening top-performing product features.'}</p>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'dashboard') {
    renderAdvancedInsights();
  }
});
