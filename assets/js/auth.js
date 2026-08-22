// All authentication functions
// Handles signup, login, logout, password reset, session

import { supabase } from './supabase.js'

// Signin Google
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard.html`
    }
  })
  if (error) throw error
  return data
}

// Sign Up
// Creates auth user + inserts profile row manually (no DB trigger)
export async function signUp(fullName, email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error

  // Manually insert profile row after user is created
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, full_name: fullName })

  if (profileError) throw profileError

  return data
}

// Sign In
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

// Sign Out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

//  Get Current Session 
// Returns the current session or null if not logged in
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

//  Get Current User 
export async function getUser() {
  const session = await getSession()
  return session ? session.user : null
}

//  Listen for Auth State Changes 
// Call this on page load to react when user logs in/out
// callback receives (event, session)
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

//  Send Password Reset Email 
export async function sendPasswordResetEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password.html`,
  })
  if (error) throw error
}

//  Update Password (after reset link is clicked) 
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

//  Update Email 
// Sends confirmation to new email old email works until confirmed
export async function updateEmail(newEmail) {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw error
}

//  Require Auth Guard 
// Call this at the top of any protected page (dashboard, etc)
// Redirects to login if no session found
export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    window.location.href = '/login.html'
    return null
  }
  return session.user
}

//  Redirect If Already Logged In 
// Call on login/signup pages so logged-in users go to dashboard
export async function redirectIfLoggedIn() {
  const session = await getSession()
  if (session) {
    window.location.href = '/dashboard.html'
  }
}
