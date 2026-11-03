document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'feedback') return;

  const starButtons = document.querySelectorAll('.star-btn');
  const ratingInput = document.getElementById('ratingValue');
  const titleInput = document.getElementById('reviewTitle');
  const reviewText = document.getElementById('reviewText');
  const titleCounter = document.getElementById('titleCounter');
  const reviewCounter = document.getElementById('reviewCounter');
  const form = document.getElementById('feedbackForm');

  starButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selected = Number(button.dataset.value);
      ratingInput.value = selected;
      starButtons.forEach((star) => {
        const value = Number(star.dataset.value);
        const icon = star.querySelector('i');
        star.classList.toggle('active', value <= selected);
        icon.classList.toggle('fa-solid', value <= selected);
        icon.classList.toggle('fa-regular', value > selected);
      });
    });
  });

  titleInput?.addEventListener('input', () => {
    titleCounter.textContent = titleInput.value.length;
  });

  reviewText?.addEventListener('input', () => {
    reviewCounter.textContent = reviewText.value.length;
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
    const recommendation = document.getElementById('recommendation').value;

    if (!customerName || !email || !product || !category || rating < 1 || !reviewTitle || !reviewTextValue) {
      showToast('Please complete all required fields before submitting.', 'error');
      return;
    }

    const submitBtn = document.getElementById('submitFeedbackBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');

    setTimeout(() => {
      const sentiment = analyzeSentiment(reviewTextValue);
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
      saveReviews(reviews);

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

      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      form.reset();
      starButtons.forEach((star) => {
        const icon = star.querySelector('i');
        star.classList.remove('active');
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
      });
      ratingInput.value = '0';
      titleCounter.textContent = '0';
      reviewCounter.textContent = '0';
      showToast('Review submitted successfully!', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 900);
    }, 900);
  });
});
