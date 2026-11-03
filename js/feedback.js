document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'feedback') return;

  const starButtons = document.querySelectorAll('.star-btn');
  const ratingInput = document.getElementById('ratingValue');
  const ratingFeedbackText = document.getElementById('ratingFeedbackText');
  const titleInput = document.getElementById('reviewTitle');
  const reviewText = document.getElementById('reviewText');
  const titleCounter = document.getElementById('titleCounter');
  const reviewCounter = document.getElementById('reviewCounter');
  const form = document.getElementById('feedbackForm');
  const sentimentLivePill = document.getElementById('sentimentLivePill');
  const sentimentLiveText = document.getElementById('sentimentLiveText');

  const ratingLabels = {
    1: '★ 1 - Poor experience',
    2: '★★ 2 - Below average',
    3: '★★★ 3 - Average & acceptable',
    4: '★★★★ 4 - Very good & reliable',
    5: '★★★★★ 5 - Outstanding experience!'
  };

  const updateStarVisuals = (val) => {
    starButtons.forEach((star) => {
      const value = Number(star.dataset.value);
      const icon = star.querySelector('i');
      star.classList.toggle('active', value <= val);
      if (icon) {
        icon.classList.toggle('fa-solid', value <= val);
        icon.classList.toggle('fa-regular', value > val);
      }
    });
  };

  starButtons.forEach((button) => {
    const starVal = Number(button.dataset.value);

    button.addEventListener('mouseenter', () => {
      updateStarVisuals(starVal);
      if (ratingFeedbackText) {
        ratingFeedbackText.textContent = ratingLabels[starVal] || 'Click to rate';
      }
    });

    button.addEventListener('click', () => {
      ratingInput.value = starVal;
      updateStarVisuals(starVal);
      if (ratingFeedbackText) {
        ratingFeedbackText.textContent = ratingLabels[starVal];
        ratingFeedbackText.classList.add('selected');
      }
    });
  });

  const starRatingContainer = document.getElementById('starRating');
  starRatingContainer?.addEventListener('mouseleave', () => {
    const selected = Number(ratingInput.value || 0);
    updateStarVisuals(selected);
    if (ratingFeedbackText) {
      ratingFeedbackText.textContent = selected > 0 ? ratingLabels[selected] : 'Click a star to rate your experience';
    }
  });

  // Radio recommendation card handler
  document.querySelectorAll('.recom-option').forEach((option) => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.recom-option').forEach((opt) => opt.classList.remove('active'));
      option.classList.add('active');
    });
  });

  titleInput?.addEventListener('input', () => {
    if (titleCounter) titleCounter.textContent = titleInput.value.length;
  });

  // Real-time AI sentiment analyzer
  reviewText?.addEventListener('input', () => {
    const text = reviewText.value.trim();
    if (reviewCounter) reviewCounter.textContent = text.length;

    if (!sentimentLivePill || !sentimentLiveText) return;

    if (!text) {
      sentimentLivePill.className = 'sentiment-live-pill';
      sentimentLiveText.textContent = 'Local sentiment: Start typing your review...';
      return;
    }

    if (typeof analyzeSentiment === 'function') {
      const result = analyzeSentiment(text, Number(document.getElementById('ratingValue')?.value || 0));
      sentimentLivePill.className = `sentiment-live-pill tone-${result.sentiment.toLowerCase()}`;
      if (result.sentiment === 'Positive') {
        sentimentLiveText.innerHTML = `<strong>Local sentiment: Positive</strong> ✨ (Score: +${result.score})`;
      } else if (result.sentiment === 'Negative') {
        sentimentLiveText.innerHTML = `<strong>Local sentiment: Critical / Needs Attention</strong> ⚠️ (Score: ${result.score})`;
      } else {
        sentimentLiveText.innerHTML = `<strong>Local sentiment: Balanced / Constructive</strong> 💬`;
      }
    }
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const customerName = document.getElementById('customerName').value.trim();
    const email = document.getElementById('email').value.trim();
    const product = document.getElementById('productSelect').value;
    const category = document.getElementById('categorySelect').value;
    const rating = Number(document.getElementById('ratingValue').value || 0);
    const reviewTitle = document.getElementById('reviewTitle').value.trim();
    const reviewTextValue = document.getElementById('reviewText').value.trim();
    const recommendation = document.querySelector('input[name="recommendation"]:checked')?.value || document.getElementById('recommendation')?.value || 'Yes';

    if (!customerName || !email || !product || !category || rating < 1 || !reviewTitle || !reviewTextValue) {
      showToast('Please fill out all required fields and select a star rating.', 'error');
      return;
    }

    const submitBtn = document.getElementById('submitFeedbackBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    if (btnText) btnText.classList.add('hidden');
    if (btnLoader) btnLoader.classList.remove('hidden');

    setTimeout(() => {
      const sentiment = analyzeSentiment(reviewTextValue, rating);
      const newReview = {
        id: crypto.randomUUID(),
        customerName,
        email,
        product,
        category,
        rating,
        reviewTitle,
        reviewText: reviewTextValue,
        recommendation,
        sentiment: sentiment.sentiment,
        sentimentScore: sentiment.score,
        createdAt: new Date().toISOString(),
        responseStatus: 'pending',
        reply: '',
        replyDate: ''
      };

      const reviews = getReviews();
      reviews.unshift(newReview);
      if (!saveReviews(reviews)) {
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoader) btnLoader.classList.add('hidden');
        return;
      }

      const settings = getSettings();
      settings.dateRange = '30';
      saveSettings(settings);

      const notifications = getNotifications();
      notifications.unshift({
        id: crypto.randomUUID(),
        title: 'New customer review',
        message: `${customerName} added a ${sentiment.sentiment.toLowerCase()} review for ${product}.`,
        unread: true,
        createdAt: new Date().toISOString()
      });
      saveNotifications(notifications);

      if (btnText) btnText.classList.remove('hidden');
      if (btnLoader) btnLoader.classList.add('hidden');
      form.reset();
      updateStarVisuals(0);
      ratingInput.value = '0';
      if (ratingFeedbackText) ratingFeedbackText.textContent = 'Click a star to rate your experience';
      if (titleCounter) titleCounter.textContent = '0';
      if (reviewCounter) reviewCounter.textContent = '0';
      if (sentimentLivePill) sentimentLivePill.className = 'sentiment-live-pill';
      if (sentimentLiveText) sentimentLiveText.textContent = 'Local sentiment: Start typing your review...';

      showToast('Thank you! Your feedback has been submitted successfully.', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 950);
    }, 750);
  });
});
