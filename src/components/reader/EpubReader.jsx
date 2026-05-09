import { useEffect, useRef, useState, useCallback } from 'react'
import './EpubReader.css'

/* ─────────────────────────────────────────────────────
   Theme builder — only enforce colors, let epub CSS handle layout
───────────────────────────────────────────────────── */
const buildTheme = (themeStyle, fontSize) => ({
  body: {
    'background':    `${themeStyle.bg} !important`,
    'color':         `${themeStyle.text} !important`,
    'font-size':     `${fontSize}px`,
    'line-height':   '1.9',
    'padding-right': '5% !important',
  },
  img: { 'max-width': '100% !important', 'height': 'auto', 'display': 'block', 'margin': '1.5em auto' },
  a:   { 'color': themeStyle.accent || themeStyle.text },
})

const findLabel = (toc, href) => {
  if (!toc?.length || !href) return ''
  const base = href.split('#')[0].split('/').pop()
  for (const item of toc) {
    const iBase = (item.href || '').split('#')[0].split('/').pop()
    if (base && base === iBase) return item.label?.trim() || ''
    if (item.subitems?.length) {
      const hit = findLabel(item.subitems, href)
      if (hit) return hit
    }
  }
  return ''
}

/* ─────────────────────────────────────────────────────
   TOC row (recursive)
───────────────────────────────────────────────────── */
function TocRow({ item, current, onPick, depth }) {
  const label = item.label?.trim() || ''
  return (
    <>
      {label && (
        <button
          className={`toc-btn${label === current ? ' active' : ''}`}
          style={{ paddingLeft: `${18 + depth * 14}px` }}
          onClick={() => onPick(item.href)}
        >
          {label}
        </button>
      )}
      {item.subitems?.map((sub, i) => (
        <TocRow key={i} item={sub} current={current} onPick={onPick} depth={depth + 1} />
      ))}
    </>
  )
}

