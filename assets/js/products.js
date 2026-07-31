import { requireAuth } from './auth.js'
import { supabase } from './supabase.js'
import { renderBottomNav } from '../components/bottomNav.js'

const user = await requireAuth()

renderBottomNav('products')

// Fetch All Products for a Vendor
export async function fetchProducts(vendorId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Add Product
export async function addProduct(vendorId, productData) {
  const { data, error } = await supabase
    .from('products')
    .insert({ vendor_id: vendorId, ...productData })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update Product
export async function updateProduct(productId, productData) {
  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', productId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete Product
export async function deleteProduct(productId) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) throw error
}

// Upload Product Image
// File path: product-images/{userId}/{timestamp}.{ext}
export async function uploadProductImage(userId, file) {
  const ext = file.name.split('.').pop()
  const timestamp = Date.now()
  const path = `${userId}/${timestamp}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}

// Delete Product Image by URL
export async function deleteProductImage(imageUrl) {
  // Extract the file path from the public URL
  const path = imageUrl.split('/product-images/')[1]
  if (!path) return

  const { error } = await supabase.storage
    .from('product-images')
    .remove([path])

  if (error) throw error
}
