// Login authentication script - Supabase version with proper initialization
const SESSION_KEY = 'app_session_token'

// Wait for Supabase to be loaded
function waitForSupabase() {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const maxAttempts = 50
    
    const checkSupabase = setInterval(() => {
      attempts++
      
      if (typeof supabaseInit !== 'undefined') {
        clearInterval(checkSupabase)
        resolve(true)
      } else if (attempts >= maxAttempts) {
        clearInterval(checkSupabase)
        reject(new Error('Supabase failed to load'))
      }
    }, 100)
  })
}

document.addEventListener('DOMContentLoaded', async function(){
  const form = document.getElementById('login-form')
  const usernameInput = document.getElementById('username')
  const passwordInput = document.getElementById('password')
  const errorMessage = document.getElementById('error-message')
  const loginBtn = form.querySelector('.login-btn')
  
  // Wait for Supabase to be available
  try {
    console.log('⏳ Waiting for Supabase...')
    await waitForSupabase()
    console.log('✅ Supabase functions available')
    
    // Initialize Supabase
    await supabaseInit()
    console.log('✅ Supabase initialized')
  } catch (e) {
    console.error('❌ Supabase initialization error:', e)
    showError('Gagal memuat sistem. Refresh halaman.')
    return
  }
  
  form.addEventListener('submit', async function(e){
    e.preventDefault()
    
    const email = usernameInput.value.trim()
    const password = passwordInput.value
    
    console.log('🔐 Login attempt:', email)
    
    // Validate
    if(!email || !password){
      showError('Email dan sandi harus diisi')
      return
    }
    
    // Show loading
    loginBtn.disabled = true
    loginBtn.textContent = 'Memproses...'
    
    try {
      // Authenticate
      const user = await supabaseSignIn(email, password)
      
      if(user){
        console.log('✅ Login successful:', email)
        
        // Save session
        localStorage.setItem(SESSION_KEY, btoa(email + ':' + Date.now()))
        localStorage.setItem('current_user', email)
        localStorage.setItem('currentUserId', user.uid)
        localStorage.setItem('currentUserEmail', email)
        
        // Show success message
        showSuccess('Login berhasil! Mengalihkan...')
        
        // Redirect after delay
        setTimeout(() => {
          window.location.href = 'layout.html'
        }, 800)
      }
    } catch (error) {
      console.error('❌ Login error:', error.message)
      showError('Email atau sandi salah')
      passwordInput.value = ''
      passwordInput.focus()
    } finally {
      loginBtn.disabled = false
      loginBtn.textContent = 'Masuk'
    }
  })
  
  function showError(message){
    errorMessage.textContent = '❌ ' + message
    errorMessage.style.background = 'rgba(239, 68, 68, 0.1)'
    errorMessage.style.borderColor = 'rgba(239, 68, 68, 0.3)'
    errorMessage.style.color = '#fca5a5'
    errorMessage.classList.add('show')
    setTimeout(() => {
      errorMessage.classList.remove('show')
    }, 4000)
  }
  
  function showSuccess(message){
    errorMessage.textContent = '✅ ' + message
    errorMessage.style.background = 'rgba(34, 197, 94, 0.1)'
    errorMessage.style.borderColor = 'rgba(34, 197, 94, 0.3)'
    errorMessage.style.color = '#86efac'
    errorMessage.classList.add('show')
  }
})
