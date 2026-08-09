
import { requireAuth } from './auth.js'
import { fetchStore } from './store.js'
import { fetchProducts, addProduct, updateProduct, uploadProductImage } from './products.js'
import { showToast, parseTags, tagsToString } from './utils.js'

//  Init ─
const user  = await requireAuth()
const store = await fetchStore(user.id)

// Check if editing existing product
const params    = new URLSearchParams(window.location.search)
const productId = params.get('id')
const isEditing = Boolean(productId)

// Update page title
if (isEditing) {
  document.getElementById('pageTitle').textContent    = 'Edit Product'
  document.getElementById('pageSubtitle').textContent = 'Update your product details'
  document.getElementById('deleteProductBtn').style.display = 'block'
  document.getElementById('saveProductBtn').textContent = 'Save Changes'
}

//  Load Existing Product (edit mode) ─
let existingProduct = null
let imageFile       = null
let colorTags       = []
let sizeTags        = []

if (isEditing) {
  try {
    const products = await fetchProducts(user.id)
    existingProduct = products.find(p => p.id === productId)

    if (!existingProduct) {
      showToast('Product not found', 'error')
      setTimeout(() => window.location.href = 'products.html', 1500)
    } else {
      // Populate form
      document.getElementById('productName').value        = existingProduct.name        || ''
      document.getElementById('productPrice').value       = existingProduct.price       || ''
      document.getElementById('productDescription').value = existingProduct.description || ''
      updateDescCount()

      // Show existing image
      if (existingProduct.image_url) {
        const preview = document.getElementById('imagePreview')
        preview.src = existingProduct.image_url
        preview.style.display = 'block'
        document.getElementById('imagePlaceholder').style.display = 'none'
        document.getElementById('changeImageBtn').style.display = 'block'
      }

      // Populate color tags
      if (existingProduct.colors) {
        colorTags = parseTags(existingProduct.colors)
        renderTags('colors')
      }

      // Populate size tags
      if (existingProduct.sizes) {
        sizeTags = parseTags(existingProduct.sizes)
        renderTags('sizes')
      }
    }
  } catch (err) {
    showToast('Failed to load product', 'error')
    console.error(err)
  }
}

//  Image Upload 
document.getElementById('imageFile').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (!file) return

  // Validate size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image must be under 5MB', 'error')
    return
  }

  imageFile = file
  const preview = document.getElementById('imagePreview')
  preview.src = URL.createObjectURL(file)
  preview.style.display = 'block'
  document.getElementById('imagePlaceholder').style.display = 'none'
  document.getElementById('changeImageBtn').style.display = 'block'
})

document.getElementById('changeImageBtn').addEventListener('click', () => {
  document.getElementById('imageFile').click()
})

//  Description Character Count ─
function updateDescCount() {
  const val = document.getElementById('productDescription').value.length
  document.getElementById('descCount').textContent = `${val} / 500`
}

document.getElementById('productDescription').addEventListener('input', updateDescCount)

//  Tag Input — Colors 
setupTagInput('colorsInput', 'colorsList', colorTags, 'colors')
setupTagInput('sizesInput',  'sizesList',  sizeTags,  'sizes')

function setupTagInput(inputId, listId, tagsArray, type) {
  const input = document.getElementById(inputId)

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input.value, tagsArray, type)
      input.value = ''
    }
    // Delete last tag on backspace if input is empty
    if (e.key === 'Backspace' && input.value === '' && tagsArray.length > 0) {
      tagsArray.pop()
      renderTags(type)
    }
  })

  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      addTag(input.value, tagsArray, type)
      input.value = ''
    }
  })

  // Click wrap to focus input
  const wrap = document.getElementById(type === 'colors' ? 'colorsWrap' : 'sizesWrap')
  wrap.addEventListener('click', () => input.focus())
}

function addTag(value, tagsArray, type) {
  const trimmed = value.replace(',', '').trim()
  if (!trimmed) return
  if (tagsArray.includes(trimmed)) return // no duplicates
  tagsArray.push(trimmed)
  renderTags(type)
}

function renderTags(type) {
  const isColors  = type === 'colors'
  const tagsArray = isColors ? colorTags : sizeTags
  const listEl    = document.getElementById(isColors ? 'colorsList' : 'sizesList')

  listEl.innerHTML = tagsArray.map((tag, index) => `
    <div class="tag-pill">
      <span>${tag}</span>
      <button class="tag-pill-remove" data-index="${index}" data-type="${type}" aria-label="Remove ${tag}">×</button>
    </div>
  `).join('')

  // Remove tag buttons
  listEl.querySelectorAll('.tag-pill-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const idx  = parseInt(btn.dataset.index)
      const type = btn.dataset.type
      if (type === 'colors') colorTags.splice(idx, 1)
      else                   sizeTags.splice(idx, 1)
      renderTags(type)
    })
  })
}

//  Save Product 
document.getElementById('saveProductBtn').addEventListener('click', async () => {
  const name        = document.getElementById('productName').value.trim()
  const priceRaw    = document.getElementById('productPrice').value.trim()
  const description = document.getElementById('productDescription').value.trim()

  const nameError  = document.getElementById('nameError')
  const priceError = document.getElementById('priceError')

  // Reset errors
  nameError.style.display  = 'none'
  priceError.style.display = 'none'
  document.getElementById('productName').classList.remove('error')
  document.getElementById('productPrice').classList.remove('error')

  let valid = true

  if (!name) {
    nameError.style.display = 'block'
    document.getElementById('productName').classList.add('error')
    valid = false
  }

  const price = parseInt(priceRaw.replace(/[^0-9]/g, ''))
  if (!price || price <= 0) {
    priceError.style.display = 'block'
    document.getElementById('productPrice').classList.add('error')
    valid = false
  }

  if (!valid) return

  const btn = document.getElementById('saveProductBtn')
  btn.disabled = true
  btn.innerHTML = '<div class="spinner"></div>'

  try {
    // Upload image if new one selected
    let imageUrl = existingProduct?.image_url || null
    if (imageFile) {
      imageUrl = await uploadProductImage(user.id, imageFile)
    }

    const productData = {
      name,
      price,
      description,
      image_url: imageUrl,
      colors: tagsToString(colorTags) || null,
      sizes:  tagsToString(sizeTags)  || null,
    }

    if (isEditing) {
      await updateProduct(productId, productData)
      showToast('Product updated ✓')
    } else {
      await addProduct(user.id, productData)
      showToast('Product added ✓')
    }

    setTimeout(() => {
      window.location.href = 'products.html'
    }, 800)

  } catch (err) {
    showToast(err.message || 'Failed to save product', 'error')
    btn.disabled = false
    btn.textContent = isEditing ? 'Save Changes' : 'Save Product'
  }
})

//  Delete Product (from edit page) 
document.getElementById('deleteProductBtn').addEventListener('click', () => {
  // Navigate back to products page with delete intent
  // Products page handles the actual deletion with confirmation modal
  window.location.href = `products.html?delete=${productId}`
})
