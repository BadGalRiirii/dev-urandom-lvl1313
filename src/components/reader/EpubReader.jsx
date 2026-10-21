import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ReaderSettings from './ReaderSettings'
import { THEMES, FONT_CSS_URL, loadPrefs, savePrefs, buildBookCss } from './readerPrefs'
import './EpubReader.css'

const storageKey   = (id) => `riri_reader_${id}_cfi`
const bookmarksKey = (id) => `riri_reader_${id}_bm`
const locationsKey = (id) => `riri_reader_${id}_locs`

const BOOK_CSS_KEY   = 'riri-reader'
const CHROME_IDLE_MS = 2800   // desktop: bars fade after this long without the mouse moving
const TEXT_MAX       = 1.6    // × the reading size, for headings and title pages
const TEXT_BIG       = 1.3    // × the reading size: big enough that justifying it tears it apart

const canHover      = () => window.matchMedia('(hover: hover)').matches
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Some books set chapter headings and title pages so large that a phone screen holds
// three words, and justify them so the words fly apart. Keep any text to at most
// TEXT_MAX × the reading size (in rem, so it follows the size setting), and never
// justify big text.
const tameBigText = (doc) => {
  const win  = doc.defaultView
  const body = parseFloat(win.getComputedStyle(doc.body).fontSize)
  for (const el of doc.body.querySelectorAll('*')) {
    const style = win.getComputedStyle(el)
    const size  = parseFloat(style.fontSize)
    if (size <= body * TEXT_BIG) continue
    if (size > body * TEXT_MAX) el.style.setProperty('font-size', `${TEXT_MAX}rem`, 'important')
    if (style.textAlign === 'justify') el.style.setProperty('text-align', 'left', 'important')
  }
}

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

// A chapter is often split over several files and only the first is in the contents,
// so walk back through the spine to the nearest file that has a name
const chapterName = (book, href) => {
  const toc = book.navigation?.toc
  const at  = book.spine.get(href)?.index
  if (!toc?.length || at === undefined) return findLabel(toc, href)
  for (let i = at; i >= 0; i--) {
    const label = findLabel(toc, book.spine.get(i)?.href)
    if (label) return label
  }
  return ''
}

function TocRow({ item, current, onPick, depth }) {
  const label = item.label?.trim() || ''
  return (
    <>
      {label && (
        <button
          className={`toc-btn${label === current ? ' active' : ''}`}
          style={{ paddingLeft: `${20 + depth * 14}px` }}
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

// Settings that change where the words fall (theme only recolours)
const REFLOW_PREFS = ['font', 'fontSize', 'spacing', 'width', 'justify']

// Note how far through the chapter on screen you are, and return a function that
// puts you back there once the text has reflowed
const holdScrollPlace = (manager) => {
  const box  = manager?.container
  const topOf = (v) => v.element.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
  const view = box && manager.views.all().find((v) => topOf(v) + v.element.offsetHeight > box.scrollTop)
  if (!view) return () => {}
  const ratio = (box.scrollTop - topOf(view)) / (view.element.offsetHeight || 1)
  return () => {
    if (view.element.isConnected) box.scrollTop = topOf(view) + ratio * view.element.offsetHeight
  }
}

// The reading fonts, for the settings previews in the page itself
function useReaderFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_CSS_URL}"]`)) return
    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = FONT_CSS_URL
    document.head.appendChild(link)
  }, [])
}

