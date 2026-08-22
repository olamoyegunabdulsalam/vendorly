import { signIn, redirectIfLoggedIn, signInWithGoogle } from './auth.js'

/* REDIRECT IF ALREADY LOGGED IN */
await redirectIfLoggedIn()

// Wire up the Google button
document.querySelector('.btn-social').addEventListener('click', async () => {
  try {
    await signInWithGoogle()
    // No redirect needed here — Supabase handles it automatically
  } catch (err) {
    emailError.textContent = err.message || 'Google sign in failed'
    emailError.style.display = 'block'
  }
})

/* PASSWORD TOGGLE */
document.querySelectorAll('.toggle-password').forEach(function (button) {
  button.addEventListener('click', function () {
    const targetId = this.getAttribute('data-target')
    const input = document.getElementById(targetId)

    if (input.type === 'password') {
      input.type = 'text'
      this.classList.add('is-visible')
      this.setAttribute('aria-label', 'Hide password')
    } else {
      input.type = 'password'
      this.classList.remove('is-visible')
      this.setAttribute('aria-label', 'Show password')
    }
  })
})


document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault()
  handleLogin()
})

async function handleLogin() {
  // Get inputs — using exact IDs from your HTML
  const email = document.getElementById('emailAddress')   // ← login uses emailAddress not email
  const password = document.getElementById('password')

  const emailError = document.getElementById('emailError')
  const passwordError = document.getElementById('passwordError')
  const successBanner = document.getElementById('successBanner')

  /* Reset all errors */
  emailError.style.display = 'none'
  passwordError.style.display = 'none'
  successBanner.style.display = 'none'
  email.classList.remove('error')
  password.classList.remove('error')

  let valid = true

  /* Validate email format */
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value.trim())) {
    emailError.textContent = 'Please enter a valid email address'
    emailError.style.display = 'block'
    email.classList.add('error')
    valid = false
  }


  if (!valid) return

  /* Disable button to prevent double submit */
  const submitBtn = document.querySelector('#loginForm button[type="submit"]')
  submitBtn.disabled = true
  submitBtn.textContent = 'Signing in...'

  try {
    /* Call Supabase — replaces localStorage credential check */
    await signIn(email.value.trim(), password.value)

    successBanner.style.display = 'block'
    setTimeout(function () {
      window.location.href = 'dashboard.html'
    }, 1200)

  } catch (err) {
    emailError.textContent = 'Invalid email or password.'
    emailError.style.display = 'block'
    email.classList.add('error')

    submitBtn.disabled = false
    submitBtn.textContent = 'Log in'
  }
}