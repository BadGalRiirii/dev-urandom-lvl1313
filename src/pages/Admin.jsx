import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLogin from '../components/admin/AdminLogin'
import PostEditor from '../components/blog/PostEditor'
import cd1  from '../assets/cds/cd1.jpg'
import cd2  from '../assets/cds/cd2.jpg'
import cd3  from '../assets/cds/cd3.jpg'
import cd4  from '../assets/cds/cd4.jpg'
import cd5  from '../assets/cds/cd5.jpg'
import cd6  from '../assets/cds/cd6.jpg'
import cd7  from '../assets/cds/cd7.jpg'
import cd8  from '../assets/cds/cd8.jpg'
import cd9  from '../assets/cds/cd9.jpg'
import cd10 from '../assets/cds/cd10.jpg'
import cd11 from '../assets/cds/cd11.jpg'
import cd12 from '../assets/cds/cd12.jpg'
import cd13 from '../assets/cds/cd13.jpg'
import {
  getAllPosts, getPosts, createPost, updatePost, deletePost,
  getBooks, uploadBook, deleteBook,
  getTracks, uploadTrack, deleteTrack,
  uploadPostImage,
} from '../lib/api'
import './Admin.css'

const CD_COVERS = [cd1, cd2, cd3, cd4, cd5, cd6, cd7, cd8, cd9, cd10, cd11, cd12, cd13]

