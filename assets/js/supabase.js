// supabase.js — Supabase client initialization
// Import this file in every other JS file that needs Supabase

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://dkvhlfigmyzekmnwzhil.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdmhsZmlnbXl6ZWttbnd6aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNTAwMTcsImV4cCI6MjEwMDkyNjAxN30.rN9aaVhgRnul9HHVxTaCiPElWO4Qjbo6v2uyYktdoXY' // ← replace this

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Auto create profile for Google OAuth users ──
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        const user = session.user

        // Only create profile for OAuth users (Google)
        if (user.app_metadata?.provider === 'google') {
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle()

            if (!existing) {
                await supabase.from('profiles').insert({
                    id: user.id,
                    full_name: user.user_metadata?.full_name ||
                        user.user_metadata?.name ||
                        user.email?.split('@')[ 0 ] || 'Vendor'
                })
            }
        }
    }
})