export default function EpubReader({ url, bookId, title: initialTitle = '' }) {
  useReaderFonts()

  const containerRef = useRef(null)
  const bookRef      = useRef(null)
  const rendRef      = useRef(null)
  const cfiRef       = useRef(null)
  const idleRef      = useRef(null)
  const overBarRef   = useRef(false)
  const touchRef     = useRef(null)
  const lastTouchRef = useRef(0)
  const scrollTopRef = useRef(0)
  const locsReadyRef = useRef(false)   // percentages are only right once the full location map exists

  const [prefs, setPrefs]         = useState(loadPrefs)
  const prefsRef                  = useRef(prefs)

  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [progress,  setProgress]  = useState(0)
  const [hasProgress, setHasProgress] = useState(false)
  const [chapter,   setChapter]   = useState('')
  const [bookTitle, setBookTitle] = useState(initialTitle)
  const [toc,       setToc]       = useState([])
  const [drawer,    setDrawer]    = useState(null)     // null | 'contents' | 'bookmarks'
  const [settings,  setSettings]  = useState(false)
  const [chromeHidden, setChromeHidden] = useState(false)
  const [jumping,   setJumping]   = useState(false)
  const [bookmarks, setBookmarks] = useState([])

  prefsRef.current = prefs
  const panelOpen = drawer !== null || settings
  const panelOpenRef = useRef(panelOpen)
  panelOpenRef.current = panelOpen

  /* ── Bars: fade while reading, come back on mouse/tap ─ */
  const showChrome = useCallback(() => {
    setChromeHidden(false)
    clearTimeout(idleRef.current)
    if (!canHover()) return
    idleRef.current = setTimeout(() => {
      if (!panelOpenRef.current && !overBarRef.current) setChromeHidden(true)
    }, CHROME_IDLE_MS)
  }, [])

  // Phones fire fake mouse events right after a tap — those mustn't undo the tap's toggle
  const onMouseMove = useCallback(() => {
    if (!canHover() || Date.now() - lastTouchRef.current < 800) return
    showChrome()
  }, [showChrome])

  useEffect(() => {
    showChrome()
    window.addEventListener('mousemove', onMouseMove)
    return () => { window.removeEventListener('mousemove', onMouseMove); clearTimeout(idleRef.current) }
  }, [showChrome, onMouseMove])

  /* ── Preferences ──────────────────────────────────── */
  useEffect(() => { savePrefs(prefs) }, [prefs])

  /* ── Bookmarks ────────────────────────────────────── */
  useEffect(() => {
    if (!bookId) return
    try {
      const saved = localStorage.getItem(bookmarksKey(bookId))
      setBookmarks(saved ? JSON.parse(saved) : [])
    } catch {
      setBookmarks([])
    }
  }, [bookId])

  const persistBookmarks = useCallback((bms) => {
    if (bookId) {
      try { localStorage.setItem(bookmarksKey(bookId), JSON.stringify(bms)) } catch { /* storage blocked: bookmarks just won't persist */ }
    }
  }, [bookId])

  /* ── Progress (needs the book's location map) ─────── */
  const updateProgress = useCallback((cfi) => {
    const locs = bookRef.current?.locations
    if (!cfi || !locs || !locsReadyRef.current) return
    const pct = locs.percentageFromCfi(cfi)
    if (typeof pct !== 'number' || Number.isNaN(pct)) return
    setProgress(pct)
    setHasProgress(true)
  }, [])

  const closePanels = useCallback(() => { setDrawer(null); setSettings(false) }, [])

  const onKey = useCallback((e) => {
    if (e.key === 'Escape') { closePanels(); return }
    if (panelOpenRef.current || e.target?.closest?.('input, textarea, select, button')) return
    // The scrolling box lives outside the book's frame, so keys pressed inside the
    // frame wouldn't move it on their own
    const box = rendRef.current?.manager?.container
    if (!box) return
    const step = { ArrowDown: 64, ArrowUp: -64, PageDown: box.clientHeight * 0.9,
                   PageUp: -box.clientHeight * 0.9, ' ': box.clientHeight * 0.9 }[e.key]
    if (step === undefined) return
    e.preventDefault?.()
    box.scrollBy({ top: e.shiftKey && e.key === ' ' ? -step : step, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [closePanels])

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  const handleTap = useCallback((e, isTouch) => {
    if (e.view?.getSelection?.().toString()) return        // selecting text
    // Following a link. Only real ones: some books wrap whole chapters in a bare <a>
    if (e.target?.closest?.('a[href]')) return
    if (panelOpenRef.current) { closePanels(); return }
    if (isTouch) setChromeHidden((h) => !h)
  }, [closePanels])

  /* ── Rendering ────────────────────────────────────── */
  const applyBookCss = useCallback((rend) => {
    const css = buildBookCss(prefsRef.current)
    rend.getContents().forEach((c) => c.addStylesheetCss(css, BOOK_CSS_KEY))
  }, [])

  // The book scrolls top to bottom, chapter after chapter
  const renderBook = useCallback(async (at) => {
    const book = bookRef.current
    const el   = containerRef.current
    if (!book || !el) return

    rendRef.current?.destroy()
    const rend = book.renderTo(el, { width: el.offsetWidth, height: el.offsetHeight, flow: 'scrolled', manager: 'continuous' })
    rendRef.current = rend

    rend.hooks.content.register((contents) => {
      // Justified text can only break long words (instead of stretching the gaps
      // between them) when the browser knows the language, and many books don't say
      const root = contents.document.documentElement
      if (!root.lang) root.lang = root.getAttribute('xml:lang') || book.packaging?.metadata?.language || 'en'
      contents.addStylesheet(FONT_CSS_URL)
      contents.addStylesheetCss(buildBookCss(prefsRef.current), BOOK_CSS_KEY)
      tameBigText(contents.document)
    })

    rend.on('relocated', (loc) => {
      const cfi = loc.start?.cfi ?? null
      cfiRef.current = cfi
      if (bookId && cfi) {
        try { localStorage.setItem(storageKey(bookId), cfi) } catch { /* storage blocked: position won't persist */ }
      }
      updateProgress(cfi)
      if (loc.start?.href) setChapter(chapterName(book, loc.start.href))
    })

    rend.on('keydown', onKey)
    rend.on('mousemove', onMouseMove)
    rend.on('click', (e) => {
      if (Date.now() - lastTouchRef.current < 600) return   // already handled as a touch
      handleTap(e, false)
    })
    // Touch: only a tap (not the end of a scroll) shows or hides the bars
    rend.on('touchstart', (e) => {
      const t = e.changedTouches?.[0]
      if (t) touchRef.current = { x: t.clientX, y: t.clientY }
    })
    rend.on('touchend', (e) => {
      const t = e.changedTouches?.[0], s = touchRef.current
      touchRef.current = null
      if (!t || !s) return
      lastTouchRef.current = Date.now()
      if (Math.abs(t.clientX - s.x) < 10 && Math.abs(t.clientY - s.y) < 10) handleTap(e, true)
    })

    await rend.display(at ?? undefined)

    const manager  = rend.manager
    const scroller = manager?.container
    if (!scroller) return
    // epub.js only loads the next chapter from inside its own scroll handler, and it
    // swallows the first scroll after opening. If the opening chapter is short (a
    // cover), that first scroll is also the last, and the book stops there. So ask it
    // to look for more whenever we scroll or a chapter settles to its real height.
    let queued = false
    const fill = () => {
      if (queued || rendRef.current !== rend) return
      queued = true
      manager.q.enqueue(() => { queued = false; return manager.check() })
    }
    manager.ignore = false
    manager.on('resize', fill)
    fill()

    // Touch screens: tuck the bars away while scrolling down the page
    scrollTopRef.current = scroller.scrollTop
    scroller.addEventListener('scroll', () => {
      fill()
      const dy = scroller.scrollTop - scrollTopRef.current
      scrollTopRef.current = scroller.scrollTop
      if (canHover() || panelOpenRef.current || Math.abs(dy) < 8) return
      setChromeHidden(dy > 0)
    }, { passive: true })
  }, [bookId, updateProgress, onKey, onMouseMove, handleTap])

  /* ── Load book ────────────────────────────────────── */
  useEffect(() => {
    if (!url) return
    let dead = false

    ;(async () => {
      setLoading(true)
      setError(null)
      locsReadyRef.current = false
      try {
        const ePub = (await import('epubjs')).default
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Couldn't download this book (HTTP ${res.status})`)
        const buf = await res.arrayBuffer()
        if (dead) return

        bookRef.current?.destroy()
        const book = ePub(buf)
        bookRef.current = book

        const savedCfi = bookId ? (localStorage.getItem(storageKey(bookId)) ?? undefined) : undefined
        await renderBook(savedCfi)
        if (dead) return
        setLoading(false)

        book.loaded.metadata.then((meta) => { if (!dead && meta?.title) setBookTitle(meta.title) }).catch(() => {})
        book.loaded.navigation.then(() => { if (!dead) setToc(book.navigation?.toc || []) }).catch(() => {})

        // The location map turns a position into a percentage. Building it means reading
        // the whole book, so do it once and keep it for next time.
        await book.ready
        const cached = bookId && localStorage.getItem(locationsKey(bookId))
        if (cached) {
          book.locations.load(cached)
        } else {
          await book.locations.generate(1600)
          try { localStorage.setItem(locationsKey(bookId), book.locations.save()) } catch { /* too big or blocked: rebuilt next time */ }
        }
        if (dead) return
        locsReadyRef.current = true
        updateProgress(cfiRef.current)
      } catch (e) {
        if (!dead) { setError(e.message || 'This book could not be opened'); setLoading(false) }
      }
    })()

    return () => {
      dead = true
      rendRef.current?.destroy()
      bookRef.current?.destroy()
      bookRef.current = rendRef.current = null
    }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Jumping and preference changes ───────────────── */
  const jumpTo = useCallback(async (target) => {
    if (!target || !rendRef.current) return
    closePanels()
    setJumping(true)
    await new Promise((r) => setTimeout(r, 180))
    try {
      await rendRef.current.display(target)          // keeps #section anchors and bookmark positions
    } catch {
      // Some TOCs use paths the spine knows by another name — fall back to the chapter start
      const item = bookRef.current?.spine.get(String(target).split('#')[0])
      try { if (item) await rendRef.current.display(item.index) } catch { /* bad link: stay where we are */ }
    }
    setJumping(false)
  }, [closePanels])

  const prevPrefs = useRef(prefs)
  useEffect(() => {
    const before = prevPrefs.current
    prevPrefs.current = prefs
    const rend = rendRef.current
    if (before === prefs || !rend) return

    // Just the colours: nothing moves
    if (!REFLOW_PREFS.some((k) => before[k] !== prefs[k])) { applyBookCss(rend); return }

    // Text reflows in place; keep the same spot in the chapter on screen while the
    // chapters settle to their new heights (rebuilding them would flash and drift)
    const manager = rend.manager
    const restore = holdScrollPlace(manager)
    applyBookCss(rend)
    manager.on('resize', restore)
    const raf = requestAnimationFrame(restore)
    const t   = setTimeout(() => manager.off('resize', restore), 1500)
    return () => { cancelAnimationFrame(raf); clearTimeout(t); manager.off('resize', restore) }
  }, [prefs, applyBookCss])

  /* ── Keep the rendition sized to its box ──────────── */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => rendRef.current?.resize(el.offsetWidth, el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ── Render ───────────────────────────────────────── */
  const theme        = THEMES[prefs.theme]
  const isBookmarked = bookmarks.some((b) => b.cfi === cfiRef.current)
  const pct          = Math.round(progress * 100)

  const toggleBookmark = () => {
    const cfi = cfiRef.current
    if (!cfi) return
    setBookmarks((prev) => {
      const next = prev.some((b) => b.cfi === cfi)
        ? prev.filter((b) => b.cfi !== cfi)
        : [{ id: Date.now(), cfi, chapter: chapter || bookTitle || '—', pct: progress, createdAt: new Date().toISOString() }, ...prev]
      persistBookmarks(next)
      return next
    })
  }

  const removeBookmark = (id) => setBookmarks((prev) => {
    const next = prev.filter((b) => b.id !== id)
    persistBookmarks(next)
    return next
  })

  const chromeClass = chromeHidden && !panelOpen ? ' chrome-hidden' : ''

  return (
    <div
      className={`epub-reader${chromeClass}`}
      data-theme={prefs.theme}
      style={{ '--r-bg': theme.bg, '--r-text': theme.text, '--r-accent': theme.accent }}
    >
      {/* ── Top bar ─────────────────────────────────── */}
      <header
        className="rd-bar rd-top"
        onMouseEnter={() => { overBarRef.current = true }}
        onMouseLeave={() => { overBarRef.current = false }}
      >
        <Link to="/library" className="rd-icon" aria-label="Back to the library" title="Back to the library">←</Link>

        <button
          className="rd-title"
          onClick={() => { setDrawer((d) => (d === 'contents' ? null : 'contents')); setSettings(false) }}
          aria-label="Contents"
          title="Contents"
        >
          <span className="rd-title-book">{bookTitle || ' '}</span>
          <span className="rd-title-chapter">{chapter || 'Contents'} <span className="rd-caret">▾</span></span>
        </button>

        <button
          className={`rd-icon${isBookmarked ? ' on' : ''}`}
          onClick={toggleBookmark}
          aria-pressed={isBookmarked}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this place'}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark this place'}
        >
          {isBookmarked ? '◆' : '◇'}
        </button>
        <button
          className={`rd-icon rd-aa${settings ? ' on' : ''}`}
          onClick={() => { setSettings((s) => !s); setDrawer(null) }}
          aria-expanded={settings}
          aria-label="Reading settings"
          title="Reading settings"
        >
          Aa
        </button>
      </header>

      {/* ── Panels ──────────────────────────────────── */}
      {panelOpen && <div className="rd-backdrop" onClick={closePanels} />}

      <aside className={`rd-drawer${drawer ? ' open' : ''}`} aria-hidden={!drawer}>
        <div className="rd-tabs" role="tablist">
          <button role="tab" aria-selected={drawer !== 'bookmarks'}
                  className={`rd-tab${drawer !== 'bookmarks' ? ' on' : ''}`}
                  onClick={() => setDrawer('contents')}>Contents</button>
          <button role="tab" aria-selected={drawer === 'bookmarks'}
                  className={`rd-tab${drawer === 'bookmarks' ? ' on' : ''}`}
                  onClick={() => setDrawer('bookmarks')}>
            Bookmarks{bookmarks.length ? ` · ${bookmarks.length}` : ''}
          </button>
          <button className="rd-drawer-close" onClick={closePanels} aria-label="Close">×</button>
        </div>
        <div className="rd-drawer-scroll">
          {drawer !== 'bookmarks' ? (
            toc.length
              ? toc.map((item, i) => <TocRow key={i} item={item} current={chapter} onPick={jumpTo} depth={0} />)
              : <div className="rd-empty">No chapters found</div>
          ) : (
            bookmarks.length
              ? bookmarks.map((bm) => (
                  <div key={bm.id} className="bm-item">
                    <button className="bm-item-main" onClick={() => jumpTo(bm.cfi)}>
                      <span className="bm-chapter">{bm.chapter}</span>
                      <span className="bm-pct">{Math.round(bm.pct * 100)}%</span>
                    </button>
                    <button className="bm-remove" onClick={() => removeBookmark(bm.id)} aria-label="Remove bookmark">×</button>
                  </div>
                ))
              : <div className="rd-empty">No bookmarks yet — tap ◇ at the top to mark your place</div>
          )}
        </div>
      </aside>

      {settings && <ReaderSettings prefs={prefs} onChange={setPrefs} onClose={() => setSettings(false)} />}

      {/* ── Book ────────────────────────────────────── */}
      <main className="rd-stage">
        <div className={`rd-book${jumping ? ' jumping' : ''}`} ref={containerRef} />

        {loading && (
          <div className="rd-loading">
            <div className="rd-spinner" />
            <span>Opening…</span>
          </div>
        )}
        {error && <div className="rd-error">{error}</div>}
      </main>

      {/* ── Progress ────────────────────────────────── */}
      <footer className="rd-bar rd-foot">
        <div className="rd-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress through the book">
          <div className="rd-fill" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <span className="rd-foot-pct">{hasProgress ? `${pct}%` : '…'}</span>
      </footer>
    </div>
  )
}
