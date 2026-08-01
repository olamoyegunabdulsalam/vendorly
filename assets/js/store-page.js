import { fetchStoreById } from './store.js'
import { fetchProducts } from './products.js'
import {
  getCart, addToCart, removeFromCart, updateQty,
  getCartCount, getCartTotal, clearCart,
  sendWhatsAppOrder
} from './cart.js'
import { formatPrice, getStoreIdFromUrl, parseTags } from './utils.js'

// ── State ────────────────────────────────────────────────────
let store        = null
let allProducts  = []
let filteredProducts = []
let currentProduct   = null
let selectedColor    = null
let selectedSize = null

// ── Init ─────────────────────────────────────────────────────
async function init() {
  const storeId = getStoreIdFromUrl()

  if (!storeId) {
    showError()
    return
  }

  try {
    // ── Step 1: fetch store first
    const storeData = await fetchStoreById(storeId)

    if (!storeData) {
      showError()
      return
    }

    store = storeData

    // ── Step 2: use vendor_id from store to fetch products
    const products = await fetchProducts(storeData.vendor_id)

    allProducts = products || []
    filteredProducts = [ ...allProducts ]

    renderStore()
    renderProducts(filteredProducts)
    hideLoader()

  } catch (err) {
    console.error('Store load error:', err)
    showError()
  }
}

