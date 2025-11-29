// Session guard - simple version, no loop
(function() {
  const SESSION_KEY = 'app_session_token';
  
  // Only check on layout page
  if (!window.location.pathname.includes('layout.html')) {
    return;
  }
  
  const session = localStorage.getItem(SESSION_KEY);
  
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  
  try {
    const data = JSON.parse(atob(session));
    if (Date.now() >= data.expiry) {
      localStorage.clear();
      window.location.href = 'login.html';
    }
  } catch (e) {
    localStorage.clear();
    window.location.href = 'login.html';
  }
  
  // Logout handler
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('logout-btn');
    if (btn) {
      btn.onclick = (e) => {
        e.preventDefault();
        if (confirm('Logout?')) {
          localStorage.clear();
          window.location.href = 'login.html';
        }
      };
    }
  });
})();
