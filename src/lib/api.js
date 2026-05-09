const BASE = ''

const authHeaders = () => {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const req = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── Books ────────────────────────────────────────────
export const getBooks = () => req('/api/books')
export const getBook = (id) => req(`/api/books/${id}`)
export const uploadBook = async (formData) => {
  const r = await fetch(`${BASE}/api/upload/book`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || 'Upload failed')
  }
  return r.json()
}
export const deleteBook = (id) => req(`/api/books/${id}`, { method: 'DELETE' })

// ── Tracks ───────────────────────────────────────────
export const getTracks = () => req('/api/tracks')
export const uploadTrack = async (formData) => {
  const r = await fetch(`${BASE}/api/upload/track`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || 'Upload failed')
  }
  return r.json()
}
export const deleteTrack = (id) => req(`/api/tracks/${id}`, { method: 'DELETE' })

// ── Posts ────────────────────────────────────────────
export const getPosts = () => req('/api/posts')
export const getAllPosts = () => req('/api/admin/posts')
export const getPost = (id) => req(`/api/posts/${id}`)
export const createPost = (data) => req('/api/posts', { method: 'POST', body: JSON.stringify(data) })
export const updatePost = (id, data) => req(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deletePost = (id) => req(`/api/posts/${id}`, { method: 'DELETE' })

// ── Auth ─────────────────────────────────────────────
export const adminLogin = (password) =>
  req('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) })

// ── Epub ─────────────────────────────────────────────
export const parseEpub = (id) => req(`/api/epub/parse/${id}`)