/* ─────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────── */
export default function EpubReader({ url, fontSize, themeStyle, onProgress }) {
  const containerRef = useRef(null)
  const bookRef      = useRef(null)
  const rendRef      = useRef(null)
  const cfiRef       = useRef(null)
  const animRef      = useRef(false)
  const modeRef      = useRef('scroll')

  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [progress,  setProgress]  = useState(0)
  const [atStart,   setAtStart]   = useState(true)
  const [atEnd,     setAtEnd]     = useState(false)
  const [mode,      setMode]      = useState('scroll')
  const [flipCls,   setFlipCls]   = useState('')
  const [chapter,   setChapter]   = useState('')
  const [bookTitle, setBookTitle] = useState('')
  const [toc,       setToc]       = useState([])
  const [tocOpen,   setTocOpen]   = useState(false)

  modeRef.current = mode

  /* ── Wire relocated event ─────────────────────────── */
  const wireEvents = useCallback((rend) => {
    rend.on('relocated', (loc) => {
      cfiRef.current = loc.start?.cfi ?? null
      setAtStart(loc.atStart ?? false)
      setAtEnd(loc.atEnd   ?? false)
      const pct = loc.start?.percentage ?? 0
      setProgress(pct)
      onProgress?.(pct)
      if (loc.start?.href && bookRef.current) {
        setChapter(findLabel(bookRef.current.navigation?.toc, loc.start.href))
      }
    })
  }, [onProgress])

  /* ── Keyboard shortcuts ───────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setTocOpen(false); return }
      if (modeRef.current === 'page') {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') flipPage('next')
        if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   flipPage('prev')
      } else {
        if (e.key === 'PageDown') rendRef.current?.next()
        if (e.key === 'PageUp')   rendRef.current?.prev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line

  /* ── Page-flip animation ──────────────────────────── */
  const flipPage = useCallback((dir) => {
    if (!rendRef.current || animRef.current) return
    animRef.current = true
    const exit  = dir === 'next' ? 'flip-exit-left'  : 'flip-exit-right'
    const enter = dir === 'next' ? 'flip-enter-right' : 'flip-enter-left'
    setFlipCls(exit)
    setTimeout(() => {
      dir === 'next' ? rendRef.current?.next() : rendRef.current?.prev()
      setFlipCls(enter)
      setTimeout(() => { setFlipCls(''); animRef.current = false }, 300)
    }, 220)
  }, [])

  /* ── Chapter jump ─────────────────────────────────── */
  const jumpTo = useCallback(async (href) => {
    if (!href || !rendRef.current || !bookRef.current) return
    setTocOpen(false)
    const rend = rendRef.current
    const book = bookRef.current
    // Strip #fragment — spine.get needs the bare path
    const path = href.split('#')[0]
    const item = book.spine.get(path)
    try {
      // Spine index is the most reliable navigation target in epubjs
      await rend.display(item ? item.index : href)
    } catch {
      try { await rend.display(href) } catch {}
    }
  }, [])

  /* ── Mode toggle ──────────────────────────────────── */
  const toggleMode = useCallback(async () => {
    const book = bookRef.current
    const el   = containerRef.current
    if (!book || !el) return

    const saved   = cfiRef.current
    const newMode = modeRef.current === 'scroll' ? 'page' : 'scroll'

    rendRef.current?.destroy()
    rendRef.current = null

    const rend = book.renderTo(el,
      newMode === 'scroll'
        ? { width: el.offsetWidth, height: el.offsetHeight, flow: 'scrolled', manager: 'continuous' }
        : { width: el.offsetWidth, height: el.offsetHeight, spread: 'none',   flow: 'paginated'     }
    )
    rendRef.current = rend
    rend.themes.default(buildTheme(themeStyle, fontSize))
    await rend.display(saved ?? undefined)
    wireEvents(rend)
    setMode(newMode)
  }, [themeStyle, fontSize, wireEvents])

  /* ── Load book ────────────────────────────────────── */
  useEffect(() => {
    if (!url) return
    let dead  = false
    let timer = null

    ;(async () => {
      setLoading(true)
      setError(null)
      setProgress(0)
      setChapter('')
      setBookTitle('')
      setToc([])
      setTocOpen(false)
      cfiRef.current  = null
      modeRef.current = 'scroll'
      setMode('scroll')

      try {
        const ePub = (await import('epubjs')).default
        if (dead) return

        bookRef.current?.destroy()
        bookRef.current = rendRef.current = null

        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = await res.arrayBuffer()
        if (dead) return

        const book = ePub(buf)
        bookRef.current = book

        const el = containerRef.current
        if (!el) return

        const rend = book.renderTo(el, {
          width: el.offsetWidth, height: el.offsetHeight,
          flow: 'scrolled', manager: 'continuous',
        })
        rendRef.current = rend
        rend.themes.default(buildTheme(themeStyle, fontSize))

        timer = setTimeout(() => { if (!dead) setLoading(false) }, 8000)
        rend.once('rendered', () => { clearTimeout(timer); if (!dead) setLoading(false) })

        await rend.display()
        wireEvents(rend)
        book.locations.generate(1024)

        // Load metadata (book title)
        book.loaded.metadata.then(() => {
          if (dead) return
          const meta = book.packaging?.metadata || book.package?.metadata
          if (meta?.title) setBookTitle(meta.title)
        }).catch(() => {})

        // Load TOC
        book.loaded.navigation.then(() => {
          if (!dead) setToc(book.navigation?.toc || [])
        }).catch(() => {})

      } catch (e) {
        if (!dead) { clearTimeout(timer); setError(e.message); setLoading(false) }
      }
    })()

    return () => {
      dead = true
      clearTimeout(timer)
      bookRef.current?.destroy()
      bookRef.current = rendRef.current = null
    }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { rendRef.current?.themes.fontSize(`${fontSize}px`) }, [fontSize])

  useEffect(() => {
    if (!rendRef.current) return
    rendRef.current.themes.override('color',      themeStyle.text)
    rendRef.current.themes.override('background', themeStyle.bg)
  }, [themeStyle])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => rendRef.current?.resize(el.offsetWidth, el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (error) return (
    <div className="epub-reader">
      <div className="epub-error mono">{error}</div>
    </div>
  )

  const isPaged   = mode === 'page'
  const goBack    = isPaged ? () => flipPage('prev') : () => rendRef.current?.prev()
  const goFwd     = isPaged ? () => flipPage('next') : () => rendRef.current?.next()
  const navLabel  = chapter || bookTitle || ''

  return (
    <div className="epub-reader">

      {/* ── TOC drawer ──────────────────────────────── */}
      {tocOpen && <div className="toc-backdrop" onClick={() => setTocOpen(false)} />}
      <aside className={`toc-panel${tocOpen ? ' open' : ''}`}>
        <div className="toc-head mono">Contents</div>
        <div className="toc-scroll">
          {toc.length
            ? toc.map((item, i) => (
                <TocRow key={i} item={item} current={chapter} onPick={jumpTo} depth={0} />
              ))
            : <div className="toc-empty mono">No chapters found</div>
          }
        </div>
      </aside>

      {/* ── Loading ─────────────────────────────────── */}
      {loading && (
        <div className="epub-loading">
          <div className="epub-spinner" />
          <span className="mono">Opening…</span>
        </div>
      )}

      {/* ── Navigation bar ──────────────────────────── */}
      <nav className="epub-nav">
        <button
          className={`nav-arrow${atStart ? ' dim' : ''}`}
          onClick={goBack}
          aria-label="Previous"
        >‹</button>

        <button
          className="nav-chapter"
          onClick={() => setTocOpen(o => !o)}
          aria-label="Table of contents"
          title="Open chapter list"
        >
          {navLabel
            ? <span className="nav-label mono">{navLabel}</span>
            : <span className="nav-dots">· · ·</span>
          }
          <span className="nav-caret">▾</span>
        </button>

        <button className="nav-mode mono" onClick={toggleMode}>
          {isPaged ? '≡ scroll' : '⊞ pages'}
        </button>

        <button
          className={`nav-arrow${atEnd ? ' dim' : ''}`}
          onClick={goFwd}
          aria-label="Next"
        >›</button>
      </nav>

      {/* ── Reading area ────────────────────────────── */}
      <div className="epub-stage">
        {/* Tap zones for page mode — invisible click areas on each side */}
        {isPaged && (
          <>
            <button
              className={`page-tap left${atStart ? ' hidden' : ''}`}
              onClick={goBack}
              aria-label="Previous page"
            />
            <button
              className={`page-tap right${atEnd ? ' hidden' : ''}`}
              onClick={goFwd}
              aria-label="Next page"
            />
          </>
        )}
        <div className={`epub-body${flipCls ? ` ${flipCls}` : ''}`} ref={containerRef} />
      </div>

      {/* ── Progress bar ────────────────────────────── */}
      <footer className="epub-foot">
        <div className="foot-track">
          <div className="foot-fill" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <span className="foot-pct mono">{Math.round(progress * 100)}%</span>
      </footer>

    </div>
  )
}
