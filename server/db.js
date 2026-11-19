/**
 * FeedbackPro JSON Database Engine
 * Persistent file-backed storage with atomic writes & automatic seed data initialization.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { analyzeSentiment } = require('./sentiment');

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function generateId(prefix = 'r') {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

function buildSeedReviews() {
  const reviewSeeds = [
    { customerName:'Shreya', email:'shreya@example.com', product:'SmartHub Pro', rating:3, category:'Product Quality', reviewTitle:'Satisfactory performance', reviewText:'The product is decent and satisfies our basic workflow requirements. A few extra integrations and customization options would make it ideal for larger teams.', recommendation:'Maybe', daysAgo: 3, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Ava Thompson', email:'ava@example.com', product:'SmartHub Pro', rating:5, category:'Product Quality', reviewTitle:'Excellent experience', reviewText:'The SmartHub Pro works amazing and has transformed our workflow. Setup was fast and the product quality feels premium. We are very satisfied with the performance and support.', recommendation:'Yes', daysAgo: 6.3, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Leo Martin', email:'leo@example.com', product:'Nexa CRM', rating:4, category:'Customer Service', reviewTitle:'Helpful support', reviewText:'The support team was helpful and responded quickly. The product is good overall and easy to use, although a few features still need polishing.', recommendation:'Yes', daysAgo: 8.3, responseStatus:'responded', reply:'Thank you for the feedback. We appreciate your patience while we improve the workflow.', replyDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Noah Patel', email:'noah@example.com', product:'InsightFlow', rating:2, category:'Delivery', reviewTitle:'Delivery delays', reviewText:'Shipping was late and the onboarding experience was disappointing. The app is okay but delivery delays made the purchase frustrating and expensive.', recommendation:'No', daysAgo: 11.5, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Emma Clark', email:'emma@example.com', product:'DeliverLoop', rating:3, category:'Pricing', reviewTitle:'Average value', reviewText:'The features are okay and the interface is moderately easy to use. Pricing feels a bit expensive for smaller teams, but it is acceptable overall.', recommendation:'Maybe', daysAgo: 12, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Mia Rodriguez', email:'mia@example.com', product:'PulseDesk', rating:5, category:'Website Experience', reviewTitle:'Wonderful website and service', reviewText:'Wonderful experience from sign-up to support. The dashboard is intuitive, and the product makes our customer service operations faster and more efficient.', recommendation:'Yes', daysAgo: 14, responseStatus:'responded', reply:'We are delighted to hear that! We are always evolving based on customer feedback.', replyDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Daniel Kim', email:'daniel@example.com', product:'Luna Support', rating:1, category:'Customer Service', reviewTitle:'Unhappy with service', reviewText:'The customer service was terrible and the issue remained unresolved for days. I was unhappy with the slow communication and found the product nearly useless.', recommendation:'No', daysAgo: 17, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Sophia Nguyen', email:'sophia@example.com', product:'SmartHub Pro', rating:5, category:'Product Quality', reviewTitle:'Great product quality', reviewText:'The product is excellent, great quality, and very helpful for our operations. It is fast and easy to manage, and the reporting features are perfect.', recommendation:'Yes', daysAgo: 19, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Jackson Lee', email:'jackson@example.com', product:'InsightFlow', rating:4, category:'Website Experience', reviewTitle:'Smooth and intuitive', reviewText:'The website experience is good and the product is well designed. Everything works smoothly and the dashboard feels modern and easy to navigate.', recommendation:'Yes', daysAgo: 21, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Lily Evans', email:'lily@example.com', product:'Nexa CRM', rating:3, category:'Pricing', reviewTitle:'Okay but pricey', reviewText:'The tool is okay and easy enough to understand, but the pricing seems a bit on the expensive side for a startup. It is acceptable if the value keeps improving.', recommendation:'Maybe', daysAgo: 24, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Oliver Brown', email:'oliver@example.com', product:'DeliverLoop', rating:2, category:'Delivery', reviewTitle:'Late delivery and average service', reviewText:'Delivery was slow and I was disappointed by the timing. The service felt average and the experience was not as good as expected.', recommendation:'No', daysAgo: 26, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Grace Wilson', email:'grace@example.com', product:'Luna Support', rating:5, category:'Customer Service', reviewTitle:'Amazing service team', reviewText:'Amazing support team and excellent product experience. The team was helpful, knowledgeable, and made everything feel simple and fast.', recommendation:'Yes', daysAgo: 28, responseStatus:'responded', reply:'We are happy to help and appreciate the kind words!', replyDate: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Henry Scott', email:'henry@example.com', product:'SmartHub Pro', rating:4, category:'Product Quality', reviewTitle:'Solid overall experience', reviewText:'Overall the product is great and the quality is solid. Some areas could be improved, but it is fast and works reliably for our teams.', recommendation:'Yes', daysAgo: 30, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Chloe Adams', email:'chloe@example.com', product:'PulseDesk', rating:1, category:'Customer Service', reviewTitle:'Worst support', reviewText:'The support experience was the worst I have seen. It was slow, unhelpful, and I felt completely disappointed with the service.', recommendation:'No', daysAgo: 33, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Benjamin Hall', email:'ben@example.com', product:'InsightFlow', rating:5, category:'Product Quality', reviewTitle:'Perfect for reporting', reviewText:'Perfect analytics and perfect reporting flow. The dashboard is wonderful and everything feels polished and quick to learn.', recommendation:'Yes', daysAgo: 35, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Sofia Walker', email:'sofia@example.com', product:'Nexa CRM', rating:3, category:'Website Experience', reviewTitle:'Acceptable but needs work', reviewText:'The interface is average and acceptable for our team, but some pages feel slightly slow. We hope the product continues improving.', recommendation:'Maybe', daysAgo: 37, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Lucas Green', email:'lucas@example.com', product:'DeliverLoop', rating:5, category:'Delivery', reviewTitle:'Fast and on time', reviewText:'Delivery service was fast and excellent. I was happy with the shipping timeline and the overall service was great.', recommendation:'Yes', daysAgo: 40, responseStatus:'responded', reply:'We are glad your delivery experience was smooth.', replyDate: new Date(Date.now() - 39 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Ella White', email:'ella@example.com', product:'Luna Support', rating:2, category:'Customer Service', reviewTitle:'Support was uneven', reviewText:'Support was mixed and the response time was slower than expected. We still like the product, but the patience and follow-up were not ideal.', recommendation:'No', daysAgo: 43, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Mason Perez', email:'mason@example.com', product:'SmartHub Pro', rating:4, category:'Website Experience', reviewTitle:'Easy to use', reviewText:'The interface is easy to use and the onboarding flow feels smooth. I would recommend it, although there are still a few improvements to make.', recommendation:'Yes', daysAgo: 46, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Harper Young', email:'harper@example.com', product:'PulseDesk', rating:5, category:'Product Quality', reviewTitle:'Fast and reliable', reviewText:'The product feels reliable, fast, and easy to understand. We are highly satisfied and it has improved our team workflow significantly.', recommendation:'Yes', daysAgo: 49, responseStatus:'responded', reply:'Thank you for sharing such a detailed review.', replyDate: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Ethan Baker', email:'ethan@example.com', product:'DeliverLoop', rating:1, category:'Pricing', reviewTitle:'Very disappointed', reviewText:'The service was poor and the pricing is hard to justify. I was disappointed by the value and I would not recommend it in its current state.', recommendation:'No', daysAgo: 52, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Amelia Harris', email:'amelia@example.com', product:'InsightFlow', rating:4, category:'Product Quality', reviewTitle:'Strong analytics', reviewText:'The analytics are strong and the workflow is efficient. There are some UI rough edges, but the product provides tremendous value overall.', recommendation:'Yes', daysAgo: 55, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Logan King', email:'logan@example.com', product:'Luna Support', rating:3, category:'Delivery', reviewTitle:'Average delivery', reviewText:'Delivery was okay, but the process was not memorable. The service is acceptable, though a bit inconsistent across orders.', recommendation:'Maybe', daysAgo: 58, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Avery Wright', email:'avery@example.com', product:'Nexa CRM', rating:2, category:'Customer Service', reviewTitle:'Frustrating experience', reviewText:'The service team was not responsive, and the issue did not get resolved quickly. I was frustrated with the follow-through and clarity.', recommendation:'No', daysAgo: 61, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Isabella Moore', email:'isabella@example.com', product:'PulseDesk', rating:5, category:'Website Experience', reviewTitle:'Fantastic workflow', reviewText:'The website experience is fantastic. It is polished, clear, and makes managing customer support a lot easier than before.', recommendation:'Yes', daysAgo: 65, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'James Turner', email:'james@example.com', product:'SmartHub Pro', rating:3, category:'Pricing', reviewTitle:'Fair value', reviewText:'The product is fair value and the features are solid. Pricing is okay, but a few advanced integrations would make it even better.', recommendation:'Maybe', daysAgo: 68, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Charlotte Perez', email:'chlot@example.com', product:'DeliverLoop', rating:4, category:'Customer Service', reviewTitle:'Helpful agents', reviewText:'Customer service was helpful and courteous. The support process was smooth and the team handled issues professionally.', recommendation:'Yes', daysAgo: 72, responseStatus:'responded', reply:'Glad to hear the team could help.', replyDate: new Date(Date.now() - 71 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Scarlett Mitchell', email:'scarlett@example.com', product:'Nexa CRM', rating:5, category:'Pricing', reviewTitle:'Fantastic value', reviewText:'Fantastic value for money. The platform is excellent, and even though pricing is not minimal, the features are worth every penny.', recommendation:'Yes', daysAgo: 76, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Julian Ward', email:'julian@example.com', product:'DeliverLoop', rating:3, category:'Product Quality', reviewTitle:'Generally okay', reviewText:'The product is good and works reliably for our team. Some aspects are great, although there are minor opportunities to improve stability.', recommendation:'Maybe', daysAgo: 81, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Victoria Flores', email:'victoria@example.com', product:'Luna Support', rating:5, category:'Customer Service', reviewTitle:'Perfect support experience', reviewText:'Perfect support experience. The team was fast, patient, and really helpful throughout the process. We are very satisfied and would recommend it.', recommendation:'Yes', daysAgo: 86, responseStatus:'responded', reply:'We appreciate your trust and support.', replyDate: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  return reviewSeeds.map((item, index) => {
    const analysis = analyzeSentiment(item.reviewText, item.rating);
    return {
      id: `r${index + 1}`,
      createdAt: new Date(Date.now() - item.daysAgo * 24 * 60 * 60 * 1000 + index * 60 * 60 * 1000).toISOString(),
      customerName: item.customerName,
      email: item.email,
      product: item.product,
      rating: item.rating,
      category: item.category,
      reviewTitle: item.reviewTitle,
      reviewText: item.reviewText,
      recommendation: item.recommendation,
      responseStatus: item.responseStatus,
      reply: item.reply || '',
      replyDate: item.replyDate || '',
      sentiment: analysis.sentiment,
      sentimentScore: analysis.score,
      topics: analysis.topics,
      urgent: analysis.urgent,
      explanation: analysis.explanation,
      suggestion: analysis.suggestion
    };
  });
}

function getDefaultDatabase() {
  const reviews = buildSeedReviews();
  return {
    version: Date.now(),
    lastModified: new Date().toISOString(),
    reviews,
    complaints: [
      {
        id: 'c1',
        reviewId: 'r7',
        customerName: 'Daniel Kim',
        email: 'daniel@example.com',
        product: 'Luna Support',
        category: 'Customer Service',
        rating: 1,
        title: 'Unhappy with service',
        priority: 'high',
        status: 'investigating',
        assignee: 'Sarah Connor',
        createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Customer reported delayed response and unresolved service issue.'
      },
      {
        id: 'c2',
        reviewId: 'r4',
        customerName: 'Noah Patel',
        email: 'noah@example.com',
        product: 'InsightFlow',
        category: 'Delivery',
        rating: 2,
        title: 'Delivery delays',
        priority: 'medium',
        status: 'open',
        assignee: 'Alex Morgan',
        createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Followed up with logistics regarding delivery delay.'
      }
    ],
    notifications: [
      {
        id: 'notif-1',
        title: 'Welcome to FeedbackPro Backend',
        message: `${reviews.length} customer reviews are loaded and synchronized with the backend.`,
        unread: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'notif-2',
        title: 'New Review Received',
        message: 'Shreya submitted a 3-star review for SmartHub Pro.',
        unread: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    settings: {
      theme: 'light',
      displayName: 'Admin',
      avatarText: 'A',
      profileImage: '',
      notifyNewReview: true,
      notifyNegativeReview: true,
      notifyLowRating: true,
      notifyPendingResponse: true,
      dateRange: '90'
    },
    users: [
      {
        id: 'user_admin',
        name: 'Alex Morgan',
        email: 'admin@feedbackpro.io',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_customer',
        name: 'David Miller',
        email: 'customer@feedbackpro.io',
        password: 'customer123',
        role: 'customer',
        createdAt: new Date().toISOString()
      }
    ]
  };
}

class Database {
  constructor() {
    this.memoryDb = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initial = getDefaultDatabase();
      this.writeToDisk(initial);
      this.memoryDb = initial;
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.memoryDb = JSON.parse(raw);
        // Validate core structure
        if (!Array.isArray(this.memoryDb.reviews)) {
          this.memoryDb = getDefaultDatabase();
          this.writeToDisk(this.memoryDb);
        }
      } catch (err) {
        console.error('Error reading database file, re-initializing seed data:', err);
        this.memoryDb = getDefaultDatabase();
        this.writeToDisk(this.memoryDb);
      }
    }
  }

  writeToDisk(data) {
    const tmpFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    data.version = Date.now();
    data.lastModified = new Date().toISOString();
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
    this.memoryDb = data;
    return data;
  }

  getDb() {
    if (!this.memoryDb) this.init();
    return this.memoryDb;
  }

  getVersion() {
    return this.getDb().version;
  }

  // --- Reviews Methods ---
  getReviews() {
    return this.getDb().reviews || [];
  }

  getReviewById(id) {
    return (this.getDb().reviews || []).find((r) => String(r.id) === String(id)) || null;
  }

  createReview(input) {
    const db = this.getDb();
    const rating = Math.min(5, Math.max(1, Number(input.rating) || 5));
    const analysis = analyzeSentiment(input.reviewText || '', rating);

    const review = {
      id: input.id || generateId('r'),
      createdAt: input.createdAt || new Date().toISOString(),
      customerName: String(input.customerName || 'Anonymous').trim(),
      email: String(input.email || '').trim().toLowerCase(),
      product: String(input.product || 'General').trim(),
      rating,
      category: String(input.category || 'General').trim(),
      reviewTitle: String(input.reviewTitle || '').trim(),
      reviewText: String(input.reviewText || '').trim(),
      recommendation: input.recommendation || (rating >= 4 ? 'Yes' : rating <= 2 ? 'No' : 'Maybe'),
      responseStatus: input.responseStatus || 'pending',
      reply: String(input.reply || '').trim(),
      replyDate: input.replyDate || '',
      sentiment: analysis.sentiment,
      sentimentScore: analysis.score,
      topics: analysis.topics,
      urgent: analysis.urgent,
      explanation: analysis.explanation,
      suggestion: analysis.suggestion
    };

    db.reviews.unshift(review);

    // Automatically trigger notification
    const notification = {
      id: generateId('notif'),
      reviewId: review.id,
      title: review.rating <= 2 ? '⚠️ Low Rating Review Alert' : 'New Customer Review',
      message: `${review.customerName} gave a ${review.rating}-star review for ${review.product}.`,
      unread: true,
      createdAt: new Date().toISOString()
    };
    db.notifications.unshift(notification);

    this.writeToDisk(db);
    return review;
  }

  updateReview(id, updates) {
    const db = this.getDb();
    const index = db.reviews.findIndex((r) => String(r.id) === String(id));
    if (index === -1) return null;

    const existing = db.reviews[index];
    const textChanged = updates.reviewText !== undefined && updates.reviewText !== existing.reviewText;
    const ratingChanged = updates.rating !== undefined && updates.rating !== existing.rating;

    let analysis = {};
    if (textChanged || ratingChanged) {
      const text = updates.reviewText !== undefined ? updates.reviewText : existing.reviewText;
      const rating = updates.rating !== undefined ? updates.rating : existing.rating;
      analysis = analyzeSentiment(text, rating);
    }

    db.reviews[index] = {
      ...existing,
      ...updates,
      ...(textChanged || ratingChanged ? {
        sentiment: analysis.sentiment,
        sentimentScore: analysis.score,
        topics: analysis.topics,
        urgent: analysis.urgent,
        explanation: analysis.explanation,
        suggestion: analysis.suggestion
      } : {}),
      id: existing.id // protect ID
    };

    this.writeToDisk(db);
    return db.reviews[index];
  }

  replyToReview(id, replyText, customerName) {
    const db = this.getDb();
    const review = db.reviews.find((r) => String(r.id) === String(id));
    if (!review) return null;

    review.reply = String(replyText || '').trim();
    review.replyDate = new Date().toISOString();
    review.responseStatus = 'responded';

    // Add notification about response
    db.notifications.unshift({
      id: generateId('notif'),
      title: 'Response Sent',
      message: `Replied to ${customerName || review.customerName}'s review for ${review.product}.`,
      unread: true,
      createdAt: new Date().toISOString()
    });

    this.writeToDisk(db);
    return review;
  }

  toggleReviewStatus(id, responseStatus) {
    const db = this.getDb();
    const review = db.reviews.find((r) => String(r.id) === String(id));
    if (!review) return null;

    review.responseStatus = responseStatus === 'responded' ? 'responded' : 'pending';
    if (review.responseStatus === 'pending') {
      review.reply = '';
      review.replyDate = '';
    } else if (!review.replyDate) {
      review.replyDate = new Date().toISOString();
    }

    this.writeToDisk(db);
    return review;
  }

  deleteReview(id) {
    const db = this.getDb();
    const initialLen = db.reviews.length;
    db.reviews = db.reviews.filter((r) => String(r.id) !== String(id));
    if (db.reviews.length !== initialLen) {
      this.writeToDisk(db);
      return true;
    }
    return false;
  }

  clearReviews() {
    const db = this.getDb();
    db.reviews = [];
    db.complaints = [];
    this.writeToDisk(db);
    return true;
  }

  importReviews(reviewsArray) {
    const db = this.getDb();
    if (!Array.isArray(reviewsArray)) return 0;

    let addedCount = 0;
    for (const raw of reviewsArray) {
      const rating = Math.min(5, Math.max(1, Number(raw.rating) || 5));
      const analysis = analyzeSentiment(raw.reviewText || '', rating);
      const item = {
        id: raw.id || generateId('r'),
        createdAt: raw.createdAt || raw.date || new Date().toISOString(),
        customerName: String(raw.customerName || raw.customer || 'Anonymous').trim(),
        email: String(raw.email || '').trim().toLowerCase(),
        product: String(raw.product || 'General').trim(),
        rating,
        category: String(raw.category || 'General').trim(),
        reviewTitle: String(raw.reviewTitle || '').trim(),
        reviewText: String(raw.reviewText || raw.review || raw.comment || '').trim(),
        recommendation: raw.recommendation || (rating >= 4 ? 'Yes' : rating <= 2 ? 'No' : 'Maybe'),
        responseStatus: raw.responseStatus || 'pending',
        reply: raw.reply || '',
        replyDate: raw.replyDate || '',
        sentiment: analysis.sentiment,
        sentimentScore: analysis.score,
        topics: analysis.topics,
        urgent: analysis.urgent,
        explanation: analysis.explanation,
        suggestion: analysis.suggestion
      };
      db.reviews.unshift(item);
      addedCount++;
    }

    db.notifications.unshift({
      id: generateId('notif'),
      title: 'Import Successful',
      message: `Imported ${addedCount} reviews from file.`,
      unread: true,
      createdAt: new Date().toISOString()
    });

    this.writeToDisk(db);
    return addedCount;
  }

  resetSampleData() {
    const initial = getDefaultDatabase();
    initial.notifications.unshift({
      id: generateId('notif'),
      title: 'Database Reset',
      message: 'Initial sample dataset restored.',
      unread: true,
      createdAt: new Date().toISOString()
    });
    this.writeToDisk(initial);
    return initial;
  }

  // --- Complaints Methods ---
  getComplaints() {
    return this.getDb().complaints || [];
  }

  saveComplaints(complaints) {
    const db = this.getDb();
    db.complaints = Array.isArray(complaints) ? complaints : [];
    this.writeToDisk(db);
    return db.complaints;
  }

  // --- Notifications Methods ---
  getNotifications() {
    return this.getDb().notifications || [];
  }

  markNotificationsRead(id = null) {
    const db = this.getDb();
    if (id) {
      const notif = db.notifications.find((n) => String(n.id) === String(id));
      if (notif) notif.unread = false;
    } else {
      db.notifications.forEach((n) => (n.unread = false));
    }
    this.writeToDisk(db);
    return db.notifications;
  }

  // --- Settings Methods ---
  getSettings() {
    return this.getDb().settings || {};
  }

  saveSettings(settings) {
    const db = this.getDb();
    db.settings = { ...db.settings, ...settings };
    this.writeToDisk(db);
    return db.settings;
  }

  // --- Users / Auth Methods ---
  getUsers() {
    return this.getDb().users || [];
  }

  findUser(email, password) {
    const normEmail = String(email || '').trim().toLowerCase();
    return (this.getDb().users || []).find(
      (u) => u.email.toLowerCase() === normEmail && u.password === password
    );
  }

  createUser(data) {
    const db = this.getDb();
    const normEmail = String(data.email || '').trim().toLowerCase();
    const existing = (db.users || []).find((u) => u.email.toLowerCase() === normEmail);
    if (existing) return null;

    const user = {
      id: generateId('user'),
      name: String(data.name || 'User').trim(),
      email: normEmail,
      password: String(data.password || ''),
      role: data.role || 'customer',
      createdAt: new Date().toISOString()
    };

    db.users = db.users || [];
    db.users.push(user);
    this.writeToDisk(db);
    return user;
  }
}

const dbInstance = new Database();

module.exports = {
  db: dbInstance,
  getDefaultDatabase
};
