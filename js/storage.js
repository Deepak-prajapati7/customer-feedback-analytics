const STORAGE_KEYS = {
  reviews: 'feedbackpro_reviews',
  settings: 'feedbackpro_settings',
  auth: 'feedbackpro_auth',
  notifications: 'feedbackpro_notifications'
};

const sampleReviews = buildSampleReviews();

function buildSampleReviews() {
  const reviewSeeds = [
    { customerName:'Ava Thompson', email:'ava@example.com', product:'SmartHub Pro', rating:5, category:'Product Quality', reviewTitle:'Excellent experience', reviewText:'The SmartHub Pro works amazing and has transformed our workflow. Setup was fast and the product quality feels premium. We are very satisfied with the performance and support.', recommendation:'Yes', sentiment:'Positive', sentimentScore:4, daysAgo: 3, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Leo Martin', email:'leo@example.com', product:'Nexa CRM', rating:4, category:'Customer Service', reviewTitle:'Helpful support', reviewText:'The support team was helpful and responded quickly. The product is good overall and easy to use, although a few features still need polishing.', recommendation:'Yes', sentiment:'Positive', sentimentScore:2, daysAgo: 5, responseStatus:'responded', reply:'Thank you for the feedback. We appreciate your patience while we improve the workflow.', replyDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Noah Patel', email:'noah@example.com', product:'InsightFlow', rating:2, category:'Delivery', reviewTitle:'Delivery delays', reviewText:'Shipping was late and the onboarding experience was disappointing. The app is okay but delivery delays made the purchase frustrating and expensive.', recommendation:'No', sentiment:'Negative', sentimentScore:-4, daysAgo: 8, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Emma Clark', email:'emma@example.com', product:'DeliverLoop', rating:3, category:'Pricing', reviewTitle:'Average value', reviewText:'The features are okay and the interface is moderately easy to use. Pricing feels a bit expensive for smaller teams, but it is acceptable overall.', recommendation:'Maybe', sentiment:'Neutral', sentimentScore:0, daysAgo: 9, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Mia Rodriguez', email:'mia@example.com', product:'PulseDesk', rating:5, category:'Website Experience', reviewTitle:'Wonderful website and service', reviewText:'Wonderful experience from sign-up to support. The dashboard is intuitive, and the product makes our customer service operations faster and more efficient.', recommendation:'Yes', sentiment:'Positive', sentimentScore:5, daysAgo: 11, responseStatus:'responded', reply:'We are delighted to hear that! We are always evolving based on customer feedback.', replyDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Daniel Kim', email:'daniel@example.com', product:'Luna Support', rating:1, category:'Customer Service', reviewTitle:'Unhappy with service', reviewText:'The customer service was terrible and the issue remained unresolved for days. I was unhappy with the slow communication and found the product nearly useless.', recommendation:'No', sentiment:'Negative', sentimentScore:-6, daysAgo: 14, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Sophia Nguyen', email:'sophia@example.com', product:'SmartHub Pro', rating:5, category:'Product Quality', reviewTitle:'Great product quality', reviewText:'The product is excellent, great quality, and very helpful for our operations. It is fast and easy to manage, and the reporting features are perfect.', recommendation:'Yes', sentiment:'Positive', sentimentScore:5, daysAgo: 17, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Jackson Lee', email:'jackson@example.com', product:'InsightFlow', rating:4, category:'Website Experience', reviewTitle:'Smooth and intuitive', reviewText:'The website experience is good and the product is well designed. Everything works smoothly and the dashboard feels modern and easy to navigate.', recommendation:'Yes', sentiment:'Positive', sentimentScore:3, daysAgo: 18, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Lily Evans', email:'lily@example.com', product:'Nexa CRM', rating:3, category:'Pricing', reviewTitle:'Okay but pricey', reviewText:'The tool is okay and easy enough to understand, but the pricing seems a bit on the expensive side for a startup. It is acceptable if the value keeps improving.', recommendation:'Maybe', sentiment:'Neutral', sentimentScore:0, daysAgo: 21, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Oliver Brown', email:'oliver@example.com', product:'DeliverLoop', rating:2, category:'Delivery', reviewTitle:'Late delivery and average service', reviewText:'Delivery was slow and I was disappointed by the timing. The service felt average and the experience was not as good as expected.', recommendation:'No', sentiment:'Negative', sentimentScore:-3, daysAgo: 24, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Grace Wilson', email:'grace@example.com', product:'Luna Support', rating:5, category:'Customer Service', reviewTitle:'Amazing service team', reviewText:'Amazing support team and excellent product experience. The team was helpful, knowledgeable, and made everything feel simple and fast.', recommendation:'Yes', sentiment:'Positive', sentimentScore:5, daysAgo: 26, responseStatus:'responded', reply:'We are happy to help and appreciate the kind words!', replyDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Henry Scott', email:'henry@example.com', product:'SmartHub Pro', rating:4, category:'Product Quality', reviewTitle:'Solid overall experience', reviewText:'Overall the product is great and the quality is solid. Some areas could be improved, but it is fast and works reliably for our teams.', recommendation:'Yes', sentiment:'Positive', sentimentScore:3, daysAgo: 28, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Chloe Adams', email:'chloe@example.com', product:'PulseDesk', rating:1, category:'Customer Service', reviewTitle:'Worst support', reviewText:'The support experience was the worst I have seen. It was slow, unhelpful, and I felt completely disappointed with the service.', recommendation:'No', sentiment:'Negative', sentimentScore:-6, daysAgo: 30, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Benjamin Hall', email:'ben@example.com', product:'InsightFlow', rating:5, category:'Product Quality', reviewTitle:'Perfect for reporting', reviewText:'Perfect analytics and perfect reporting flow. The dashboard is wonderful and everything feels polished and quick to learn.', recommendation:'Yes', sentiment:'Positive', sentimentScore:5, daysAgo: 32, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Sofia Walker', email:'sofia@example.com', product:'Nexa CRM', rating:3, category:'Website Experience', reviewTitle:'Acceptable but needs work', reviewText:'The interface is average and acceptable for our team, but some pages feel slightly slow. We hope the product continues improving.', recommendation:'Maybe', sentiment:'Neutral', sentimentScore:1, daysAgo: 35, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Lucas Green', email:'lucas@example.com', product:'DeliverLoop', rating:5, category:'Delivery', reviewTitle:'Fast and on time', reviewText:'Delivery service was fast and excellent. I was happy with the shipping timeline and the overall service was great.', recommendation:'Yes', sentiment:'Positive', sentimentScore:4, daysAgo: 39, responseStatus:'responded', reply:'We are glad your delivery experience was smooth.', replyDate: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Ella White', email:'ella@example.com', product:'Luna Support', rating:2, category:'Customer Service', reviewTitle:'Support was uneven', reviewText:'Support was mixed and the response time was slower than expected. We still like the product, but the patience and follow-up were not ideal.', recommendation:'No', sentiment:'Negative', sentimentScore:-2, daysAgo: 42, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Mason Perez', email:'mason@example.com', product:'SmartHub Pro', rating:4, category:'Website Experience', reviewTitle:'Easy to use', reviewText:'The interface is easy to use and the onboarding flow feels smooth. I would recommend it, although there are still a few improvements to make.', recommendation:'Yes', sentiment:'Positive', sentimentScore:2, daysAgo: 45, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Harper Young', email:'harper@example.com', product:'PulseDesk', rating:5, category:'Product Quality', reviewTitle:'Fast and reliable', reviewText:'The product feels reliable, fast, and easy to understand. We are highly satisfied and it has improved our team workflow significantly.', recommendation:'Yes', sentiment:'Positive', sentimentScore:5, daysAgo: 48, responseStatus:'responded', reply:'Thank you for sharing such a detailed review.', replyDate: new Date(Date.now() - 47 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Ethan Baker', email:'ethan@example.com', product:'DeliverLoop', rating:1, category:'Pricing', reviewTitle:'Very disappointed', reviewText:'The service was poor and the pricing is hard to justify. I was disappointed by the value and I would not recommend it in its current state.', recommendation:'No', sentiment:'Negative', sentimentScore:-6, daysAgo: 51, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Amelia Harris', email:'amelia@example.com', product:'InsightFlow', rating:4, category:'Product Quality', reviewTitle:'Strong analytics', reviewText:'The analytics are strong and the workflow is efficient. There are some UI rough edges, but the product provides tremendous value overall.', recommendation:'Yes', sentiment:'Positive', sentimentScore:3, daysAgo: 54, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Logan King', email:'logan@example.com', product:'Luna Support', rating:3, category:'Delivery', reviewTitle:'Average delivery', reviewText:'Delivery was okay, but the process was not memorable. The service is acceptable, though a bit inconsistent across orders.', recommendation:'Maybe', sentiment:'Neutral', sentimentScore:1, daysAgo: 57, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Avery Wright', email:'avery@example.com', product:'Nexa CRM', rating:2, category:'Customer Service', reviewTitle:'Frustrating experience', reviewText:'The service team was not responsive, and the issue did not get resolved quickly. I was frustrated with the follow-through and clarity.', recommendation:'No', sentiment:'Negative', sentimentScore:-4, daysAgo: 60, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Isabella Moore', email:'isabella@example.com', product:'PulseDesk', rating:5, category:'Website Experience', reviewTitle:'Fantastic workflow', reviewText:'The website experience is fantastic. It is polished, clear, and makes managing customer support a lot easier than before.', recommendation:'Yes', sentiment:'Positive', sentimentScore:4, daysAgo: 64, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'James Turner', email:'james@example.com', product:'SmartHub Pro', rating:3, category:'Pricing', reviewTitle:'Fair value', reviewText:'The product is fair value and the features are solid. Pricing is okay, but a few advanced integrations would make it even better.', recommendation:'Maybe', sentiment:'Neutral', sentimentScore:0, daysAgo: 68, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Charlotte Perez', email:'charlotte@example.com', product:'DeliverLoop', rating:4, category:'Customer Service', reviewTitle:'Helpful agents', reviewText:'Customer service was helpful and courteous. The support process was smooth and the team handled issues professionally.', recommendation:'Yes', sentiment:'Positive', sentimentScore:3, daysAgo: 72, responseStatus:'responded', reply:'Glad to hear the team could help.', replyDate: new Date(Date.now() - 71 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Scarlett Mitchell', email:'scarlett@example.com', product:'Nexa CRM', rating:5, category:'Pricing', reviewTitle:'Fantastic value', reviewText:'Fantastic value for money. The platform is excellent, and even though pricing is not minimal, the features are worth every penny.', recommendation:'Yes', sentiment:'Positive', sentimentScore:4, daysAgo: 76, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Julian Ward', email:'julian@example.com', product:'DeliverLoop', rating:3, category:'Product Quality', reviewTitle:'Generally okay', reviewText:'The product is acceptable and generally okay. Some aspects are good, but we still feel there are opportunities to improve stability and speed.', recommendation:'Maybe', sentiment:'Neutral', sentimentScore:1, daysAgo: 81, responseStatus:'pending', reply:'', replyDate:'' },
    { customerName:'Victoria Flores', email:'victoria@example.com', product:'Luna Support', rating:5, category:'Customer Service', reviewTitle:'Perfect support experience', reviewText:'Perfect support experience. The team was fast, patient, and really helpful throughout the process. We are very satisfied and would recommend it.', recommendation:'Yes', sentiment:'Positive', sentimentScore:5, daysAgo: 87, responseStatus:'responded', reply:'We appreciate your trust and support.', replyDate: new Date(Date.now() - 86 * 24 * 60 * 60 * 1000).toISOString() },
    { customerName:'Gabriel Brooks', email:'gabriel@example.com', product:'PulseDesk', rating:4, category:'Website Experience', reviewTitle:'Fast and intuitive', reviewText:'The site is fast, intuitive, and very easy to navigate. It is a strong overall experience and feels modern and well-built.', recommendation:'Yes', sentiment:'Positive', sentimentScore:3, daysAgo: 93, responseStatus:'pending', reply:'', replyDate:'' }
  ];

  return reviewSeeds.map((review, index) => ({
    id: `r${index + 1}`,
    createdAt: new Date(Date.now() - review.daysAgo * 24 * 60 * 60 * 1000 + index * 60 * 60 * 1000).toISOString(),
    ...review,
    replyDate: review.replyDate || '',
    responseStatus: review.responseStatus || 'pending',
    reply: review.reply || ''
  }));
}

function getDefaultSettings() {
  return {
    theme: 'light',
    displayName: 'Admin',
    avatarText: 'A',
    profileImage: '',
    notifyNewReview: true,
    notifyNegativeReview: true,
    notifyLowRating: true,
    notifyPendingResponse: true,
    dateRange: '30'
  };
}

function getStoredValue(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function setStoredValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getReviews() {
  const reviews = getStoredValue(STORAGE_KEYS.reviews, null);
  if (!Array.isArray(reviews)) {
    const sample = JSON.parse(JSON.stringify(sampleReviews));
    setStoredValue(STORAGE_KEYS.reviews, sample);
    return sample.map((review) => {
      const analysis = analyzeSentiment(review.reviewText, review.rating);
      return { ...review, ...analysis };
    });
  }
  return reviews.map((review) => {
    const analysis = analyzeSentiment(review.reviewText, review.rating);
    return { ...review, ...analysis, id: review.id };
  });
}

function saveReviews(reviews) {
  try {
    setStoredValue(STORAGE_KEYS.reviews, reviews);
    return true;
  } catch (error) {
    console.error('Unable to save feedback records.', error);
    showToast('Feedback could not be saved. Export or remove records to free browser storage.', 'error');
    return false;
  }
}

function getSettings() {
  const settings = getStoredValue(STORAGE_KEYS.settings, null);
  if (!settings) {
    const defaults = getDefaultSettings();
    setStoredValue(STORAGE_KEYS.settings, defaults);
    return defaults;
  }
  return { ...getDefaultSettings(), ...settings };
}

function saveSettings(settings) {
  setStoredValue(STORAGE_KEYS.settings, settings);
}

function getNotifications() {
  const notifications = getStoredValue(STORAGE_KEYS.notifications, []);
  return notifications;
}

function saveNotifications(notifications) {
  setStoredValue(STORAGE_KEYS.notifications, notifications);
}

function ensureDemoData() {
  const existingReviews = getStoredValue(STORAGE_KEYS.reviews, null);
  if (!Array.isArray(existingReviews)) {
    saveReviews(JSON.parse(JSON.stringify(sampleReviews)));
  }
  if (!localStorage.getItem(STORAGE_KEYS.settings)) {
    saveSettings(getDefaultSettings());
  }
  if (!localStorage.getItem(STORAGE_KEYS.notifications)) {
    const initialNotifications = [
      { id: crypto.randomUUID(), title: 'Welcome to FeedbackPro', message: `${Array.isArray(existingReviews) ? existingReviews.length : sampleReviews.length} sample reviews are ready to explore.`, unread: true, createdAt: new Date().toISOString() }
    ];
    saveNotifications(initialNotifications);
  }
}

function clearDemoData() {
  localStorage.removeItem(STORAGE_KEYS.reviews);
  localStorage.removeItem(STORAGE_KEYS.notifications);
  localStorage.removeItem(STORAGE_KEYS.auth);
  saveReviews(JSON.parse(JSON.stringify(sampleReviews)));
  saveNotifications([]);
}

function resetToSampleData() {
  if (!saveReviews(JSON.parse(JSON.stringify(sampleReviews)))) return;
  const notifications = [
    { id: crypto.randomUUID(), title: 'Data reset complete', message: 'Your application has been restored to the initial sample dataset.', unread: true, createdAt: new Date().toISOString() }
  ];
  saveNotifications(notifications);
  showToast('Sample data has been restored.', 'success');
}

function ensureAuth() {
  const authState = getStoredValue(STORAGE_KEYS.auth, { isLoggedIn: false });
  return authState;
}

function setAuthState(value) {
  setStoredValue(STORAGE_KEYS.auth, value);
}

function formatDate(dateString) {
  const value = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2600);
}

ensureDemoData();

document.addEventListener('DOMContentLoaded', () => {
  ensureDemoData();
});
