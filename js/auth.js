document.addEventListener('DOMContentLoaded', () => {
  const authBody = document.body.dataset.page === 'login';
  if (!authBody) return;

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabs = document.querySelectorAll('.auth-tab');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => item.classList.toggle('active', item === tab));
      const mode = tab.dataset.authTab;
      loginForm.classList.toggle('active', mode === 'login');
      signupForm.classList.toggle('active', mode === 'signup');
    });
  });

  // Password visibility toggle
  [['toggleLoginPassword', 'loginPassword'], ['toggleSignupPassword', 'signupPassword']].forEach(([buttonId, inputId]) => {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!button || !input) return;
    button.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const icon = button.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye', !isPassword);
        icon.classList.toggle('fa-eye-slash', isPassword);
      }
    });
  });

  // 1-Click Instant Demo Login
  const instantDemoBtn = document.getElementById('instantDemoBtn');
  if (instantDemoBtn) {
    instantDemoBtn.addEventListener('click', () => {
      const emailField = document.getElementById('loginEmail');
      const passField = document.getElementById('loginPassword');
      if (emailField) emailField.value = 'admin@feedbackpro.io';
      if (passField) passField.value = 'admin123';
      showToast('Signing in to demo workspace...', 'success');
      setTimeout(() => {
        setAuthState({ isLoggedIn: true, email: 'admin@feedbackpro.io', name: 'Admin User' });
        window.location.href = 'index.html';
      }, 450);
    });
  }

  document.getElementById('forgotPasswordLink')?.addEventListener('click', (event) => {
    event.preventDefault();
    showToast('Password reset requires a configured authentication service; it is unavailable in this browser demo.', 'error');
  });

  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (email === 'admin@feedbackpro.io' && password === 'admin123') {
      setAuthState({ isLoggedIn: true, email, name: 'Admin User' });
      showToast('Login successful! Redirecting to dashboard...', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 350);
    } else {
      showToast('Invalid credentials. Use admin@feedbackpro.io / admin123 or click Instant Demo Login', 'error');
    }
  });

  signupForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    if (!name || !email || !password) {
      showToast('Please complete all signup fields.', 'error');
      return;
    }
    if (password.length < 8) {
      showToast('Choose a password with at least 8 characters.', 'error');
      return;
    }
    setAuthState({ isLoggedIn: true, email, name });
    showToast(`Welcome aboard, ${name}! Setting up workspace...`, 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 450);
  });
});
