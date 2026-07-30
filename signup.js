/* ── NAVIGATION ── */

function goToLogin() {
  window.location.href = "login.html";
}

/* ── PASSWORD TOGGLE ── */

document.querySelectorAll(".toggle-password").forEach(function (button) {
  button.addEventListener("click", function () {
    const targetId = this.getAttribute("data-target");
    const input = document.getElementById(targetId);
    const icon = this.querySelector(".eye-icon");

    if (input.type === "password") {
      input.type = "text";
      icon.textContent = "🙈";
      this.setAttribute("aria-label", "Hide password");
    } else {
      input.type = "password";
      icon.textContent = "👁";
      this.setAttribute("aria-label", "Show password");
    }
  });
});

/* ── SIGNUP HANDLER ── */

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const nameRegex     = /^[A-Za-z\s]+$/;

document.getElementById("signupForm").addEventListener("submit", function (e) {
  e.preventDefault();
  handleSignUp();
});

function handleSignUp() {
  const name            = document.getElementById("name");
  const email           = document.getElementById("email");
  const password        = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const terms           = document.getElementById("terms");

  const nameError            = document.getElementById("nameError");
  const emailError           = document.getElementById("emailError");
  const passwordError        = document.getElementById("passwordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const termsError           = document.getElementById("termsError");
  const successBanner        = document.getElementById("successBanner");

  /* reset all */
  [nameError, emailError, passwordError, confirmPasswordError, termsError].forEach(function (el) {
    el.style.display = "none";
  });
  [name, email, password, confirmPassword].forEach(function (el) {
    el.classList.remove("error");
  });
  successBanner.style.display = "none";

  let valid = true;

  /* validate name */
  if (name.value.trim() === "") {
    nameError.textContent   = "Name is required";
    nameError.style.display = "block";
    name.classList.add("error");
    valid = false;
  } else if (!nameRegex.test(name.value.trim())) {
    nameError.textContent   = "Name must contain only letters";
    nameError.style.display = "block";
    name.classList.add("error");
    valid = false;
  }

  /* validate email */
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value.trim())) {
    emailError.textContent   = "Please enter a valid email address";
    emailError.style.display = "block";
    email.classList.add("error");
    valid = false;
  }

  /* validate password */
  if (!passwordRegex.test(password.value)) {
    passwordError.style.display = "block";
    password.classList.add("error");
    valid = false;
  }

  /* validate confirm password */
  if (confirmPassword.value !== password.value) {
    confirmPasswordError.style.display = "block";
    confirmPassword.classList.add("error");
    valid = false;
  }

  /* validate terms */
  if (!terms.checked) {
    termsError.style.display = "block";
    valid = false;
  }

  if (!valid) return;

  /* save to localStorage */
  localStorage.setItem("user_name",          name.value.trim());
  localStorage.setItem("user_email",         email.value.trim());
  localStorage.setItem("user_password",      password.value);

  successBanner.style.display = "block";
  setTimeout(function () {
    window.location.href = "login.html";
  }, 1400);
}