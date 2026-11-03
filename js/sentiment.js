const SENTIMENT_LEXICON = {
  positive: ['amazing', 'awesome', 'beautiful', 'best', 'delighted', 'easy', 'excellent', 'fast', 'friendly', 'good', 'great', 'happy', 'helpful', 'impressive', 'intuitive', 'love', 'perfect', 'reliable', 'satisfied', 'smooth', 'wonderful'],
  negative: ['awful', 'bad', 'broken', 'confusing', 'damaged', 'disappointed', 'expensive', 'frustrating', 'horrible', 'late', 'poor', 'problem', 'refund', 'rude', 'slow', 'terrible', 'unhappy', 'unhelpful', 'unreliable', 'useless', 'worst'],
  neutral: ['acceptable', 'average', 'fine', 'moderate', 'okay', 'ordinary', 'standard']
};

const FEEDBACK_TOPICS = {
  delivery: ['delivery', 'shipping', 'shipment', 'arrived', 'arrival', 'tracking', 'package', 'late'],
  support: ['support', 'service', 'agent', 'staff', 'team', 'response', 'communication', 'help'],
  pricing: ['price', 'pricing', 'cost', 'expensive', 'cheap', 'value', 'billing', 'charge'],
  product: ['product', 'quality', 'feature', 'features', 'broken', 'defect', 'reliable', 'performance'],
  usability: ['website', 'app', 'interface', 'navigation', 'setup', 'onboarding', 'easy', 'confusing']
};

const URGENT_TERMS = ['urgent', 'immediately', 'unsafe', 'safety', 'fraud', 'chargeback', 'data loss', 'outage', 'unusable', 'emergency'];
const NEGATIONS = new Set(['not', 'no', 'never', 'hardly', 'isnt', 'wasnt', 'dont', 'didnt', 'cannot', 'cant']);
const INTENSIFIERS = new Set(['very', 'really', 'extremely', 'incredibly', 'so']);

function analyzeSentiment(text, rating) {
  const normalized = String(text || '').toLowerCase();
  const scoreRating = Number.isFinite(Number(rating)) && Number(rating) >= 1 && Number(rating) <= 5
    ? Number(rating)
    : 0;
  const tokens = normalized.match(/[a-z']+/g) || [];
  const keywordBreakdown = { positive: [], negative: [], neutral: [] };
  let score = 0;
  let previousTokens = [];

  tokens.forEach((token) => {
    let polarity = SENTIMENT_LEXICON.positive.includes(token) ? 1 : SENTIMENT_LEXICON.negative.includes(token) ? -1 : 0;
    if (polarity) {
      if (previousTokens.some((word) => NEGATIONS.has(word))) polarity *= -1;
      if (previousTokens.some((word) => INTENSIFIERS.has(word))) polarity *= 1.5;
      score += polarity;
      keywordBreakdown[polarity > 0 ? 'positive' : 'negative'].push(token);
    } else if (SENTIMENT_LEXICON.neutral.includes(token)) {
      keywordBreakdown.neutral.push(token);
    }
    previousTokens = [...previousTokens.slice(-2), token];
  });

  if (scoreRating) {
    score += (scoreRating - 3) * 0.6;
  }

  const sentiment = score > 0.35 ? 'Positive' : score < -0.35 ? 'Negative' : 'Neutral';
  const topics = Object.entries(FEEDBACK_TOPICS)
    .filter(([, terms]) => terms.some((term) => normalized.includes(term)))
    .map(([topic]) => topic);
  const urgent = URGENT_TERMS.some((term) => normalized.includes(term));
  const evidence = [...keywordBreakdown.negative, ...keywordBreakdown.positive].slice(0, 3);
  const explanation = evidence.length
    ? `Classified as ${sentiment.toLowerCase()} based on ${evidence.join(', ')}${scoreRating ? ` and a ${scoreRating}-star rating` : ''}.`
    : `Classified as ${sentiment.toLowerCase()}${scoreRating ? ` with a ${scoreRating}-star rating` : ''}; no strong sentiment terms were detected.`;
  const topic = topics[0];
  const suggestions = {
    delivery: 'Review shipment tracking and delivery handoffs; follow up with the customer on the delayed order.',
    support: 'Review the support interaction and response time; assign an owner for customer follow-up.',
    pricing: 'Review plan fit and billing clarity; explain available options before proposing a pricing change.',
    product: 'Reproduce the reported product issue and route it to the product team with the review details.',
    usability: 'Walk through the reported setup or navigation friction and prioritize the simplest usability fix.'
  };
  const suggestion = sentiment === 'Negative'
    ? suggestions[topic] || 'Follow up with the customer, clarify the issue, and assign an owner to investigate.'
    : sentiment === 'Positive'
      ? 'Thank the customer and share the specific praise with the responsible product or service team.'
      : 'Review the specific feedback with the customer and monitor for a recurring theme.';

  return {
    sentiment,
    score: Number(score.toFixed(1)),
    keywords: keywordBreakdown,
    positiveCount: keywordBreakdown.positive.length,
    negativeCount: keywordBreakdown.negative.length,
    neutralCount: keywordBreakdown.neutral.length,
    topics,
    urgent,
    explanation,
    suggestion
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
    const sentiment = review.sentiment || analyzeSentiment(review.reviewText, review.rating).sentiment;
    totals[sentiment] = (totals[sentiment] || 0) + 1;
  });

  return totals;
}

function aggregateKeywords(reviews) {
  const map = { Positive: {}, Negative: {} };
  reviews.forEach((review) => {
    const result = analyzeSentiment(review.reviewText, review.rating);
    result.keywords.positive.forEach((word) => {
      map.Positive[word] = (map.Positive[word] || 0) + 1;
    });
    result.keywords.negative.forEach((word) => {
      map.Negative[word] = (map.Negative[word] || 0) + 1;
    });
  });

  const sortTerms = (terms) => Object.entries(terms)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  return { positive: sortTerms(map.Positive), negative: sortTerms(map.Negative) };
}