// ── Render Store Header ───────────────────────────────────────
function renderStore() {
  // Store name
  document.getElementById('storeName').textContent = store.store_name
  document.title = `${store.store_name} — Vendorly`

  // Logo
  const logoWrap = document.getElementById('storeLogoWrap')
  const initials = document.getElementById('storeLogoInitials')

  if (store.logo_url) {
    logoWrap.innerHTML = `<img src="${store.logo_url}" alt="${store.store_name}">`
  } else {
    initials.textContent = store.store_name.charAt(0).toUpperCase()
  }

  // Banner
  const header = document.querySelector('.store-header')
  if (store.banner_url) {
    header.style.backgroundImage = `url(${store.banner_url})`
    header.style.backgroundSize = 'cover'
    header.style.backgroundPosition = 'center'
    // Add dark overlay so text stays readable
    header.style.background = `
    linear-gradient(to bottom, rgba(11,31,58,0.3) 0%, rgba(11,31,58,0.75) 100%),
    url(${store.banner_url}) center/cover no-repeat
  `
  }

  // Location
  if (store.location) {
    document.getElementById('storeLocation').style.display = 'flex'
    document.getElementById('storeLocationText').textContent = store.location
  }

  // Description
  if (store.description) {
    const desc = document.getElementById('storeDescription')
    desc.textContent = store.description
    desc.style.display = 'block'
  }

  // WhatsApp button
  const waBtn = document.getElementById('storeWhatsappBtn')
  const phone = store.whatsapp.replace(/[^0-9]/g, '')
  waBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(`Hi! I found your store on Vendorly — ${store.store_name}`)}`
}

// ── Render Products ───────────────────────────────────────────
function renderProducts(products) {
  const grid = document.getElementById('productsGrid')
  const emptyProducts = document.getElementById('emptyProducts')
  const emptySearch   = document.getElementById('emptySearch')
  const countEl       = document.getElementById('productsCount')

  // Hide all states first
  grid.style.display = 'none'
  emptyProducts.style.display = 'none'
  emptySearch.style.display   = 'none'

  const isSearching = document.getElementById('searchInput').value.trim() !== ''

  if (allProducts.length === 0) {
    // No products at all
    emptyProducts.style.display = 'flex'
    countEl.textContent = ''
    return
  }

  if (products.length === 0 && isSearching) {
    // Search returned nothing
    const query = document.getElementById('searchInput').value.trim()
    document.getElementById('emptySearchDesc').textContent =
      `No products found for "${query}". Try a different keyword.`
    emptySearch.style.display = 'flex'
    countEl.textContent = ''
    return
  }

  // Render product cards
  grid.style.display = 'grid'
  countEl.textContent = `${products.length} product${products.length !== 1 ? 's' : ''}`

  grid.innerHTML = products.map(p => {
    const colors = parseTags(p.colors)
    const colorDots = colors.slice(0, 4).map(() =>
      `<div class="product-card-variant-dot"></div>`
    ).join('')

    return `
      <div class="product-card" data-id="${p.id}" role="button" tabindex="0">
        ${p.image_url
          ? `<img class="product-card-image" src="${p.image_url}" alt="${p.name}" loading="lazy">`
          : `<div class="product-card-image-placeholder">🛍️</div>`
        }
        <div class="product-card-body">
          <p class="product-card-name">${p.name}</p>
          <p class="product-card-price">${formatPrice(p.price)}</p>
          ${colorDots ? `<div class="product-card-variants">${colorDots}</div>` : ''}
        </div>
      </div>
    `
  }).join('')

  // Attach click events to product cards
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const product = products.find(p => p.id === card.dataset.id)
      if (product) openDetailSheet(product)
    })
  })
}

// ── Search ────────────────────────────────────────────────────
const searchInput = document.getElementById('searchInput')
const searchClear = document.getElementById('searchClear')

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase()

  if (query) {
    searchClear.style.display = 'flex'
    filteredProducts = allProducts.filter(p =>
      p.name.toLowerCase().includes(query)
    )
  } else {
    searchClear.style.display = 'none'
    filteredProducts = [...allProducts]
  }

  renderProducts(filteredProducts)
})

searchClear.addEventListener('click', () => {
  searchInput.value = ''
  searchClear.style.display = 'none'
  filteredProducts = [...allProducts]
  renderProducts(filteredProducts)
  searchInput.focus()
})

// ── Product Detail Sheet ──────────────────────────────────────
function openDetailSheet(product) {
  currentProduct = product
  selectedColor  = null
  selectedSize   = null

  const overlay = document.getElementById('detailOverlay')

  // Image
  const img = document.getElementById('detailImage')
  const placeholder = document.getElementById('detailImagePlaceholder')

  if (product.image_url) {
    img.src = product.image_url
    img.alt = product.name
    img.style.display = 'block'
    placeholder.style.display = 'none'
  } else {
    img.style.display = 'none'
    placeholder.style.display = 'flex'
  }

  // Name + price
  document.getElementById('detailName').textContent  = product.name
  document.getElementById('detailPrice').textContent = formatPrice(product.price)

  // Description
  const descEl = document.getElementById('detailDescription')
  if (product.description) {
    descEl.textContent = product.description
    descEl.style.display = 'block'
  } else {
    descEl.style.display = 'none'
  }

  // Colors
  const colors = parseTags(product.colors)
  const colorVariants = document.getElementById('colorVariants')
  if (colors.length > 0) {
    colorVariants.style.display = 'block'
    document.getElementById('colorTags').innerHTML = colors.map(c => `
      <button class="variant-tag" data-type="color" data-value="${c}">${c}</button>
    `).join('')
  } else {
    colorVariants.style.display = 'none'
  }

  // Sizes
  const sizes = parseTags(product.sizes)
  const sizeVariants = document.getElementById('sizeVariants')
  if (sizes.length > 0) {
    sizeVariants.style.display = 'block'
    document.getElementById('sizeTags').innerHTML = sizes.map(s => `
      <button class="variant-tag" data-type="size" data-value="${s}">${s}</button>
    `).join('')
  } else {
    sizeVariants.style.display = 'none'
  }

  // Variant tag click handlers
  document.querySelectorAll('.variant-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const type  = tag.dataset.type
      const value = tag.dataset.value

      // Deselect others of same type
      document.querySelectorAll(`.variant-tag[data-type="${type}"]`).forEach(t => {
        t.classList.remove('selected')
      })
      tag.classList.add('selected')

      if (type === 'color') selectedColor = value
      if (type === 'size')  selectedSize  = value
    })
  })

  overlay.classList.add('open')
  document.body.style.overflow = 'hidden'
}

function closeDetailSheet() {
  document.getElementById('detailOverlay').classList.remove('open')
  document.body.style.overflow = ''
  currentProduct = null
}

document.getElementById('detailClose').addEventListener('click', closeDetailSheet)
document.getElementById('detailOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeDetailSheet()
})

// ── Add to Cart ───────────────────────────────────────────────
document.getElementById('addToCartBtn').addEventListener('click', () => {
  if (!currentProduct) return

  addToCart(currentProduct, selectedColor, selectedSize)
  closeDetailSheet()
  updateCartPill()

  // Brief toast
  showToast(`${currentProduct.name} added to cart`)
})

// ── Cart Pill ─────────────────────────────────────────────────
function updateCartPill() {
  const count = getCartCount()
  const pill  = document.getElementById('cartPill')
  const countEl = document.getElementById('cartPillCount')

  if (count > 0) {
    pill.style.display = 'flex'
    countEl.textContent = count
  } else {
    pill.style.display = 'none'
  }
}

document.getElementById('cartPill').addEventListener('click', openCartSheet)

// ── Cart Sheet ────────────────────────────────────────────────
function openCartSheet() {
  renderCartItems()
  document.getElementById('cartOverlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}

function closeCartSheet() {
  document.getElementById('cartOverlay').classList.remove('open')
  document.body.style.overflow = ''
}

document.getElementById('cartClose').addEventListener('click', closeCartSheet)
document.getElementById('cartOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeCartSheet()
})

function renderCartItems() {
  const cart    = getCart()
  const itemsEl = document.getElementById('cartItems')
  const totalEl = document.getElementById('cartTotalAmount')
  const footer  = document.querySelector('.cart-footer')
  const confirmation = document.getElementById('orderConfirmation')

  // Hide confirmation, show items
  confirmation.style.display = 'none'
  footer.style.display = 'block'

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:var(--text-secondary)">
        <div style="font-size:36px;margin-bottom:8px">🛒</div>
        <p style="font-weight:600;font-size:14px">Your cart is empty</p>
      </div>
    `
    totalEl.textContent = formatPrice(0)
    return
  }

  itemsEl.innerHTML = cart.map((item, index) => {
    const variant = [item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')
    return `
      <div class="cart-item" data-index="${index}">
        ${item.image_url
          ? `<img class="cart-item-image" src="${item.image_url}" alt="${item.name}">`
          : `<div class="cart-item-image-placeholder">🛍️</div>`
        }
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          ${variant ? `<p class="cart-item-variant">${variant}</p>` : ''}
          <p class="cart-item-price">${formatPrice(item.price * item.qty)}</p>
        </div>
        <div class="cart-item-right">
          <div class="qty-controls">
            <button class="qty-btn qty-minus" data-index="${index}">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn qty-plus" data-index="${index}">+</button>
          </div>
          <button class="cart-item-remove" data-index="${index}">Remove</button>
        </div>
      </div>
    `
  }).join('')

  totalEl.textContent = formatPrice(getCartTotal())

  // Qty controls
  itemsEl.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = cart[btn.dataset.index]
      updateQty(item.id, item.selectedColor, item.selectedSize, item.qty - 1)
      renderCartItems()
      updateCartPill()
    })
  })

  itemsEl.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = cart[btn.dataset.index]
      updateQty(item.id, item.selectedColor, item.selectedSize, item.qty + 1)
      renderCartItems()
      updateCartPill()
    })
  })

  itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = cart[btn.dataset.index]
      removeFromCart(item.id, item.selectedColor, item.selectedSize)
      renderCartItems()
      updateCartPill()
    })
  })
}

