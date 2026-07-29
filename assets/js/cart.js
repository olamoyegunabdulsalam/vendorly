// cart.js — Cart logic using localStorage
// Cart is always per vendor — stored as 'vendorly_cart'
// Cleared after WhatsApp order is sent

const CART_KEY = 'vendorly_cart'

// Get Cart
export function getCart() {
  const raw = localStorage.getItem(CART_KEY)
  return raw ? JSON.parse(raw) : []
}

// Save Cart
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

// Add Item to Cart
// If same product + same color + same size exists → increase qty
export function addToCart(product, selectedColor = null, selectedSize = null) {
  const cart = getCart()

  const existing = cart.find(
    (item) =>
      item.id === product.id &&
      item.selectedColor === selectedColor &&
      item.selectedSize === selectedSize
  )

  if (existing) {
    existing.qty += 1
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      selectedColor,
      selectedSize,
      qty: 1,
    })
  }

  saveCart(cart)
  return cart
}

// Remove Item from Cart
export function removeFromCart(productId, selectedColor, selectedSize) {
  const cart = getCart().filter(
    (item) =>
      !(
        item.id === productId &&
        item.selectedColor === selectedColor &&
        item.selectedSize === selectedSize
      )
  )
  saveCart(cart)
  return cart
}

// Update Item Quantity
export function updateQty(productId, selectedColor, selectedSize, qty) {
  const cart = getCart()
  const item = cart.find(
    (i) =>
      i.id === productId &&
      i.selectedColor === selectedColor &&
      i.selectedSize === selectedSize
  )
  if (item) {
    item.qty = qty
    if (item.qty <= 0) return removeFromCart(productId, selectedColor, selectedSize)
  }
  saveCart(cart)
  return cart
}

// Get Cart Count
export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0)
}

// Get Cart Total
export function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0)
}

// Clear Cart
// Called after WhatsApp order is sent
export function clearCart() {
  localStorage.removeItem(CART_KEY)
}

// Build WhatsApp Order Message
// Returns pre-filled message string for WhatsApp redirect
export function buildWhatsAppMessage(cart, storeUrl) {
  const lines = cart.map((item) => {
    const variation = [item.selectedColor, item.selectedSize]
      .filter(Boolean)
      .join(', ')
    const variationText = variation ? ` — ${variation}` : ''
    return `• ${item.name}${variationText} x${item.qty} — ₦${(item.price * item.qty).toLocaleString()}`
  })

  const total = getCartTotal()

  const message = [
    '🛍️ New Order from Vendorly',
    '',
    ...lines,
    '',
    `Total: ₦${total.toLocaleString()}`,
    '',
    `Sent via ${storeUrl}`,
  ].join('\n')

  return encodeURIComponent(message)
}

// Send Order via WhatsApp
// Opens WhatsApp with pre-filled order, then clears cart
export function sendWhatsAppOrder(whatsappNumber, cart, storeUrl) {
  const message = buildWhatsAppMessage(cart, storeUrl)
  const phone = whatsappNumber.replace(/[^0-9]/g, '') // strip non-digits
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  clearCart()
}
