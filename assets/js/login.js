import { signIn, redirectIfLoggedIn } from './auth.js'

/* ── REDIRECT IF ALREADY LOGGED IN ── */
await redirectIfLoggedIn()

/* ── NAVIGATION ── */
document.getElementById("goToSignup").addEventListener("click", () => {
  window.location.href = "signup.html";
});

/* ── PASSWORD TOGGLE ── */
document.querySelectorAll('.toggle-password').forEach(function (button) {
  button.addEventListener('click', function () {
    const targetId = this.getAttribute('data-target')
    const input = document.getElementById(targetId)
    const icon = this.querySelector('.eye-icon')

    if (input.type === 'password') {
      input.type = 'text'
      icon.textContent = '🙈'
      this.setAttribute('aria-label', 'Hide password')
    } else {
      input.type = 'password'
      icon.textContent = '👁'
      this.setAttribute('aria-label', 'Show password')
    }
  })
})

/* ── LOGIN HANDLER ── */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault()
  handleLogin()
})

async function handleLogin() {
  // ── Get inputs — using exact IDs from your HTML ──
  const email = document.getElementById('emailAddress')   // ← login uses emailAddress not email
  const password = document.getElementById('password')

  const emailError = document.getElementById('emailError')
  const passwordError = document.getElementById('passwordError')
  const successBanner = document.getElementById('successBanner')

  /* ── Reset all errors ── */
  emailError.style.display = 'none'
  passwordError.style.display = 'none'
  successBanner.style.display = 'none'
  email.classList.remove('error')
  password.classList.remove('error')

  let valid = true

  /* ── Validate email format ── */
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value.trim())) {
    emailError.textContent = 'Please enter a valid email address'
    emailError.style.display = 'block'
    email.classList.add('error')
    valid = false
  }

  /* ── Validate password format ── */
  if (!passwordRegex.test(password.value)) {
    passwordError.textContent = 'Password must be at least 8 characters with uppercase, lowercase, and a number.'
    passwordError.style.display = 'block'
    password.classList.add('error')
    valid = false
  }

  if (!valid) return

  /* ── Disable button to prevent double submit ── */
  const submitBtn = document.querySelector('#loginForm button[type="submit"]')
  submitBtn.disabled = true
  submitBtn.textContent = 'Signing in...'

  try {
    /* ── Call Supabase — replaces localStorage credential check ── */
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
