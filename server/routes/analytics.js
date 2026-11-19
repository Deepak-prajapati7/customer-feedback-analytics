/**
 * Analytics and Export Route Handler
 */

const { db } = require('../db');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function handleGetSummary(req, res) {
  const reviews = db.getReviews();
  const total = reviews.length;

  if (total === 0) {
    return sendJson(res, 200, {
      totalReviews: 0,
      averageRating: 0,
      npsScore: 0,
      responseRate: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pendingCount: 0,
      respondedCount: 0,
      urgentCount: 0
    });
  }

  const sumRatings = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  const avgRating = Number((sumRatings / total).toFixed(2));

  // NPS: (Promoters [4-5] - Detractors [1-2]) / Total * 100
  const promoters = reviews.filter((r) => r.rating >= 4).length;
  const detractors = reviews.filter((r) => r.rating <= 2).length;
  const npsScore = Math.round(((promoters - detractors) / total) * 100);

  // Response rate
  const respondedCount = reviews.filter((r) => r.responseStatus === 'responded').length;
  const pendingCount = total - respondedCount;
  const responseRate = Math.round((respondedCount / total) * 100);

  // Sentiment distribution
  const sentimentDistribution = {
    positive: reviews.filter((r) => r.sentiment === 'Positive').length,
    neutral: reviews.filter((r) => r.sentiment === 'Neutral').length,
    negative: reviews.filter((r) => r.sentiment === 'Negative').length
  };

  // Rating distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 1)));
    ratingDistribution[star]++;
  });

  // Urgent feedback count
  const urgentCount = reviews.filter((r) => r.urgent).length;

  // Breakdown by product
  const productStats = {};
  reviews.forEach((r) => {
    if (!productStats[r.product]) {
      productStats[r.product] = { count: 0, totalRating: 0 };
    }
    productStats[r.product].count++;
    productStats[r.product].totalRating += Number(r.rating) || 0;
  });
  const products = Object.entries(productStats).map(([name, stat]) => ({
    product: name,
    count: stat.count,
    avgRating: Number((stat.totalRating / stat.count).toFixed(2))
  }));

  return sendJson(res, 200, {
    totalReviews: total,
    averageRating: avgRating,
    npsScore,
    responseRate,
    respondedCount,
    pendingCount,
    urgentCount,
    sentimentDistribution,
    ratingDistribution,
    products,
    version: db.getVersion()
  });
}

function handleExportCsv(req, res) {
  const reviews = db.getReviews();
  const headers = [
    'ID', 'Date', 'Customer Name', 'Email', 'Product', 'Category',
    'Rating', 'Sentiment', 'Recommendation', 'Title', 'Review Text',
    'Status', 'Reply Date', 'Reply Text'
  ];

  const escapeCsv = (val) => {
    const str = String(val === null || val === undefined ? '' : val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = reviews.map((r) => [
    r.id,
    r.createdAt,
    r.customerName,
    r.email,
    r.product,
    r.category,
    r.rating,
    r.sentiment,
    r.recommendation,
    r.reviewTitle,
    r.reviewText,
    r.responseStatus,
    r.replyDate,
    r.reply
  ].map(escapeCsv).join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');

  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="feedbackpro-reviews-${Date.now()}.csv"`,
    'Access-Control-Allow-Origin': '*'
  });
  res.end(csvContent);
}

module.exports = {
  handleGetSummary,
  handleExportCsv
};
