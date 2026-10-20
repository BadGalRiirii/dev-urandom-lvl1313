import { createClient } from '@supabase/supabase-js'

// Set in .env (local) and the committed .env.production (deploys). Named apart
// from the old VITE_SUPABASE_URL/ANON_KEY so stale values in Vercel can't override them.
const supabaseUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const publicUrl = (bucket, path) =>
  supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl

// ── Direct reads — no backend required ───────────────

export const fetchBooks = async () => {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const fetchBook = async (id) => {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return { ...data, signed_url: publicUrl('books', data.file_path) }
}

export const fetchTracks = async () => {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(t => ({ ...t, url: t.file_path ? publicUrl('music', t.file_path) : '' }))
}

export const fetchPosts = async () => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const fetchPost = async (id) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .single()
  if (error) throw error
  return data
}
