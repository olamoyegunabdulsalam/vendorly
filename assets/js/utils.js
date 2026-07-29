// utils.js — Shared helper functions
// Import wherever needed across all pages

//  Format Price 
// Price stored as integer in DB format for display
// e.g. 15000 → ₦15,000
export function formatPrice(amount) {
  return `₦${Number(amount).toLocaleString()}`
}

//  Get Store URL 
// Returns the full public URL for a vendor's store
export function getStoreUrl(storeId) {
  return `${window.location.origin}/store.html?id=${storeId}`
}

//  Get Store ID from URL 
// Used on store.html to know which store to load
export function getStoreIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('id')
}

//  Show Toast Notification 
// Creates a temporary toast message on screen
// type: 'success' | 'error' | 'info'
export function showToast(message, type = 'success') {
  const existing = document.getElementById('vendorly-toast')
  if (existing) existing.remove()

  const colors = {
    success: '#006b5f',
    error: '#8b1b34',
    info: '#3525cd',
  }

  const toast = document.createElement('div')
  toast.id = 'vendorly-toast'
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 24px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    animation: fadeInUp 0.3s ease;
  `

  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

//  Show Loading Spinner 
// Inserts a spinner into a container element
export function showLoader(containerId) {
  const el = document.getElementById(containerId)
  if (!el) return
  el.innerHTML = `
    <div style="display:flex;justify-content:center;padding:40px;">
      <div class="spinner"></div>
    </div>
  `
}

//  Show Error State 
export function showError(containerId, message = 'Something went wrong.') {
  const el = document.getElementById(containerId)
  if (!el) return
  el.innerHTML = `
    <div style="text-align:center;padding:40px;color:#8b1b34;">
      <p>${message}</p>
    </div>
  `
}

//  Show Empty State 
export function showEmpty(containerId, message = 'Nothing here yet.') {
  const el = document.getElementById(containerId)
  if (!el) return
  el.innerHTML = `
    <div style="text-align:center;padding:40px;color:#64748b;">
      <p>${message}</p>
    </div>
  `
}

//  Debounce 
// Delays function execution — useful for search inputs
export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

//  Parse Tags (colors / sizes) 
// Converts comma-separated string to array and back
export function parseTags(str) {
  if (!str) return []
  return str.split(',').map((t) => t.trim()).filter(Boolean)
}

export function tagsToString(arr) {
  return arr.join(', ')
}

//  Validate WhatsApp Number 
// Must start with + and contain 7-15 digits
export function isValidWhatsApp(number) {
  return /^\+[0-9]{7,15}$/.test(number.trim())
}

//  Copy to Clipboard 
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    el.remove()
    return true
  }
}
