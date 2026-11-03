document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const page = body.dataset.page || 'dashboard';

  const navButtons = document.querySelectorAll('.nav-item, .dashboard-nav-link');
  navButtons.forEach((button) => {
    if (button.dataset.target) {
      button.addEventListener('click', () => {
        const target = button.dataset.target;
        const targetNavButton = document.querySelector(`.nav-item[data-target="${target}"]`);
        document.querySelectorAll('.page-view').forEach((section) => {
          section.classList.toggle('active', section.id === target);
        });
        if (target === 'analytics-view') {
          window.requestAnimationFrame(() => {
            ['rating', 'product', 'category'].forEach((name) => window.chartInstances?.[name]?.resize());
          });
        }
        document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item === targetNavButton));
        const titleElement = document.getElementById('pageTitle');
        const pageTitle = targetNavButton?.textContent.trim() || button.textContent.trim();
        if (titleElement) titleElement.textContent = pageTitle;
        const breadcrumbs = document.querySelector('.breadcrumbs');
        if (breadcrumbs) breadcrumbs.textContent = `Home / ${pageTitle}`;
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
      });
    }
  });

  document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  });

  document.getElementById('sidebarCloseBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('open');
  });

  const themeToggle = document.getElementById('themeToggle');
  const settings = getSettings();
  if (themeToggle) {
    const applyTheme = (theme) => {
      body.classList.toggle('theme-dark', theme === 'dark');
      body.classList.toggle('theme-light', theme !== 'dark');
      const icon = themeToggle.querySelector('i');
      icon.classList.toggle('fa-moon', theme !== 'dark');
      icon.classList.toggle('fa-sun', theme === 'dark');
    };
    applyTheme(settings.theme || 'light');
    themeToggle.addEventListener('click', () => {
      const next = body.classList.contains('theme-dark') ? 'light' : 'dark';
      settings.theme = next;
      saveSettings(settings);
      applyTheme(next);
      if (typeof renderDashboard === 'function') renderDashboard();
      showToast(`Theme switched to ${next} mode.`, 'success');
    });
  }

  const profileTrigger = document.getElementById('profileTrigger');
  if (profileTrigger) {
    profileTrigger.addEventListener('click', () => {
      const menu = profileTrigger.closest('.profile-menu');
      menu.classList.toggle('open');
    });
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.profile-menu')) {
      document.querySelector('.profile-menu')?.classList.remove('open');
    }
    if (!event.target.closest('.notification-wrapper')) {
      document.querySelector('.notification-wrapper')?.classList.remove('open');
    }
  });

  const notificationBtn = document.getElementById('notificationBtn');
  if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
      const wrapper = notificationBtn.closest('.notification-wrapper');
      wrapper.classList.toggle('open');
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      setAuthState({ isLoggedIn: false });
      window.location.href = 'login.html';
    });
  }

  const profileName = document.getElementById('profileName');
  if (profileName) {
    const currentSettings = getSettings();
    profileName.textContent = currentSettings.displayName || 'Admin';
  }

  const avatarEl = document.getElementById('profileAvatar');
  if (avatarEl) {
    const currentSettings = getSettings();
    const initials = (currentSettings.displayName || 'Admin').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    avatarEl.textContent = initials || 'A';
  }

  const modal = document.getElementById('reviewModal');
  document.getElementById('closeReviewModal')?.addEventListener('click', () => modal.classList.remove('open'));
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) modal.classList.remove('open');
  });

  const settingsPanel = getSettings();
  const displayNameInput = document.getElementById('displayNameInput');
  if (displayNameInput) {
    displayNameInput.value = settingsPanel.displayName || 'Admin';
  }

  document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
    const nextSettings = getSettings();
    nextSettings.displayName = document.getElementById('displayNameInput').value || 'Admin';
    nextSettings.profileImage = document.getElementById('profileImageInput').value || '';
    saveSettings(nextSettings);
    const avatarEl2 = document.getElementById('profileAvatar');
    if (avatarEl2) {
      avatarEl2.textContent = (nextSettings.displayName || 'Admin').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    }
    const profileName2 = document.getElementById('profileName');
    if (profileName2) profileName2.textContent = nextSettings.displayName || 'Admin';
    showToast('Profile saved successfully.', 'success');
  });

  document.getElementById('lightModeToggle')?.addEventListener('change', (event) => {
    if (event.target.checked) {
      const next = getSettings();
      next.theme = 'light';
      saveSettings(next);
      applyThemeSelection(body, themeToggle, 'light');
      if (typeof renderDashboard === 'function') renderDashboard();
    }
  });

  document.getElementById('darkModeToggle')?.addEventListener('change', (event) => {
    if (event.target.checked) {
      const next = getSettings();
      next.theme = 'dark';
      saveSettings(next);
      applyThemeSelection(body, themeToggle, 'dark');
      if (typeof renderDashboard === 'function') renderDashboard();
    }
  });

  document.getElementById('resetDemoDataBtn')?.addEventListener('click', () => {
    resetToSampleData();
    renderDashboard();
    renderReviewsTable(getReviews());
  });

  document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
    saveReviews([]);
    showToast('Demo data cleared.', 'success');
    renderDashboard();
    renderReviewsTable(getReviews());
  });

  const authState = ensureAuth();
  if (page !== 'login' && !authState.isLoggedIn) {
    window.location.href = 'login.html';
  }

  if (page === 'dashboard' && document.getElementById('notificationList')) {
    const activeTheme = body.classList.contains('theme-dark');
    const lightModeToggle = document.getElementById('lightModeToggle');
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (lightModeToggle) lightModeToggle.checked = !activeTheme;
    if (darkModeToggle) darkModeToggle.checked = activeTheme;
    renderNotificationList();
    updateNotificationBadge();
  }
});

function applyThemeSelection(body, themeToggle, theme) {
  body.classList.toggle('theme-dark', theme === 'dark');
  body.classList.toggle('theme-light', theme !== 'dark');
  if (!themeToggle) return;
  const icon = themeToggle.querySelector('i');
  icon.classList.toggle('fa-moon', theme !== 'dark');
  icon.classList.toggle('fa-sun', theme === 'dark');
}
