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

  document.getElementById('forgotPasswordLink')?.addEventListener('click', (event) => {
    event.preventDefault();
    showToast('Password reset link sent to your demo inbox.', 'success');
  });

  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (email === 'admin@feedbackpro.io' && password === 'admin123') {
      setAuthState({ isLoggedIn: true, email, name: 'Admin User' });
      window.location.href = 'index.html';
    } else {
      showToast('Invalid demo credentials. Use admin@feedbackpro.io / admin123', 'error');
    }
  });

  signupForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    if (!name || !email || !password) {
      showToast('Please complete the signup form.', 'error');
      return;
    }
    setAuthState({ isLoggedIn: true, email, name });
    window.location.href = 'index.html';
  });
});
