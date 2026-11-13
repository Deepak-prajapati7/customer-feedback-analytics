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

  // Role selector active styling on Sign Up
  document.querySelectorAll('#signupRoleSelector .role-option').forEach((option) => {
    option.addEventListener('click', () => {
      document.querySelectorAll('#signupRoleSelector .role-option').forEach((item) => item.classList.remove('active'));
      option.classList.add('active');
      const radio = option.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
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

  function completeSignIn(user) {
    const role = user.role === 'customer' ? 'customer' : 'admin';
    setAuthState({
      isLoggedIn: true,
      role,
      email: user.email,
      name: user.name
    });
    if (role === 'customer') {
      saveCustomerProfile({ name: user.name, email: user.email });
    }
    window.location.href = role === 'customer' ? 'customer.html' : 'index.html';
  }

  // 1-Click Admin Demo Login
  const instantDemoBtn = document.getElementById('instantDemoBtn');
  if (instantDemoBtn) {
    instantDemoBtn.addEventListener('click', () => {
      const emailField = document.getElementById('loginEmail');
      const passField = document.getElementById('loginPassword');
      if (emailField) emailField.value = 'admin@feedbackpro.io';
      if (passField) passField.value = 'admin123';
      showToast('Signing in to Admin workspace...', 'success');
      setTimeout(() => {
        completeSignIn({ email: 'admin@feedbackpro.io', name: 'Admin User', role: 'admin' });
      }, 400);
    });
  }

  // 1-Click Customer Portal Demo Login
  const instantCustomerDemoBtn = document.getElementById('instantCustomerDemoBtn');
  if (instantCustomerDemoBtn) {
    instantCustomerDemoBtn.addEventListener('click', () => {
      const emailField = document.getElementById('loginEmail');
      const passField = document.getElementById('loginPassword');
      if (emailField) emailField.value = 'customer@feedbackpro.io';
      if (passField) passField.value = 'customer123';
      showToast('Signing in to Customer Portal...', 'success');
      setTimeout(() => {
        completeSignIn({ email: 'customer@feedbackpro.io', name: 'Alex Customer', role: 'customer' });
      }, 400);
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
    const normalizedEmail = email.toLowerCase();

    if (normalizedEmail === 'admin@feedbackpro.io' && password === 'admin123') {
      showToast('Admin login successful! Redirecting to dashboard...', 'success');
      setTimeout(() => {
        completeSignIn({ email: 'admin@feedbackpro.io', name: 'Admin User', role: 'admin' });
      }, 350);
      return;
    }

    if (normalizedEmail === 'customer@feedbackpro.io' && password === 'customer123') {
      showToast('Welcome to the Customer Portal!', 'success');
      setTimeout(() => {
        completeSignIn({ email: 'customer@feedbackpro.io', name: 'Alex Customer', role: 'customer' });
      }, 350);
      return;
    }

    const registeredUsers = getRegisteredUsers();
    const matchedUser = registeredUsers.find(
      (user) => String(user.email || '').toLowerCase() === normalizedEmail && user.password === password
    );

    if (matchedUser) {
      const targetLabel = matchedUser.role === 'customer' ? 'Customer Portal' : 'Admin Dashboard';
      showToast(`Login successful! Redirecting to ${targetLabel}...`, 'success');
      setTimeout(() => {
        completeSignIn(matchedUser);
      }, 350);
      return;
    }

    showToast('Invalid credentials. Use demo accounts or create a new account.', 'error');
  });

  signupForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.querySelector('input[name="signupRole"]:checked')?.value === 'admin' ? 'admin' : 'customer';

    if (!name || !email || !password) {
      showToast('Please complete all signup fields.', 'error');
      return;
    }
    if (password.length < 8) {
      showToast('Choose a password with at least 8 characters.', 'error');
      return;
    }

    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail === 'admin@feedbackpro.io' || normalizedEmail === 'customer@feedbackpro.io') {
      showToast('That demo email is reserved. Please use another email or log in directly.', 'error');
      return;
    }

    const users = getRegisteredUsers().filter((user) => String(user.email || '').toLowerCase() !== normalizedEmail);
    const newUser = { name, email, password, role, createdAt: new Date().toISOString() };
    users.push(newUser);
    saveRegisteredUsers(users);

    if (role === 'admin') {
      const settings = getSettings();
      settings.displayName = name;
      saveSettings(settings);
    }

    const portalLabel = role === 'customer' ? 'Customer Portal' : 'Admin workspace';
    showToast(`Welcome aboard, ${name}! Opening ${portalLabel}...`, 'success');
    setTimeout(() => {
      completeSignIn(newUser);
    }, 450);
  });
});
