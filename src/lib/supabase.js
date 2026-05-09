import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getSignedUrl = async (bucket, path) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
