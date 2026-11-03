function analyzeSentiment(text) {
  const positiveWords = ['excellent', 'amazing', 'good', 'great', 'wonderful', 'satisfied', 'happy', 'love', 'perfect', 'helpful', 'fast'];
  const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'disappointed', 'slow', 'broken', 'unhappy', 'useless', 'expensive', 'late'];
  const neutralWords = ['average', 'okay', 'normal', 'acceptable', 'moderate'];

  const normalized = (text || '').toLowerCase();
  const tokens = normalized.match(/[a-z]+/g) || [];

  let score = 0;
  const keywordBreakdown = { positive: [], negative: [], neutral: [] };

  tokens.forEach((token) => {
    if (positiveWords.includes(token)) {
      score += 1;
      keywordBreakdown.positive.push(token);
    }
    if (negativeWords.includes(token)) {
      score -= 1;
      keywordBreakdown.negative.push(token);
    }
    if (neutralWords.includes(token)) {
      score += 0;
      keywordBreakdown.neutral.push(token);
    }
  });

  let sentiment = 'Neutral';
  if (score > 1) sentiment = 'Positive';
  if (score < -1) sentiment = 'Negative';

  return {
    sentiment,
    score,
    keywords: keywordBreakdown,
    positiveCount: keywordBreakdown.positive.length,
    negativeCount: keywordBreakdown.negative.length,
    neutralCount: keywordBreakdown.neutral.length
  };
}

function getSentimentClass(label) {
  if (label === 'Positive') return 'badge-positive';
  if (label === 'Negative') return 'badge-negative';
  return 'badge-neutral';
}

function getSentimentSummary(reviews) {
  const totals = { Positive: 0, Negative: 0, Neutral: 0 };
  reviews.forEach((review) => {
    const sentiment = review.sentiment || analyzeSentiment(review.reviewText).sentiment;
    totals[sentiment] = (totals[sentiment] || 0) + 1;
  });

  return totals;
}

function aggregateKeywords(reviews) {
  const map = { Positive: {}, Negative: {} };
  reviews.forEach((review) => {
    const result = analyzeSentiment(review.reviewText);
    const bucket = result.sentiment === 'Negative' ? map.Negative : map.Positive;
    result.keywords.positive.forEach((word) => {
      bucket[word] = (bucket[word] || 0) + 1;
    });
    result.keywords.negative.forEach((word) => {
      if (!map.Negative[word]) map.Negative[word] = 0;
      map.Negative[word] += 1;
    });
  });

  const positive = Object.entries(map.Positive)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  const negative = Object.entries(map.Negative)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  return { positive, negative };
}
