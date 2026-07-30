/* ── NAVIGATION ── */

function goToSignup() {
  window.location.href = "signup.html";
}


/* ── LOGIN HANDLER ── */

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  handleLogin();
});

function handleLogin() {
  const email    = document.getElementById("emailAddress");
  const password = document.getElementById("password");
  const emailError    = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const successBanner = document.getElementById("successBanner");

  /* reset */
  emailError.style.display    = "none";
  passwordError.style.display = "none";
  successBanner.style.display = "none";
  email.classList.remove("error");
  password.classList.remove("error");

  let valid = true;

  /* validate email */
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value.trim())) {
    emailError.style.display = "block";
    email.classList.add("error");
    valid = false;
  }

  /* validate password */
  if (!passwordRegex.test(password.value)) {
    passwordError.textContent   = "Password must be at least 8 characters with uppercase, lowercase, and a number.";
    passwordError.style.display = "block";
    password.classList.add("error");
    valid = false;
  }

  if (!valid) return;

  /* check credentials */
  const savedEmail    = localStorage.getItem("user_email");
  const savedPassword = localStorage.getItem("user_password");

  if (email.value.trim() === savedEmail && password.value === savedPassword) {
    localStorage.setItem("loggedIn", "true");
    successBanner.style.display = "block";
    setTimeout(function () {
      window.location.href = "index.html";
    }, 1200);
  } else {
    emailError.textContent   = "Invalid email or password.";
    emailError.style.display = "block";
    email.classList.add("error");
  }
}