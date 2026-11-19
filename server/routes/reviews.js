/**
 * Reviews API Route Handler
 */

const { db } = require('../db');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function handleGetReviews(req, res, query = {}) {
  let reviews = db.getReviews();

  // Search filter
  if (query.search) {
    const q = query.search.toLowerCase();
    reviews = reviews.filter(
      (r) =>
        r.customerName.toLowerCase().includes(q) ||
        r.reviewText.toLowerCase().includes(q) ||
        (r.reviewTitle && r.reviewTitle.toLowerCase().includes(q)) ||
        r.product.toLowerCase().includes(q)
    );
  }

  // Rating filter
  if (query.rating && query.rating !== 'all') {
    const rNum = Number(query.rating);
    reviews = reviews.filter((r) => r.rating === rNum);
  }

  // Category filter
  if (query.category && query.category !== 'all') {
    reviews = reviews.filter((r) => r.category.toLowerCase() === query.category.toLowerCase());
  }

  // Product filter
  if (query.product && query.product !== 'all') {
    reviews = reviews.filter((r) => r.product.toLowerCase() === query.product.toLowerCase());
  }

  // Response status filter
  if (query.status && query.status !== 'all') {
    reviews = reviews.filter((r) => r.responseStatus === query.status);
  }

  // Sorting
  const sort = query.sort || 'newest';
  if (sort === 'newest') {
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'oldest') {
    reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sort === 'rating-high') {
    reviews.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'rating-low') {
    reviews.sort((a, b) => a.rating - b.rating);
  }

  // Pagination
  const total = reviews.length;
  const page = Math.max(1, Number(query.page) || 1);
  const limit = query.limit ? Math.max(1, Number(query.limit)) : total;
  const offset = (page - 1) * limit;
  const paginated = reviews.slice(offset, offset + limit);

  return sendJson(res, 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    data: paginated,
    version: db.getVersion()
  });
}

function handleGetReviewById(req, res, id) {
  const review = db.getReviewById(id);
  if (!review) {
    return sendJson(res, 404, { error: `Review with id '${id}' not found.` });
  }
  return sendJson(res, 200, review);
}

function handleCreateReview(req, res, body) {
  if (!body || !body.reviewText || !body.rating) {
    return sendJson(res, 400, { error: 'Both rating and reviewText are required.' });
  }
  const review = db.createReview(body);
  return sendJson(res, 201, {
    success: true,
    data: review,
    version: db.getVersion()
  });
}

function handleUpdateReview(req, res, id, body) {
  if (!body) {
    return sendJson(res, 400, { error: 'Update payload required.' });
  }
  const updated = db.updateReview(id, body);
  if (!updated) {
    return sendJson(res, 404, { error: `Review with id '${id}' not found.` });
  }
  return sendJson(res, 200, {
    success: true,
    data: updated,
    version: db.getVersion()
  });
}

function handleReplyReview(req, res, id, body) {
  if (!body || typeof body.reply !== 'string') {
    return sendJson(res, 400, { error: 'Reply text is required.' });
  }
  const replied = db.replyToReview(id, body.reply, body.customerName);
  if (!replied) {
    return sendJson(res, 404, { error: `Review with id '${id}' not found.` });
  }
  return sendJson(res, 200, {
    success: true,
    data: replied,
    version: db.getVersion()
  });
}

function handleToggleStatus(req, res, id, body) {
  const status = body?.responseStatus || 'pending';
  const updated = db.toggleReviewStatus(id, status);
  if (!updated) {
    return sendJson(res, 404, { error: `Review with id '${id}' not found.` });
  }
  return sendJson(res, 200, {
    success: true,
    data: updated,
    version: db.getVersion()
  });
}

function handleDeleteReview(req, res, id) {
  const deleted = db.deleteReview(id);
  if (!deleted) {
    return sendJson(res, 404, { error: `Review with id '${id}' not found.` });
  }
  return sendJson(res, 200, {
    success: true,
    message: `Review '${id}' deleted.`,
    version: db.getVersion()
  });
}

function handleClearReviews(req, res) {
  db.clearReviews();
  return sendJson(res, 200, {
    success: true,
    message: 'All review records cleared.',
    version: db.getVersion()
  });
}

function handleImportReviews(req, res, body) {
  const list = Array.isArray(body) ? body : Array.isArray(body?.reviews) ? body.reviews : null;
  if (!list) {
    return sendJson(res, 400, { error: 'Array of reviews expected in payload.' });
  }
  const count = db.importReviews(list);
  return sendJson(res, 200, {
    success: true,
    imported: count,
    total: db.getReviews().length,
    version: db.getVersion()
  });
}

function handleResetSample(req, res) {
  const data = db.resetSampleData();
  return sendJson(res, 200, {
    success: true,
    message: 'Sample dataset restored successfully.',
    total: data.reviews.length,
    version: db.getVersion()
  });
}

module.exports = {
  handleGetReviews,
  handleGetReviewById,
  handleCreateReview,
  handleUpdateReview,
  handleReplyReview,
  handleToggleStatus,
  handleDeleteReview,
  handleClearReviews,
  handleImportReviews,
  handleResetSample
};
