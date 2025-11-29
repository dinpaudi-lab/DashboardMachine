// Proteksi halaman dashboard - cuma bisa diakses kalau sudah login
(function() {
  const SESSION_KEY = 'app_session_token';
  
  // Cek apakah user sudah login
  const sessionToken = localStorage.getItem(SESSION_KEY);
  
  if (!sessionToken) {
    // BELUM LOGIN → redirect ke login
    console.log('Belum login, redirect ke login.html');
    window.location.href = 'login.html';
    return;
  }
  
  try {
    const sessionData = JSON.parse(atob(sessionToken));
    
    // Cek apakah session sudah expired
    if (Date.now() >= sessionData.expiry) {
      console.log('Session expired, redirect ke login');
      localStorage.removeItem(SESSION_KEY);
      window.location.href = 'login.html';
      return;
    }
    
    console.log('✅ Session valid:', sessionData.username);
    
  } catch (e) {
    // Session rusak
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  }
  
  // Handle tombol logout
  document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Yakin ingin logout?')) {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem('current_user');
          localStorage.removeItem('currentUserId');
          window.location.href = 'login.html';
        }
      });
    }
  });
  
})();
