// store.js Vendor store CRUD functions
// One store per vendor uses upsert with onConflict: vendor_id


import { supabase } from './supabase.js'

// Fetch Store by Vendor ID 
// Uses maybeSingle() returns null if no store exists yet (no error)
export async function fetchStore(vendorId) {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (error) throw error
  return data // null if vendor hasn't set up store yet
}

// Fetch Store by Store ID (for customer store page)─
// Customer visits store page we fetch by store UUID not vendor ID
export async function fetchStoreById(storeId) {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .maybeSingle()

  if (error) throw error
  return data
}

// Save Store (Create or Update)─
// Upserts on vendor_id one store per vendor
// Returns the real store row including DB-generated id
export async function saveStore(vendorId, storeData) {
  const { data, error } = await supabase
    .from('stores')
    .upsert(
      { vendor_id: vendorId, ...storeData, updated_at: new Date().toISOString() },
      { onConflict: 'vendor_id' }
    )
    .select()
    .single() // get real DB id back fixes the demo-store link bug

  if (error) throw error
  return data
}

// Upload Store Logo
// File path: store-logos/{userId}/logo.{ext}
export async function uploadStoreLogo(userId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('store-logos')
    .upload(path, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('store-logos').getPublicUrl(path)
  return data.publicUrl
}
