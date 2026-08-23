import { supabase } from './supabase.js'
import { generateSlug, compressImage } from './utils.js'


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
    // Auto generate slug from store name if not already set
    const baseSlug = storeData.slug || generateSlug(storeData.store_name)
    const slug = await getUniqueSlug(baseSlug, vendorId)

    const { data, error } = await supabase
        .from('stores')
        .upsert(
            {
                vendor_id: vendorId,
                ...storeData,
                slug,  
                updated_at: new Date().toISOString()
            },
            { onConflict: 'vendor_id' }
        )
        .select()
        .single()

    if (error) throw error
    return data
}

export async function fetchStoreBySlug(slug) {
    const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

    if (error) throw error
    return data
}

// In store.js — handle slug conflicts
async function getUniqueSlug(baseslug, vendorId) {
    let slug = baseslug
    let count = 1

    while (true) {
        const { data } = await supabase
            .from('stores')
            .select('id, vendor_id')
            .eq('slug', slug)
            .maybeSingle()

        // No conflict or it belongs to this vendor
        if (!data || data.vendor_id === vendorId) return slug

        // Conflict — append number
        slug = `${baseslug}-${count}`
        count++
    }
}

// Upload Store Logo
// File path: store-logos/{userId}/logo.{ext}
export async function uploadStoreLogo(userId, file) {
    // Compress before uploading
    const compressed = await compressImage(file, 1, 0.85)

    const ext = 'jpg' // always jpg after compression
    const path = `${userId}/logo.${ext}`

    const { error } = await supabase.storage
        .from('store-logos')
        .upload(path, compressed, { upsert: true })

    if (error) throw error

    const { data } = supabase.storage.from('store-logos').getPublicUrl(path)
    return data.publicUrl
}

// Upload Store Banner
export async function uploadStoreBanner(userId, file) {
    const compressed = await compressImage(file, 2, 0.82)

    const ext = 'jpg'
    const path = `${userId}/banner.${ext}`

    const { error } = await supabase.storage
        .from('store-banners')
        .upload(path, compressed, { upsert: true })

    if (error) throw error

    const { data } = supabase.storage.from('store-banners').getPublicUrl(path)
    return data.publicUrl
}