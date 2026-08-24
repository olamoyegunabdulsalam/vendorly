import { requireAuth, signOut } from './auth.js'
import { supabase } from './supabase.js'
import { fetchStore, saveStore, uploadStoreLogo, uploadStoreBanner } from './store.js'
import { fetchProducts } from './products.js'
import { formatPrice, getStoreUrl, copyToClipboard, showToast, isValidWhatsApp } from './utils.js'
import { renderBottomNav } from '../components/bottomNav.js'

// Share-store-card state — declared up front since renderDashboard (called
// during initial module load below) assigns to these on first paint.
let currentStoreRef = null
let currentProductsRef = null
const shareFormat = 'square'
let currentCanvasBlob = null

const user = await requireAuth()

// ── Handle Google OAuth users who have no profile yet ──
try {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existingProfile) {
    // New Google user — create profile
    const { error } = await supabase
      .from('profiles')
      .insert({
        id:        user.id,
        full_name: user.user_metadata?.full_name ||
                   user.user_metadata?.name ||
                   user.email?.split('@')[0] ||
                   'Vendor'
      })

    if (error) console.error('Profile creation error:', error)
  }
} catch (err) {
  console.error('Profile check error:', err)
}


// Load vendor data
const [ store, products ] = await Promise.all([
  fetchStore(user.id),
  fetchProducts(user.id),
])

// Render bottom nav — 'home' is active tab
renderBottomNav('home', null, store?.store_name, store?.logo_url)

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
  const file = e.target.files[ 0 ]
  if (!file) return

  // ── Validate size before uploading ──
  if (file.size > 2 * 1024 * 1024) { // 2MB
    showToast('Logo must be under 2MB. Please choose a smaller image.', 'error')
    e.target.value = '' // reset input
    return
  }

  logoFile = file

  const preview = document.getElementById('logoPreview')
  const overlay = document.getElementById('logoChangeOverlay')

  preview.src = URL.createObjectURL(file)
  preview.style.display = 'block'
  overlay.style.display = 'flex'   // ← show overlay
  document.querySelector('.logo-upload-icon').style.display = 'none'
  document.querySelector('.logo-upload-text').style.display = 'none'
})


document.getElementById('bannerFile').addEventListener('change', (e) => {
  const file = e.target.files[ 0 ]
  if (!file) return

  // ── Validate size before uploading ──
  if (file.size > 5 * 1024 * 1024) { // 5MB
    showToast('Banner must be under 5MB. Please choose a smaller image.', 'error')
    e.target.value = '' // reset input
    return
  }

  bannerFile = file

  const preview = document.getElementById('bannerPreview')
  const overlay = document.getElementById('bannerChangeOverlay')

  preview.src = URL.createObjectURL(file)
  preview.style.display = 'block'
  overlay.style.display = 'flex'   // ← show overlay
  document.querySelector('.banner-upload-icon').style.display = 'none'
  document.querySelector('.banner-upload-text').style.display = 'none'
})

