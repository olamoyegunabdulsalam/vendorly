import { requireAuth } from './auth.js'
import { supabase } from './supabase.js'  
import { renderBottomNav } from '../components/bottomNav.js'

const user = await requireAuth()

renderBottomNav('settings') 