import { signUp, redirectIfLoggedIn } from './auth.js'

/* ── REDIRECT IF ALREADY LOGGED IN ── */
await redirectIfLoggedIn()

/* ── NAVIGATION ── */
document.getElementById("goToLogin").addEventListener("click", () => {
  window.location.href = "login.html";
});

/* ── PASSWORD TOGGLE ── */
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

/* ── SIGNUP HANDLER ── */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
const nameRegex = /^[A-Za-z\s]+$/

document.getElementById('signupForm').addEventListener('submit', function (e) {
  e.preventDefault()
  handleSignUp()
})

async function handleSignUp() {
  // ── Get inputs — using exact IDs from your HTML ──
  const name = document.getElementById('full_name') // ← was 'name', fixed
  const email = document.getElementById('email')
  const password = document.getElementById('password')
  const confirmPassword = document.getElementById('confirmPassword')
  const terms = document.getElementById('terms')

  const nameError = document.getElementById('nameError')
  const emailError = document.getElementById('emailError')
  const passwordError = document.getElementById('passwordError')
  const confirmPasswordError = document.getElementById('confirmPasswordError')
  const termsError = document.getElementById('termsError')
  const successBanner = document.getElementById('successBanner')

    /* ── Reset all errors ── */
    ;[ nameError, emailError, passwordError, confirmPasswordError, termsError ].forEach(function (el) {
      el.style.display = 'none'
    })
    ;[ name, email, password, confirmPassword ].forEach(function (el) {
      el.classList.remove('error')
    })
  successBanner.style.display = 'none'

  let valid = true

  /* ── Validate name ── */
  if (name.value.trim() === '') {
    nameError.textContent = 'Name is required'
    nameError.style.display = 'block'
    name.classList.add('error')
    valid = false
  } else if (!nameRegex.test(name.value.trim())) {
    nameError.textContent = 'Name must contain only letters'
    nameError.style.display = 'block'
    name.classList.add('error')
    valid = false
  }

  /* ── Validate email ── */
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value.trim())) {
    emailError.textContent = 'Please enter a valid email address'
    emailError.style.display = 'block'
    email.classList.add('error')
    valid = false
  }

  /* ── Validate password ── */
  if (!passwordRegex.test(password.value)) {
    passwordError.style.display = 'block'
    password.classList.add('error')
    valid = false
  }

  /* ── Validate confirm password — frontend only, never sent to Supabase ── */
  if (confirmPassword.value !== password.value) {
    confirmPasswordError.style.display = 'block'
    confirmPassword.classList.add('error')
    valid = false
  }

  /* ── Validate terms ── */
  if (!terms.checked) {
    termsError.style.display = 'block'
    valid = false
  }

  if (!valid) return

  /* ── Disable button to prevent double submit ── */
  const submitBtn = document.querySelector('#signupForm button[type="submit"]')
  submitBtn.disabled = true
  submitBtn.textContent = 'Creating account...'

  try {
    /* ── Call Supabase — sends full_name, email, password only ── */
    await signUp(name.value.trim(), email.value.trim(), password.value)

    successBanner.style.display = 'block'
    setTimeout(function () {
      window.location.href = 'dashboard.html'
    }, 1400)

  } catch (err) {
    emailError.textContent = err.message || 'Something went wrong. Please try again.'
    emailError.style.display = 'block'
    email.classList.add('error')

    submitBtn.disabled = false
    submitBtn.textContent = 'Create account'
  }
}