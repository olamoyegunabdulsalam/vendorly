// reviews.js — Reviews fetch and submit
// approved = false by default — admin must approve first
// Approved reviews show on landing page

import { supabase } from './supabase.js'

// Fetch Approved Reviews (for landing page)
// Only returns reviews where approved = true
export async function fetchApprovedReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Submit a Review (vendor submitting about Vendorly)
// approved is false by default — sits in queue until admin approves
export async function submitReview(vendorId, reviewData) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      vendor_id: vendorId,
      ...reviewData,
      approved: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Fetch All Reviews for Admi
// Returns ALL reviews (approved + pending) for admin dashboard
// Only works if called with service role key or admin user
export async function fetchAllReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Approve a Revie
// Admin only — toggles approved to true
export async function approveReview(reviewId) {
  const { error } = await supabase
    .from('reviews')
    .update({ approved: true })
    .eq('id', reviewId)

  if (error) throw error
}

// Delete a Revie─
// Admin only — removes spam or inappropriate reviews
export async function deleteReview(reviewId) {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)

  if (error) throw error
}