// ── Send Order ────────────────────────────────────────────────
document.getElementById('sendOrderBtn').addEventListener('click', () => {
  const cart = getCart()
  if (cart.length === 0) return

  const storeUrl = `${window.location.origin}/store.html?id=${store.id}`
  sendWhatsAppOrder(store.whatsapp, cart, storeUrl)

  // Show confirmation
  document.getElementById('cartItems').innerHTML  = ''
  document.querySelector('.cart-footer').style.display = 'none'
  document.getElementById('orderConfirmation').style.display = 'flex'
  updateCartPill()
})

// Continue shopping after order
document.getElementById('confirmContinueBtn').addEventListener('click', () => {
  closeCartSheet()
})

// ── Helpers ───────────────────────────────────────────────────
function hideLoader() {
  const loader = document.getElementById('storeLoader')
  loader.style.opacity = '0'
  loader.style.transition = 'opacity 0.3s ease'
  setTimeout(() => {
    loader.style.display = 'none'
    document.getElementById('storeContent').style.display = 'block'
  }, 300)
}

function showError() {
  document.getElementById('storeLoader').style.display = 'none'
  document.getElementById('storeError').style.display  = 'flex'
}

function showToast(message, type = 'success') {
  const existing = document.getElementById('vendorly-toast')
  if (existing) existing.remove()

  const colors = { success: '#0B1F3A', error: '#8b1b34' }
  const toast  = document.createElement('div')
  toast.id = 'vendorly-toast'
  toast.textContent = message
  toast.style.cssText = `
    position: fixed; bottom: 90px; left: 50%;
    transform: translateX(-50%);
    background: ${colors[type]};
    color: white; padding: 10px 20px;
    border-radius: 999px; font-size: 13px;
    font-weight: 600; z-index: 9999;
    box-shadow: 0 4px 20px rgba(11,31,58,0.25);
    white-space: nowrap;
    font-family: 'Inter', sans-serif;
  `
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2500)
}

// ── Run ───────────────────────────────────────────────────────
updateCartPill() // restore cart count from localStorage on load
init()
