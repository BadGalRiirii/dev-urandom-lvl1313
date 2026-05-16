const BASE = ''

const authHeaders = () => {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const req = async (path, opts = {}, timeout = 7000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...opts.headers },
      ...opts,
    })
    clearTimeout(timer)
    if (res.status === 401) {
      localStorage.removeItem('admin_token')
      window.dispatchEvent(new CustomEvent('admin:session-expired'))
      throw new Error('Session expired. Please log in again.')
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Request failed')
    }
    return res.json()
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

// ── Books ────────────────────────────────────────────
export const getBooks  = () => req('/api/books')
export const getBook   = (id) => req(`/api/books/${id}`)
export const uploadBook = async (formData) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120000)
  try {
    const r = await fetch(`${BASE}/api/upload/book`, {
      method: 'POST', signal: controller.signal,
      headers: authHeaders(), body: formData,
    })
    clearTimeout(timer)
    if (r.status === 401) {
      localStorage.removeItem('admin_token')
      window.dispatchEvent(new CustomEvent('admin:session-expired'))
      throw new Error('Session expired. Please log in again.')
    }
    if (!r.ok) { const e = await r.json().catch(() => ({ detail: r.statusText })); throw new Error(e.detail || 'Upload failed') }
    return r.json()
  } catch (e) { clearTimeout(timer); throw e }
}
export const deleteBook = (id) => req(`/api/books/${id}`, { method: 'DELETE' })

// ── Tracks ───────────────────────────────────────────
export const getTracks = () => req('/api/tracks')
export const uploadTrack = async (formData) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120000)
  try {
    const r = await fetch(`${BASE}/api/upload/track`, {
      method: 'POST', signal: controller.signal,
      headers: authHeaders(), body: formData,
    })
    clearTimeout(timer)
    if (r.status === 401) {
      localStorage.removeItem('admin_token')
      window.dispatchEvent(new CustomEvent('admin:session-expired'))
      throw new Error('Session expired. Please log in again.')
    }
    if (!r.ok) { const e = await r.json().catch(() => ({ detail: r.statusText })); throw new Error(e.detail || 'Upload failed') }
    return r.json()
  } catch (e) { clearTimeout(timer); throw e }
}
export const deleteTrack = (id) => req(`/api/tracks/${id}`, { method: 'DELETE' })

// ── Posts ────────────────────────────────────────────
export const getPosts    = () => req('/api/posts')
export const getAllPosts  = () => req('/api/admin/posts')
export const getPost     = (id) => req(`/api/posts/${id}`)
export const createPost  = (data) => req('/api/posts', { method: 'POST', body: JSON.stringify(data) })
export const updatePost  = (id, data) => req(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deletePost  = (id) => req(`/api/posts/${id}`, { method: 'DELETE' })

// ── Auth ─────────────────────────────────────────────
export const adminLogin = (password) =>
  req('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) })

// ── Post image upload ────────────────────────────────
export const uploadPostImage = async (file) => {
  const fd = new FormData()
  fd.append('file', file)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const r = await fetch('/api/upload/post-image', {
      method: 'POST',
      signal: controller.signal,
      headers: authHeaders(),
      body: fd,
    })
    clearTimeout(timer)
    if (r.status === 401) {
      localStorage.removeItem('admin_token')
      window.dispatchEvent(new CustomEvent('admin:session-expired'))
      throw new Error('Session expired. Please log in again.')
    }
    if (!r.ok) { const e = await r.json().catch(() => ({ detail: r.statusText })); throw new Error(e.detail || 'Upload failed') }
    return r.json()
  } catch (e) { clearTimeout(timer); throw e }
}

// ── Epub ─────────────────────────────────────────────
export const parseEpub = (id) => req(`/api/epub/parse/${id}`)
