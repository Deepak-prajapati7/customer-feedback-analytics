function filterReviewsByDate(reviews, rangeValue) {
  const now = new Date();
  const filtered = reviews.filter((review) => {
    const date = new Date(review.createdAt);
    if (!rangeValue || rangeValue === 'all') return true;
    if (rangeValue === 'today') {
      return date.toDateString() === now.toDateString();
    }
    if (rangeValue === '7') {
      const diff = (now - date) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }
    if (rangeValue === '30') {
      const diff = (now - date) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    }
    if (rangeValue === '90') {
      const diff = (now - date) / (1000 * 60 * 60 * 24);
      return diff <= 90;
    }
    return true;
  });
  return filtered;
}

function calculateAverageRating(reviews) {
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return Number((total / reviews.length).toFixed(1));
}

function calculateCustomerSatisfaction(reviews) {
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const percentage = (total / (reviews.length * 5)) * 100;
  return Number(percentage.toFixed(1));
}

function getTopProducts(reviews) {
  const map = {};
  reviews.forEach((review) => {
    if (!map[review.product]) map[review.product] = { total: 0, average: 0, count: 0 };
    map[review.product].total += Number(review.rating || 0);
    map[review.product].count += 1;
  });
  return Object.entries(map)
    .map(([product, data]) => ({ product, avg: Number((data.total / data.count).toFixed(1)) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6);
}

function buildInsights(reviews) {
  if (!reviews.length) {
    return ['No reviews available to generate insights yet.'];
  }

  const sentimentSummary = getSentimentSummary(reviews);
  const positive = sentimentSummary.Positive || 0;
  const negative = sentimentSummary.Negative || 0;
  const total = reviews.length;
  const topCategory = Object.entries(
    reviews.reduce((acc, review) => {
      acc[review.category] = (acc[review.category] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  const avgRating = calculateAverageRating(reviews);
  const productRatings = getTopProducts(reviews);
  const mostPopularProduct = productRatings[0];
  const negativeDeliveryCount = reviews.filter((review) => review.category === 'Delivery' && review.sentiment === 'Negative').length;

  const insightLines = [
    `${positive >= negative ? 'Customer satisfaction is trending positively' : 'Customer satisfaction needs attention'} with an average rating of ${avgRating.toFixed(1)} across ${total} reviews.`,
    topCategory ? `${topCategory[0]} is the most frequently mentioned category in feedback.` : 'No recurring category yet.',
    negativeDeliveryCount ? `${negativeDeliveryCount} delivery-related negative reviews highlight a clear area to improve.` : 'Delivery reviews are mostly positive this period.',
    mostPopularProduct ? `${mostPopularProduct.product} receives the highest average rating at ${mostPopularProduct.avg} stars.` : 'No product performance insight yet.'
  ];

  return insightLines;
}

function buildWordCloud(reviews) {
  const counts = {};
  reviews.forEach((review) => {
    const text = (review.reviewText || '').toLowerCase();
    const matches = text.match(/[a-z']+/g) || [];
    matches.forEach((word) => {
      if (word.length > 3) {
        counts[word] = (counts[word] || 0) + 1;
      }
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
}

function getRangeLabel(rangeValue) {
  if (rangeValue === 'today') return 'Today';
  if (rangeValue === '7') return 'Last 7 days';
  if (rangeValue === '30') return 'Last 30 days';
  if (rangeValue === '90') return 'Last 90 days';
  return 'All time';
}
