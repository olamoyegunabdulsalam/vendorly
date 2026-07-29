// supabase.js — Supabase client initialization
// Import this file in every other JS file that needs Supabase

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://dkvhlfigmyzekmnwzhil.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdmhsZmlnbXl6ZWttbnd6aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNTAwMTcsImV4cCI6MjEwMDkyNjAxN30.rN9aaVhgRnul9HHVxTaCiPElWO4Qjbo6v2uyYktdoXY' // ← replace this

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
