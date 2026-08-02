import { requireAuth, signOut } from './auth.js'
import { supabase } from './supabase.js'
import { fetchStore, saveStore, uploadStoreLogo, uploadStoreBanner } from './store.js'
import { fetchProducts } from './products.js'
import { formatPrice, getStoreUrl, copyToClipboard, showToast, isValidWhatsApp } from './utils.js'
import { renderBottomNav } from '../components/bottomNav.js'

const user = await requireAuth()


// Load vendor data
const [store, products] = await Promise.all([
  fetchStore(user.id),
  fetchProducts(user.id),
])

// Render bottom nav — 'home' is active tab
renderBottomNav('home', null, store.store_name, store.logo_url)

if (!store) {
  // First time — show store setup modal
  openSetupModal()
} else {
  // Store exists — show dashboard
  renderDashboard(store, products)
}

// Store Setup Modal 
function openSetupModal() {
  const overlay = document.getElementById('setupModal')
  overlay.classList.add('open')
}

function closeSetupModal() {
  const overlay = document.getElementById('setupModal')
  overlay.classList.remove('open')
}

// Logo preview
let logoFile = null
let bannerFile = null

document.getElementById('logoFile').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (!file) return
  logoFile = file
  const preview = document.getElementById('logoPreview')
  preview.src = URL.createObjectURL(file)
  preview.style.display = 'block'
  document.querySelector('.logo-upload-icon').style.display = 'none'
  document.querySelector('.logo-upload-text').style.display = 'none'
})

document.getElementById('bannerFile').addEventListener('change', (e) => {
  const file = e.target.files[ 0 ]
  if (!file) return
  bannerFile = file

  // Show preview
  const preview = document.getElementById('bannerPreview')
  preview.src = URL.createObjectURL(file)
  preview.style.display = 'block'
  document.querySelector('.banner-upload-icon').style.display = 'none'
  document.querySelector('.banner-upload-text').style.display = 'none'
})

// Create store submit
document.getElementById('createStoreBtn').addEventListener('click', async () => {
  const storeName = document.getElementById('store_name').value.trim()
  const whatsapp  = '+' + document.getElementById('whatsapp').value.trim()
  const description = document.getElementById('description').value.trim()
  const location  = document.getElementById('location').value.trim()

  const storeNameError = document.getElementById('storeNameError')
  const whatsappError  = document.getElementById('whatsappError')

  // Reset errors
  storeNameError.style.display = 'none'
  whatsappError.style.display  = 'none'
  document.getElementById('store_name').classList.remove('error')
  document.getElementById('whatsapp').classList.remove('error')

  let valid = true

  if (!storeName) {
    storeNameError.style.display = 'block'
    document.getElementById('store_name').classList.add('error')
    valid = false
  }

  if (!isValidWhatsApp(whatsapp)) {
    whatsappError.style.display = 'block'
    document.getElementById('whatsapp').classList.add('error')
    valid = false
  }

  if (!valid) return

  const btn = document.getElementById('createStoreBtn')
  btn.disabled = true
  btn.innerHTML = '<div class="spinner"></div>'

  try {
    // Upload logo
    let logoUrl = null
    if (logoFile) {
      logoUrl = await uploadStoreLogo(user.id, logoFile)
    }

    // ── upload banner
    let bannerUrl = null
    if (bannerFile) {
      bannerUrl = await uploadStoreBanner(user.id, bannerFile)
    }

    // Save store to Supabase
    const newStore = await saveStore(user.id, {
      store_name:  storeName,
      whatsapp,
      description,
      location,
      ...(logoUrl && { logo_url: logoUrl }),
      ...(bannerUrl && { banner_url: bannerUrl }),
    })

    closeSetupModal()
    showToast('Store created! 🎉')

    // Fetch products (empty at this point) and render
    const products = await fetchProducts(user.id)
    renderDashboard(newStore, products)

  } catch (err) {
    showToast(err.message || 'Failed to create store', 'error')
    btn.disabled = false
    btn.textContent = 'Create Store'
  }
})

// Render Dashboard
function renderDashboard(store, products) {
  // Show page content
  document.getElementById('pageContent').style.display = 'flex'
  document.getElementById('pageContent').style.flexDirection = 'column'

  // Vendor name + avatar
  const storeName = store.store_name || 'Your Store'
  document.getElementById('vendorName').textContent = storeName
  const avatar = document.getElementById('vendorAvatar')

  if (store.logo_url) {
    avatar.innerHTML = `<img src="${store.logo_url}" alt="${storeName}">`
  } else {
    avatar.textContent = storeName.charAt(0).toUpperCase()
  }

  // Store link
  const storeUrl = getStoreUrl(store.id)
  document.getElementById('storeLinkUrl').textContent = storeUrl

  // Open store quick action link
  document.getElementById('openStoreAction').href = storeUrl

  // Copy link
  document.getElementById('copyLinkBtn').addEventListener('click', async () => {
    await copyToClipboard(storeUrl)
    const btn = document.getElementById('copyLinkBtn')
    btn.textContent = '✓ Copied!'
    btn.classList.add('copied')
    setTimeout(() => {
      btn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy Link`
      btn.classList.remove('copied')
    }, 2000)
  })

  // Preview store
  document.getElementById('previewStoreBtn').addEventListener('click', () => {
    window.open(storeUrl, '_blank')
  })

  // Share store
  document.getElementById('shareStoreBtn').addEventListener('click', async () => {
    if (navigator.share) {
      await navigator.share({ title: storeName, url: storeUrl })
    } else {
      await copyToClipboard(storeUrl)
      showToast('Link copied — share it anywhere!')
    }
  })

  // Recent products
  renderRecentProducts(products)
}

// Recent Products─
function renderRecentProducts(products) {
  const grid = document.getElementById('recentProductsGrid')

  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📦</div>
        <p class="empty-state-title">No products yet</p>
        <p class="empty-state-desc">Add your first product so customers can start ordering</p>
        <button class="empty-state-btn" onclick="window.location.href='add-product.html'">
          Add Product
        </button>
      </div>
    `
    return
  }

  // Show last 3 products
  const recent = products.slice(0, 3)
  grid.innerHTML = recent.map(p => `
    <div class="recent-product-card" onclick="window.location.href='products.html'">
      ${p.image_url
        ? `<img class="recent-product-img" src="${p.image_url}" alt="${p.name}" loading="lazy">`
        : `<div class="recent-product-img-placeholder">🛍️</div>`
      }
      <div class="recent-product-info">
        <p class="recent-product-name">${p.name}</p>
        <p class="recent-product-price">${formatPrice(p.price)}</p>
      </div>
    </div>
  `).join('')
}