// ── CD Image Picker ───────────────────────────────────────────────────────────
function CdImagePicker({ value, onChange }) {
  return (
    <div className="cd-image-picker">
      <span className="mono cd-picker-label">CD Cover</span>
      <div className="cd-picker-grid">
        {CD_COVERS.map((img, i) => {
          const num = i + 1
          return (
            <button
              key={num}
              type="button"
              className={`cd-picker-item${value === num ? ' cd-picker-item--on' : ''}`}
              onClick={() => onChange(num)}
              title={`cd${num}`}
            >
              <img src={img} alt={`cd${num}`} />
              <span className="mono">{num}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Drag & Drop Upload Zone ───────────────────────────────────────────────────
function DropZone({ accept, acceptLabel, file, onFile }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef()

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setOver(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  return (
    <div
      className={`dropzone ${over ? 'dropzone--over' : ''} ${file ? 'dropzone--filled' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => onFile(e.target.files[0])}
      />
      {file ? (
        <div className="dropzone-filled">
          <span className="dropzone-icon">✓</span>
          <span className="dropzone-name">{file.name}</span>
          <span className="dropzone-size mono">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
        </div>
      ) : (
        <div className="dropzone-empty">
          <span className="dropzone-icon">↑</span>
          <span>Drop {acceptLabel} here or <u>click to browse</u></span>
        </div>
      )}
    </div>
  )
}

// ── Upload Form (books or tracks) ─────────────────────────────────────────────
function UploadForm({ type, accept, acceptLabel, onUpload }) {
  const [file, setFile] = useState(null)
  const [meta, setMeta] = useState({ title: '', author: '', artist: '', cd_image: 1 })
  const [status, setStatus] = useState('idle') // 'idle' | 'uploading' | 'done' | 'error'
  const [uploadPct, setUploadPct] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const timerRef = useRef(null)

  const reset = () => {
    setFile(null)
    setMeta({ title: '', author: '', artist: '', cd_image: 1 })
    setStatus('idle')
    setUploadPct(0)
    setErrorMsg('')
  }

  const startFakeProgress = () => {
    let pct = 0
    timerRef.current = setInterval(() => {
      pct = Math.min(pct + Math.random() * 10 + 3, 88)
      setUploadPct(Math.round(pct))
      if (pct >= 88) clearInterval(timerRef.current)
    }, 160)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  const submit = async (e) => {
    e.preventDefault()
    if (!file || !meta.title) return
    clearInterval(timerRef.current)
    setStatus('uploading')
    setUploadPct(0)
    startFakeProgress()
    try {
      const fd = new FormData()
      fd.append('file', file)
      Object.entries(meta).forEach(([k, v]) => v && fd.append(k, String(v)))
      await onUpload(fd)
      clearInterval(timerRef.current)
      setUploadPct(100)
      setStatus('done')
      setTimeout(reset, 1800)
    } catch (err) {
      clearInterval(timerRef.current)
      setErrorMsg(err.message)
      setStatus('error')
      setUploadPct(0)
    }
  }

  const uploading = status === 'uploading'

  return (
    <form className="upload-form" onSubmit={submit}>
      <DropZone accept={accept} acceptLabel={acceptLabel} file={file} onFile={setFile} />
      <div className="upload-meta-row">
        <input
          placeholder="Title *"
          value={meta.title}
          onChange={(e) => setMeta(m => ({ ...m, title: e.target.value }))}
          required
        />
        {type === 'book' && (
          <input
            placeholder="Author"
            value={meta.author}
            onChange={(e) => setMeta(m => ({ ...m, author: e.target.value }))}
          />
        )}
        {type === 'track' && (
          <input
            placeholder="Artist"
            value={meta.artist}
            onChange={(e) => setMeta(m => ({ ...m, artist: e.target.value }))}
          />
        )}
      </div>
      {type === 'track' && (
        <CdImagePicker
          value={meta.cd_image}
          onChange={(n) => setMeta(m => ({ ...m, cd_image: n }))}
        />
      )}
      {status !== 'idle' && (
        <div className="upload-progress-wrap">
          <div className="upload-pbar">
            <motion.div
              className={`upload-pbar-fill${status === 'done' ? ' upload-pbar-fill--done' : ''}${status === 'error' ? ' upload-pbar-fill--err' : ''}`}
              animate={{ width: `${uploadPct}%` }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            />
          </div>
          <span className={`upload-pbar-label mono${status === 'error' ? ' upload-pbar-label--err' : ''}`}>
            {status === 'uploading' && `Uploading… ${uploadPct}%`}
            {status === 'done' && '✓ Upload complete'}
            {status === 'error' && errorMsg}
          </span>
        </div>
      )}

      <div className="upload-actions">
        <button
          type="submit"
          className={`btn btn-yellow${uploading ? ' btn-uploading' : ''}`}
          disabled={uploading || status === 'done' || !file || !meta.title}
        >
          {uploading ? `Uploading… ${uploadPct}%` : status === 'done' ? '✓ Done' : 'Upload'}
        </button>
      </div>
    </form>
  )
}

// ── Books Tab ─────────────────────────────────────────────────────────────────
function BooksTab() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => getBooks().then(setBooks).catch(() => {}).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleUpload = async (fd) => {
    await uploadBook(fd)
    load()
  }

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    await deleteBook(id)
    setBooks(b => b.filter(x => x.id !== id))
  }

  return (
    <div className="tab-content">
      <div className="admin-section">
        <div className="admin-section-title mono">// Upload Book</div>
        <UploadForm type="book" accept=".pdf,.epub" acceptLabel="PDF or EPUB" onUpload={handleUpload} />
      </div>

      <div className="admin-section">
        <div className="admin-section-title mono">// Library ({books.length})</div>
        {loading ? (
          <div className="admin-empty mono">Loading…</div>
        ) : books.length === 0 ? (
          <div className="admin-empty mono">No books yet.</div>
        ) : (
          <div className="content-list">
            {books.map((b) => (
              <div key={b.id} className="content-row">
                <span className="content-swatch" style={{ background: b.cover_color || '#00ff41' }} />
                <div className="content-info">
                  <span className="content-title">{b.title}</span>
                  {b.author && <span className="content-meta mono">{b.author}</span>}
                </div>
                <span className={`type-badge mono type-badge--${b.file_type}`}>{b.file_type}</span>
                <button className="btn btn-red btn-sm" onClick={() => handleDelete(b.id, b.title)}>Del</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Music Tab ─────────────────────────────────────────────────────────────────
function MusicTab({ onPlay }) {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => getTracks().then(setTracks).catch(() => {}).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleUpload = async (fd) => {
    await uploadTrack(fd)
    load()
  }

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    await deleteTrack(id)
    setTracks(t => t.filter(x => x.id !== id))
  }

  return (
    <div className="tab-content">
      <div className="admin-section">
        <div className="admin-section-title mono">// Upload Track</div>
        <UploadForm type="track" accept=".mp3,.wav,.ogg" acceptLabel="MP3, WAV, or OGG" onUpload={handleUpload} />
      </div>

      <div className="admin-section">
        <div className="admin-section-title mono">// Tracks ({tracks.length})</div>
        {loading ? (
          <div className="admin-empty mono">Loading…</div>
        ) : tracks.length === 0 ? (
          <div className="admin-empty mono">No tracks yet.</div>
        ) : (
          <div className="content-list">
            {tracks.map((t) => (
              <div key={t.id} className="content-row">
                <span className="content-swatch" style={{ background: t.cover_color?.startsWith('cd:') ? 'rgba(209,96,31,0.55)' : (t.cover_color || '#e6b400') }} />
                <div className="content-info">
                  <span className="content-title">{t.title}</span>
                  {t.artist && <span className="content-meta mono">{t.artist}</span>}
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => onPlay(t)}
                  title="Preview"
                >▶</button>
                <button className="btn btn-red btn-sm" onClick={() => handleDelete(t.id, t.title)}>Del</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Post Image Uploader ───────────────────────────────────────────────────────
function PostImageUploader({ current, onChange }) {
  const inputRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  const handleFile = async (file) => {
    if (!file) return
    setErr('')
    setUploading(true)
    try {
      const { url } = await uploadPostImage(file)
      onChange(url)
    } catch (e) {
      setErr(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="post-image-uploader">
      <span className="mono admin-section-title" style={{ fontSize: '0.65rem' }}>// Cover Image (optional)</span>
      <div className="post-image-row">
        {current && (
          <div className="post-image-preview">
            <img src={current} alt="cover" />
            <button type="button" className="post-image-remove" onClick={() => onChange('')}>×</button>
          </div>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ alignSelf: 'flex-start' }}
        >
          {uploading ? 'Uploading…' : current ? 'Change image' : '↑ Upload image'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {current && !uploading && (
          <input
            value={current}
            readOnly
            placeholder="Image URL"
            style={{ flex: 1, fontSize: '0.7rem' }}
          />
        )}
      </div>
      {err && <span className="mono" style={{ color: 'var(--red)', fontSize: '0.7rem' }}>{err}</span>}
    </div>
  )
}

// ── Post Manager ──────────────────────────────────────────────────────────────
function PostsTab() {
  const [posts, setPosts] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', category: 'book', related_title: '', rating: 5, published: true, cover_image: '' })
  const [saving, setSaving] = useState(false)
  const formRef = useRef()

  useEffect(() => { getAllPosts().then(setPosts).catch(() => {}) }, [])

  const resetForm = () => {
    setEditing(null)
    setForm({ title: '', content: '', category: 'book', related_title: '', rating: 5, published: true, cover_image: '' })
  }

  const loadPost = (post) => {
    setEditing(post.id)
    setForm({ title: post.title, content: post.content, category: post.category, related_title: post.related_title || '', rating: post.rating || 5, published: post.published, cover_image: post.cover_image || '' })
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editing) await updatePost(editing, form)
      else await createPost(form)
      setPosts(await getAllPosts())
      resetForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this post?')) return
    await deletePost(id)
    setPosts(p => p.filter(x => x.id !== id))
  }

  const togglePublish = async (post) => {
    await updatePost(post.id, { ...post, published: !post.published })
    setPosts(p => p.map(x => x.id === post.id ? { ...x, published: !x.published } : x))
  }

  return (
    <div className="tab-content">
      <div className="admin-section" ref={formRef}>
        <div className="admin-section-title mono">{editing ? '// Editing Post' : '// New Post'}</div>
        <div className="post-form">
          <input placeholder="Title *" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
          <div className="post-form-row">
            <select value={['book','film','series','personal'].includes(form.category) ? form.category : 'custom'}
              onChange={(e) => {
                if (e.target.value !== 'custom') setForm(f => ({ ...f, category: e.target.value }))
              }}>
              <option value="book">Book</option>
              <option value="film">Film</option>
              <option value="series">Series</option>
              <option value="personal">Personal</option>
              <option value="custom">Custom…</option>
            </select>
            {!['book','film','series','personal'].includes(form.category) && (
              <input
                placeholder="Category name"
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ maxWidth: 160 }}
              />
            )}
            <input
              placeholder="Related title"
              value={form.related_title}
              onChange={(e) => setForm(f => ({ ...f, related_title: e.target.value }))}
            />
            <input
              type="number" min="1" max="5" placeholder="Rating /5"
              value={form.rating}
              onChange={(e) => setForm(f => ({ ...f, rating: Number(e.target.value) }))}
              style={{ width: 90 }}
            />
          </div>
          <PostEditor value={form.content} onChange={(html) => setForm(f => ({ ...f, content: html }))} />

          {/* Cover image upload */}
          <PostImageUploader
            current={form.cover_image}
            onChange={(url) => setForm(f => ({ ...f, cover_image: url }))}
          />

          <div className="post-form-actions">
            <label className="post-published-toggle">
              <input type="checkbox" checked={form.published}
                onChange={(e) => setForm(f => ({ ...f, published: e.target.checked }))} />
              <span className="mono">Published</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {editing && <button className="btn" onClick={resetForm}>Cancel</button>}
              <button className="btn btn-yellow" onClick={save} disabled={saving || !form.title}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <div className="admin-section-title mono">// All Posts ({posts.length})</div>
        {posts.length === 0 ? (
          <div className="admin-empty mono">No posts yet.</div>
        ) : (
          <div className="content-list">
            {posts.map((post) => (
              <div key={post.id} className="content-row">
                <div className="content-info">
                  <span className="content-title">{post.title}</span>
                  <span className="content-meta mono">{post.category}{post.related_title ? ` · ${post.related_title}` : ''}</span>
                </div>
                <button
                  className={`pill pill-sm ${post.published ? 'pill-published' : 'pill-draft'}`}
                  onClick={() => togglePublish(post)}
                  title="Toggle publish"
                >
                  {post.published ? 'live' : 'draft'}
                </button>
                <button className="btn btn-sm" onClick={() => loadPost(post)}>Edit</button>
                <button className="btn btn-red btn-sm" onClick={() => remove(post.id)}>Del</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ onSwitchTab }) {
  const [stats, setStats] = useState({ books: 0, tracks: 0, posts: 0, drafts: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([getBooks(), getTracks(), getAllPosts()]).then(([b, t, p]) => {
      const books = b.value || []
      const tracks = t.value || []
      const posts = p.value || []
      setStats({
        books: books.length,
        tracks: tracks.length,
        posts: posts.filter(x => x.published).length,
        drafts: posts.filter(x => !x.published).length,
      })
      const items = [
        ...books.map(x => ({ ...x, _type: 'book' })),
        ...tracks.map(x => ({ ...x, _type: 'track' })),
        ...posts.map(x => ({ ...x, _type: 'post' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)
      setRecent(items)
      setLoading(false)
    })
  }, [])

  const STAT_CARDS = [
    { label: 'Books', value: stats.books, tab: 'books', color: 'var(--yellow)' },
    { label: 'Tracks', value: stats.tracks, tab: 'music', color: 'var(--red)' },
    { label: 'Posts', value: stats.posts, tab: 'posts', color: 'var(--cream)' },
    { label: 'Drafts', value: stats.drafts, tab: 'posts', color: 'var(--muted)' },
  ]

  return (
    <div className="tab-content">
      <div className="stat-grid">
        {STAT_CARDS.map((s) => (
          <button key={s.label} className="stat-card" onClick={() => onSwitchTab(s.tab)}>
            <span className="stat-value" style={{ color: s.color }}>{loading ? '—' : s.value}</span>
            <span className="stat-label mono">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-section">
        <div className="admin-section-title mono">// Recent uploads</div>
        {loading ? (
          <div className="admin-empty mono">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="admin-empty mono">Nothing uploaded yet.</div>
        ) : (
          <div className="content-list">
            {recent.map((item) => (
              <div key={item.id} className="content-row">
                <span className={`type-badge mono type-badge--${item._type}`}>{item._type}</span>
                <div className="content-info">
                  <span className="content-title">{item.title}</span>
                  {(item.author || item.artist) && (
                    <span className="content-meta mono">{item.author || item.artist}</span>
                  )}
                </div>
                <span className="content-meta mono" style={{ flexShrink: 0 }}>
                  {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
const TABS = ['dashboard', 'posts', 'books', 'music']

export default function Admin() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('admin_token'))
  const [tab, setTab] = useState('dashboard')
  const [previewTrack, setPreviewTrack] = useState(null)
  const audioRef = useRef()

  // Auto-logout when a 401 clears the token from any API call
  useEffect(() => {
    const handleExpiry = () => {
      localStorage.removeItem('admin_token')
      setAuthed(false)
    }
    window.addEventListener('admin:session-expired', handleExpiry)
    return () => window.removeEventListener('admin:session-expired', handleExpiry)
  }, [])

  useEffect(() => {
    if (!previewTrack || !audioRef.current) return
    audioRef.current.src = previewTrack.url
    audioRef.current.play()
  }, [previewTrack])

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />

  return (
    <div className="admin-page page">
      {/* hidden audio for track preview */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      <div className="admin-header">
        <div>
          <div className="mono admin-eyebrow">// /admin</div>
          <h1 className="display admin-title">The Studio</h1>
        </div>
        <button className="btn" onClick={() => { localStorage.removeItem('admin_token'); setAuthed(false) }}>
          Sign out
        </button>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t} className={`pill ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'dashboard' && <Dashboard onSwitchTab={setTab} />}
          {tab === 'posts' && <PostsTab />}
          {tab === 'books' && <BooksTab />}
          {tab === 'music' && <MusicTab onPlay={setPreviewTrack} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
