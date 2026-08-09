import { requireAuth } from './auth.js'
import { fetchStore } from './store.js'
import { fetchProducts, deleteProduct, deleteProductImage } from './products.js'
import { formatPrice, showToast } from './utils.js'
import { renderBottomNav } from '../components/bottomNav.js'


function renderHeader(store) {
  const storeName = store?.store_name || 'Your Store'

  const avatar = document.getElementById('vendorAvatar')
  if (store?.logo_url) {
    avatar.innerHTML = `<img src="${store.logo_url}" alt="${storeName}">`
  } else {
    avatar.textContent = storeName.charAt(0).toUpperCase() || '?'
  }
}

// Init
const user = await requireAuth()
const store = await fetchStore(user.id)
renderBottomNav('products', null, store?.store_name, store?.logo_url)
renderHeader(store)

// Load Products
let allProducts = []

async function init() {
  try {
    allProducts = await fetchProducts(user.id)
    renderProducts(allProducts)
    updateSubtitle(allProducts.length)
  } catch (err) {
    showToast('Failed to load products', 'error')
    console.error(err)
  }
}

init()

// Render Products
function renderProducts(products) {
  const list = document.getElementById('productsList')
  const emptyState = document.getElementById('emptyState')
  const emptySearch = document.getElementById('emptySearch')

  emptyState.style.display = 'none'
  emptySearch.style.display = 'none'

  const isSearching = document.getElementById('searchInput').value.trim() !== ''

  if (allProducts.length === 0) {
    list.innerHTML = ''
    emptyState.style.display = 'flex'
    return
  }

  if (products.length === 0 && isSearching) {
    list.innerHTML = ''
    const query = document.getElementById('searchInput').value.trim()
    document.getElementById('emptySearchDesc').textContent =
      `No products match "${query}". Try a different keyword.`
    emptySearch.style.display = 'flex'
    return
  }

  list.innerHTML = products.map(p => `
    <div class="product-item" data-id="${p.id}">
      ${p.image_url
      ? `<img class="product-item-image" src="${p.image_url}" alt="${p.name}" loading="lazy">`
      : `<div class="product-item-image-placeholder">🛍️</div>`
    }
      <div class="product-item-info">
        <p class="product-item-name">${p.name}</p>
        <p class="product-item-price">${formatPrice(p.price)}</p>
        <div class="product-item-variants">
          ${p.colors ? `<span class="product-item-variant-tag">Colour: ${p.colors}</span>` : ''}
          ${p.sizes ? `<span class="product-item-variant-tag">Size: ${p.sizes}</span>` : ''}
        </div>
      </div>
      <div class="product-item-actions">
        <button class="product-edit-btn" data-id="${p.id}" aria-label="Edit ${p.name}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="product-delete-btn" data-id="${p.id}" data-name="${p.name}" data-image="${p.image_url || ''}" aria-label="Delete ${p.name}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('')

  // Edit buttons
  list.querySelectorAll('.product-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `add-product.html?id=${btn.dataset.id}`
    })
  })

  // Delete buttons
  list.querySelectorAll('.product-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openDeleteModal(btn.dataset.id, btn.dataset.name, btn.dataset.image)
    })
  })
}

// Update Subtitle
function updateSubtitle(count) {
  document.getElementById('productsSubtitle').textContent =
    `${count} product${count !== 1 ? 's' : ''} in your store`
}

// Search
const searchInput = document.getElementById('searchInput')
const searchClear = document.getElementById('searchClear')

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase()

  if (query) {
    searchClear.style.display = 'flex'
    const filtered = allProducts.filter(p =>
      p.name.toLowerCase().includes(query)
    )
    renderProducts(filtered)
  } else {
    searchClear.style.display = 'none'
    renderProducts(allProducts)
  }
})

searchClear.addEventListener('click', () => {
  searchInput.value = ''
  searchClear.style.display = 'none'
  renderProducts(allProducts)
  searchInput.focus()
})

// Delete Modal
let deleteTargetId = null
let deleteTargetImage = null

function openDeleteModal(id, name, imageUrl) {
  deleteTargetId = id
  deleteTargetImage = imageUrl
  document.getElementById('deleteProductName').textContent = name
  document.getElementById('deleteModal').classList.add('open')
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('open')
  deleteTargetId = null
  deleteTargetImage = null
}

document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal)

document.getElementById('deleteModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeDeleteModal()
})

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!deleteTargetId) return

  const btn = document.getElementById('confirmDeleteBtn')
  btn.disabled = true
  btn.textContent = 'Deleting...'

  try {
    // Delete image from storage if exists
    if (deleteTargetImage) {
      await deleteProductImage(deleteTargetImage).catch(() => { })
    }

    await deleteProduct(deleteTargetId)

    // Remove from local array and re-render
    allProducts = allProducts.filter(p => p.id !== deleteTargetId)
    renderProducts(allProducts)
    updateSubtitle(allProducts.length)
    closeDeleteModal()
    showToast('Product deleted')

  } catch (err) {
    showToast('Failed to delete product', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = 'Delete'
  }
})
