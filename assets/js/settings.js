import { requireAuth, signOut, updatePassword, updateEmail, getUser } from './auth.js'
import { fetchStore, saveStore, uploadStoreLogo, uploadStoreBanner } from './store.js'
import { showToast } from './utils.js'
import { renderBottomNav } from '../components/bottomNav.js'

//  Init ─
const user = await requireAuth()

// Load current user email + store data
const [ authUser, store ] = await Promise.all([
  getUser(),
  fetchStore(user.id),
])


renderBottomNav('settings', null, store?.store_name, store?.logo_url)

//  Populate fields ─
document.getElementById('currentEmail').textContent = authUser?.email || ''


function renderHeader(store) {
  const storeName = store?.store_name || 'Your Store'

  const avatar = document.getElementById('vendorAvatar')
  if (store?.logo_url) {
    avatar.innerHTML = `<img src="${store.logo_url}" alt="${storeName}">`
  } else {
    avatar.textContent = storeName.charAt(0).toUpperCase() || '?'
  }
}

renderHeader(store)

// Store fields
if (store) {
  document.getElementById('storeName').value = store.store_name || ''
  document.getElementById('whatsapp').value = store.whatsapp || ''
  document.getElementById('location').value = store.location || ''
  document.getElementById('description').value = store.description || ''

  // Banner
  if (store.banner_url) {
    document.getElementById('bannerCurrent').src = store.banner_url
    document.getElementById('bannerCurrent').style.display = 'block'
    document.getElementById('bannerPlaceholder').style.display = 'none'
  }

  // Logo preview circle
  const logoCircle = document.getElementById('logoPreviewCircle')
  if (store.logo_url) {
    logoCircle.innerHTML = `<img src="${store.logo_url}" alt="logo">`
  } else {
    logoCircle.textContent = store.store_name?.charAt(0).toUpperCase() || '?'
  }
}

//  Banner file change 
let newBannerFile = null
document.getElementById('bannerFile').addEventListener('change', (e) => {
  const file = e.target.files[ 0 ]
  if (!file) return

  // ── Validate size before uploading ──
  if (file.size > 5 * 1024 * 1024) { // 5MB
    showToast('Banner must be under 5MB. Please choose a smaller image.', 'error')
    e.target.value = '' // reset input
    return
  }
  newBannerFile = file
  const preview = document.getElementById('bannerCurrent')
  preview.src = URL.createObjectURL(file)
  preview.style.display = 'block'
  document.getElementById('bannerPlaceholder').style.display = 'none'
})

//  Logo file change 
let newLogoFile = null
document.getElementById('logoFile').addEventListener('change', (e) => {
  const file = e.target.files[ 0 ]
  if (!file) return

  // ── Validate size before uploading ──
  if (file.size > 2 * 1024 * 1024) { // 2MB
    showToast('Logo must be under 2MB. Please choose a smaller image.', 'error')
    e.target.value = '' // reset input
    return
  }

  newLogoFile = file
  const circle = document.getElementById('logoPreviewCircle')
  circle.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="logo">`
})

// Populate slug field when store loads
if (store?.slug) {
  document.getElementById('storeSlug').value = store.slug
}

// Live preview as vendor types
document.getElementById('storeSlug').addEventListener('input', (e) => {
  const raw = e.target.value
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')  // only allow letters, numbers, hyphens
    .replace(/-+/g, '-')          // no double hyphens

  // Auto correct what they type
  if (raw !== cleaned) {
    e.target.value = cleaned
  }

  const preview = document.getElementById('slugPreview')
  const hint = document.getElementById('slugHint')

  if (cleaned) {
    preview.textContent = `✓ vendorly.com/store/${cleaned}`
    hint.style.color = 'var(--mint)'
    hint.textContent = 'Looks good'
  } else {
    preview.textContent = ''
    hint.style.color = 'var(--gray-400)'
    hint.textContent = 'Only letters, numbers and hyphens'
  }
})

//  Save Store Info ─
document.getElementById('saveStoreBtn').addEventListener('click', async () => {
  const storeName = document.getElementById('storeName').value.trim()
  const whatsapp = document.getElementById('whatsapp').value.trim()
  const location = document.getElementById('location').value.trim()
  const description = document.getElementById('description').value.trim()
  const newSlug = document.getElementById('storeSlug').value.trim()

  if (!storeName) { showToast('Store name is required', 'error'); return }
  if (!whatsapp) { showToast('WhatsApp number is required', 'error'); return }
  if (!newSlug) { showToast('Store URL name is required', 'error'); return }

  const btn = document.getElementById('saveStoreBtn')
  btn.disabled = true
  btn.innerHTML = '<div class="spinner"></div>'

  try {
    let bannerUrl = store?.banner_url || null
    if (newBannerFile) bannerUrl = await uploadStoreBanner(user.id, newBannerFile)

    let logoUrl = store?.logo_url || null
    if (newLogoFile) logoUrl = await uploadStoreLogo(user.id, newLogoFile)

    await saveStore(user.id, {
      store_name: storeName,
      whatsapp,
      location,
      description,
      slug: newSlug,   // ← pass slug explicitly so getUniqueSlug uses it
      ...(bannerUrl && { banner_url: bannerUrl }),
      ...(logoUrl && { logo_url: logoUrl }),
    })

    showToast('Settings saved ✓')

  } catch (err) {
    showToast(err.message || 'Failed to save', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = 'Save Changes'
  }

})

//  Update Email 
document.getElementById('updateEmailBtn').addEventListener('click', async () => {
  const newEmail = document.getElementById('newEmail').value.trim()

  if (!newEmail) {
    showToast('Enter a new email address', 'error')
    return
  }

  const btn = document.getElementById('updateEmailBtn')
  btn.disabled = true
  btn.textContent = 'Sending...'

  try {
    await updateEmail(newEmail)
    document.getElementById('newEmail').value = ''
    document.getElementById('emailNotice').style.display = 'block'
    showToast('Confirmation email sent ✓')
  } catch (err) {
    showToast(err.message || 'Failed to update email', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = 'Update Email'
  }
})

//  Update Password ─
document.getElementById('updatePasswordBtn').addEventListener('click', async () => {
  const newPassword = document.getElementById('newPassword').value
  const confirmPassword = document.getElementById('confirmPassword').value

  if (!newPassword) {
    showToast('Enter a new password', 'error')
    return
  }

  if (newPassword.length < 8) {
    showToast('Password must be at least 8 characters', 'error')
    return
  }

  if (newPassword !== confirmPassword) {
    showToast('Passwords do not match', 'error')
    return
  }

  const btn = document.getElementById('updatePasswordBtn')
  btn.disabled = true
  btn.textContent = 'Updating...'

  try {
    await updatePassword(newPassword)
    document.getElementById('newPassword').value = ''
    document.getElementById('confirmPassword').value = ''
    showToast('Password updated ✓')
  } catch (err) {
    showToast(err.message || 'Failed to update password', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = 'Update Password'
  }
})

//  Logout 
document.getElementById('logoutBtn').addEventListener('click', async () => {
  const btn = document.getElementById('logoutBtn')
  btn.disabled = true
  btn.textContent = 'Logging out...'

  try {
    await signOut()
    window.location.href = 'login.html'
  } catch (err) {
    showToast(err.message || 'Logout failed', 'error')
    btn.disabled = false
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Log Out`
  }
})