// Create store submit
document.getElementById('createStoreBtn').addEventListener('click', async () => {
  const storeName = document.getElementById('store_name').value.trim()
  const whatsapp = '+' + document.getElementById('whatsapp').value.trim()
  const description = document.getElementById('description').value.trim()
  const location = document.getElementById('location').value.trim()

  const storeNameError = document.getElementById('storeNameError')
  const whatsappError = document.getElementById('whatsappError')

  // Reset errors
  storeNameError.style.display = 'none'
  whatsappError.style.display = 'none'
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

    // upload banner
    let bannerUrl = null
    if (bannerFile) {
      bannerUrl = await uploadStoreBanner(user.id, bannerFile)
    }

    // Save store to Supabase
    const newStore = await saveStore(user.id, {
      store_name: storeName,
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

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning ☀️'
  if (hour < 18) return 'Good Afternoon 🌤️'
  return 'Good Evening 🌙'
}

function renderHeader(store) {
  const storeName = store?.store_name || 'Your Store'
  document.getElementById('headerGreeting').textContent = getGreeting()
  document.getElementById('vendorName').textContent = storeName

  const avatar = document.getElementById('vendorAvatar')
  if (store?.logo_url) {
    avatar.innerHTML = `<img src="${store.logo_url}" alt="${storeName}">`
  } else {
    avatar.textContent = storeName.charAt(0).toUpperCase() || '?'
  }
}

// Render Dashboard
function renderDashboard(store, products) {
  // Keep refs so the share modal can redraw the card without re-fetching
  currentStoreRef = store
  currentProductsRef = products

  // Show page content
  document.getElementById('pageContent').style.display = 'flex'
  document.getElementById('pageContent').style.flexDirection = 'column'

  renderHeader(store)

  // Store link
  const storeUrl = getStoreUrl(store.id, store.slug)
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

  // Share store — opens the store card image modal
  document.getElementById('shareStoreBtn').addEventListener('click', openShareModal)

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

// ============================================
// SHARE STORE CARD — generates a shareable image
// ============================================
// (currentStoreRef, currentProductsRef, shareFormat, currentCanvasBlob
// are declared near the top of the file — see note there. Square is the
// only supported format now, so shareFormat is a fixed constant.)

const SHARE_FORMATS = {
  square: { w: 1080, h: 1080 },
}

// Loads an image for canvas use. Resolves null (instead of throwing) on any
// failure — including CORS — so the card always falls back gracefully to a
// plain gradient instead of leaving a broken/tainted canvas.
function loadImageSafe(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// Wraps text to a max width/line count, drawing each line. Returns line count.
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = text.split(' ')
  let line = ''
  let lines = []

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' '
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      lines.push(line.trim())
      line = words[i] + ' '
    } else {
      line = testLine
    }
  }
  lines.push(line.trim())

  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines)
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*$/, '') + '…'
  }

  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight))
  return lines.length
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Draws the store card onto #shareCanvas for the given format, then caches
// a PNG blob (currentCanvasBlob) for the download/share buttons.
async function drawStoreCard(store, products, format) {
  if (!store) return

  const canvas = document.getElementById('shareCanvas')
  const loading = document.getElementById('sharePreviewLoading')
  loading.style.display = 'flex'

  await document.fonts.ready.catch(() => {})

  const { w, h } = SHARE_FORMATS[format]
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  const storeName = store.store_name || 'Your Store'
  const productCount = products?.length || 0
  const storeUrl = getStoreUrl(store.id, store.slug).replace(/^https?:\/\//, '')

  // Background — banner image (cover-fit) or brand gradient fallback
  const bannerImg = await loadImageSafe(store.banner_url)

  if (bannerImg) {
    const imgRatio = bannerImg.width / bannerImg.height
    const canvasRatio = w / h
    let drawW, drawH, dx, dy
    if (imgRatio > canvasRatio) {
      drawH = h
      drawW = h * imgRatio
      dx = (w - drawW) / 2
      dy = 0
    } else {
      drawW = w
      drawH = w / imgRatio
      dx = 0
      dy = (h - drawH) / 2
    }
    ctx.drawImage(bannerImg, dx, dy, drawW, drawH)
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#3525cd')
    grad.addColorStop(1, '#1b1450')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  // Dark gradient overlay so text stays legible over any banner
  const overlay = ctx.createLinearGradient(0, 0, 0, h)
  overlay.addColorStop(0, 'rgba(11,15,35,0.15)')
  overlay.addColorStop(0.55, 'rgba(11,15,35,0.55)')
  overlay.addColorStop(1, 'rgba(11,15,35,0.92)')
  ctx.fillStyle = overlay
  ctx.fillRect(0, 0, w, h)

  const pad = w * 0.08

  // Logo circle (top-left)
  const logoImg = await loadImageSafe(store.logo_url)
  const logoR = w * 0.09
  const logoCx = pad + logoR
  const logoCy = pad + logoR

  ctx.beginPath()
  ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  if (logoImg) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(logoCx, logoCy, logoR - w * 0.006, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(logoImg, logoCx - logoR, logoCy - logoR, logoR * 2, logoR * 2)
    ctx.restore()
  } else {
    ctx.fillStyle = '#3525cd'
    ctx.font = `800 ${logoR}px 'Archivo Expanded', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(storeName.charAt(0).toUpperCase(), logoCx, logoCy + logoR * 0.05)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  // "VENDORLY STORE" eyebrow
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = `700 ${w * 0.022}px 'Inter', sans-serif`
  ctx.fillText('VENDORLY STORE', pad, pad + logoR * 2 + w * 0.045)

  // Store name
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${w * 0.065}px 'Archivo Expanded', sans-serif`
  const nameY = pad + logoR * 2 + w * 0.11
  const lineCount = wrapCanvasText(ctx, storeName, pad, nameY, w - pad * 2, w * 0.075, 2)

  let cursorY = nameY + (lineCount - 1) * (w * 0.075) + w * 0.06

  // Location
  if (store.location) {
    ctx.font = `500 ${w * 0.026}px 'Inter', sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText(`📍 ${store.location}`, pad, cursorY)
    cursorY += w * 0.05
  }

  // Product thumbnails — up to 4 products that have a photo, fitted into
  // whatever vertical space is left between the store info and the bottom CTA.
  const bottomY = h - pad
  const thumbAreaTop = cursorY + w * 0.02
  const thumbAreaBottom = bottomY - w * 0.095

  const thumbProducts = (products || []).filter((p) => p.image_url).slice(0, 4)

  if (thumbProducts.length > 0 && thumbAreaBottom - thumbAreaTop > w * 0.12) {
    const thumbGap = w * 0.025
    const thumbCount = thumbProducts.length
    const maxThumbW = (w - pad * 2 - thumbGap * (thumbCount - 1)) / thumbCount
    const maxThumbH = thumbAreaBottom - thumbAreaTop
    const thumbSize = Math.min(maxThumbW, maxThumbH, w * 0.22)
    const thumbR = w * 0.02
    const thumbY = thumbAreaTop + (maxThumbH - thumbSize) / 2

    const thumbImages = await Promise.all(
      thumbProducts.map((p) => loadImageSafe(p.image_url))
    )

    thumbImages.forEach((img, i) => {
      const tx = pad + i * (thumbSize + thumbGap)
      const ty = thumbY

      // Backing fill (shows through if an image fails to load)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      roundRect(ctx, tx, ty, thumbSize, thumbSize, thumbR)
      ctx.fill()

      if (img) {
        ctx.save()
        roundRect(ctx, tx, ty, thumbSize, thumbSize, thumbR)
        ctx.clip()

        // Cover-fit crop into the square slot
        const ir = img.width / img.height
        let dw, dh, ddx, ddy
        if (ir > 1) {
          dh = thumbSize
          dw = thumbSize * ir
          ddx = tx - (dw - thumbSize) / 2
          ddy = ty
        } else {
          dw = thumbSize
          dh = thumbSize / ir
          ddx = tx
          ddy = ty - (dh - thumbSize) / 2
        }
        ctx.drawImage(img, ddx, ddy, dw, dh)
        ctx.restore()
      }

      // Thin border for definition against the banner
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 2
      roundRect(ctx, tx, ty, thumbSize, thumbSize, thumbR)
      ctx.stroke()

      // "+N" overlay on the last thumbnail if more products exist than shown
      if (i === thumbCount - 1 && productCount > thumbCount) {
        const extra = productCount - thumbCount
        ctx.fillStyle = 'rgba(11,15,35,0.6)'
        roundRect(ctx, tx, ty, thumbSize, thumbSize, thumbR)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = `800 ${thumbSize * 0.26}px 'Inter', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`+${extra}`, tx + thumbSize / 2, ty + thumbSize / 2)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }
    })
  }

  // Bottom — WhatsApp CTA + store link
  ctx.font = `700 ${w * 0.03}px 'Inter', sans-serif`
  ctx.fillStyle = '#25d366'
  ctx.fillText('💬 Order on WhatsApp', pad, bottomY - w * 0.05)

  ctx.font = `600 ${w * 0.026}px 'IBM Plex Mono', monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillText(storeUrl, pad, bottomY)

  loading.style.display = 'none'

  currentCanvasBlob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/png', 0.95)
  )
}

function openShareModal() {
  if (!currentStoreRef) return
  document.getElementById('shareImageModal').classList.add('open')
  drawStoreCard(currentStoreRef, currentProductsRef, shareFormat)
}

function closeShareModal() {
  document.getElementById('shareImageModal').classList.remove('open')
}

document.getElementById('shareModalCloseBtn').addEventListener('click', closeShareModal)
document.getElementById('shareImageModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeShareModal()
})

document.getElementById('downloadCardBtn').addEventListener('click', () => {
  if (!currentCanvasBlob) return
  const link = document.createElement('a')
  link.href = URL.createObjectURL(currentCanvasBlob)
  link.download = `${currentStoreRef?.slug || 'store'}-card.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 2000)
})

document.getElementById('shareCardBtn').addEventListener('click', async () => {
  if (!currentCanvasBlob) return

  const storeName = currentStoreRef?.store_name || 'my store'
  const file = new File([currentCanvasBlob], 'store-card.png', { type: 'image/png' })

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: storeName,
        text: `Check out ${storeName} on Vendorly!`,
      })
    } else {
      // Web Share API (files) unsupported — download instead so the person
      // can share the image manually from their gallery/files app.
      const link = document.createElement('a')
      link.href = URL.createObjectURL(currentCanvasBlob)
      link.download = `${currentStoreRef?.slug || 'store'}-card.png`
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 2000)
      showToast('Image downloaded — share it from your gallery')
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      showToast('Could not share image', 'error')
    }
  }
})