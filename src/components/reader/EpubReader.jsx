import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ReaderSettings from './ReaderSettings'
import { THEMES, WIDTHS, FONT_CSS_URL, loadPrefs, savePrefs, buildBookCss } from './readerPrefs'
import './EpubReader.css'

const storageKey   = (id) => `riri_reader_${id}_cfi`
const bookmarksKey = (id) => `riri_reader_${id}_bm`
const locationsKey = (id) => `riri_reader_${id}_locs`

const BOOK_CSS_KEY   = 'riri-reader'
const CHROME_IDLE_MS = 2800   // desktop: bars fade after this long without the mouse moving
const PAGE_GAP       = { wide: 56, narrow: 44 }
const TURN_MS        = 260    // a page sliding across
const SPREAD_MARGIN  = 56     // each side of a two-page spread, for the turn arrows
const SPREAD_MIN_EM  = 28     // a page of a spread is never narrower than this
const HEADING_MAX    = 1.6    // × the text size

const canHover      = () => window.matchMedia('(hover: hover)').matches
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const easeOut       = (t) => 1 - (1 - t) ** 3
const pageGap       = () => (window.innerWidth < 600 ? PAGE_GAP.narrow : PAGE_GAP.wide)

// Where a pointer is across the whole page. Events from inside the book's frame
// count from the frame's own corner, and the frame moves as pages slide.
const pageX = (e, clientX) => (e.view?.frameElement?.getBoundingClientRect().left ?? 0) + clientX

// epub.js moves between pages by scrolling a wide strip of columns sideways. Move it
// ourselves (quietly, so epub.js doesn't take each step as a new place in the book).
const scrollQuietly = (manager, x) => {
  const box = manager.container
  if (Math.abs(box.scrollLeft - x) < 0.5) return
  manager.ignore = true
  box.scrollLeft = x
}

// The page beside the one on screen, when it's in the same chapter (and so already
// laid out, just off to the side). At a chapter's edge there's nothing there yet.
const neighbour = (rend, dir) => {
  const m = rend?.manager, box = m?.container, delta = m?.layout?.delta
  if (!box || !delta) return null
  const base = Math.round(box.scrollLeft / delta) * delta
  const to   = base + (dir === 'next' ? delta : -delta)
  if (to < 0 || to + box.offsetWidth > box.scrollWidth + 1) return null
  return { m, base, to }
}

// Some books set chapter headings so large that a phone page holds three words.
// Keep each to at most HEADING_MAX × the text (in rem, so it follows the size setting).
const tameHeadings = (doc) => {
  const win  = doc.defaultView
  const body = parseFloat(win.getComputedStyle(doc.body).fontSize)
  for (const h of doc.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    if (parseFloat(win.getComputedStyle(h).fontSize) > body * HEADING_MAX) {
      h.style.setProperty('font-size', `${HEADING_MAX}rem`, 'important')
    }
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

// epub.js's own page count drifts when pages have a gap between them (it divides by the
// page width without the gap), so count from how far the chapter has scrolled sideways
const chapterPages = (rend) => {
  const m     = rend?.manager
  const delta = m?.layout?.delta
  const view  = m?.views?.first?.()
  if (!delta || !view) return null
  const total = Math.max(1, Math.round(view.width() / delta))
  const page  = Math.min(total, Math.round(m.container.scrollLeft / delta) + 1)
  return { page, total }
}

// Settings that change where the words fall (theme only recolours)
const REFLOW_PREFS = ['font', 'fontSize', 'spacing', 'width', 'justify', 'spread']

// Scroll mode: note how far through the chapter on screen you are, and return a
// function that puts you back there once the text has reflowed
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

const pagesLeftLabel = (info) => {
  if (!info) return ''
  const left = info.total - info.page
  if (left <= 0) return 'Last page of chapter'
  return `${left} ${left === 1 ? 'page' : 'pages'} left in chapter`
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
  const turningRef   = useRef(false)
  const idleRef      = useRef(null)
  const overBarRef   = useRef(false)
  const touchRef     = useRef(null)
  const slideRef     = useRef(null)    // the page slide under way
  const wheelRef     = useRef({ total: 0, last: 0, done: false })
  const stageRef     = useRef(null)
  const spreadRef    = useRef(false)
  const lastTouchRef = useRef(0)
  const scrollTopRef = useRef(0)
  const locsReadyRef = useRef(false)   // percentages are only right once the full location map exists

  const [prefs, setPrefs]         = useState(loadPrefs)
  const prefsRef                  = useRef(prefs)
  const flowRef                   = useRef(prefs.flow)

  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [progress,  setProgress]  = useState(0)
  const [hasProgress, setHasProgress] = useState(false)
  const [atStart,   setAtStart]   = useState(true)
  const [atEnd,     setAtEnd]     = useState(false)
  const [pageInfo,  setPageInfo]  = useState(null)
  const [chapter,   setChapter]   = useState('')
  const [bookTitle, setBookTitle] = useState(initialTitle)
  const [toc,       setToc]       = useState([])
  const [drawer,    setDrawer]    = useState(null)     // null | 'contents' | 'bookmarks'
  const [settings,  setSettings]  = useState(false)
  const [chromeHidden, setChromeHidden] = useState(false)
  const [jumping,   setJumping]   = useState(false)
  const [bookmarks, setBookmarks] = useState([])
  const [stageW,    setStageW]    = useState(() => window.innerWidth)

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

  /* ── Page turning ─────────────────────────────────── */
  // Inside a chapter the next page is already laid out beside this one, so it slides
  // across for real (and follows a finger). Into a new chapter, epub.js has to load it
  // first; it then slides in from the side. Nothing ever waits for an animation: a
  // turn during a slide lands the slide at once and starts from there.
  const stopSlide = useCallback((land) => {
    const s = slideRef.current
    if (!s) return
    cancelAnimationFrame(s.raf)
    slideRef.current = null
    if (land) { scrollQuietly(s.m, s.to); rendRef.current?.reportLocation() }
  }, [])

  const slide = useCallback((m, to, ms = TURN_MS) => {
    stopSlide(true)
    const from = m.container.scrollLeft, start = performance.now()
    const s = { m, to, raf: 0 }
    const step = (now) => {
      if (slideRef.current !== s) return
      const t = Math.min(1, (now - start) / ms)
      scrollQuietly(m, from + (to - from) * easeOut(t))
      if (t < 1) { s.raf = requestAnimationFrame(step); return }
      slideRef.current = null
      rendRef.current?.reportLocation()
    }
    slideRef.current = s
    s.raf = requestAnimationFrame(step)
  }, [stopSlide])

  const go = useCallback(async (dir) => {
    const rend = rendRef.current
    if (!rend) return
    stopSlide(true)
    const animate = flowRef.current === 'paginated' && !reducedMotion()
    const near = animate && !turningRef.current && neighbour(rend, dir)
    if (near) { slide(near.m, near.to); return }

    // Only a turn that's still loading the next chapter blocks another
    if (turningRef.current) return
    turningRef.current = true
    try {
      // epub.js can leave a turn hanging (busy loading a chapter); never let that
      // lock every turn after it
      await Promise.race([dir === 'next' ? rend.next() : rend.prev(), new Promise((r) => setTimeout(r, 900))])
    } catch { /* couldn't turn (e.g. end of book): stay put */ }
    turningRef.current = false
    if (animate) {
      const from = dir === 'next' ? '22%' : '-22%'
      containerRef.current?.animate(
        [{ opacity: 0, transform: `translate3d(${from},0,0)` }, { opacity: 1, transform: 'none' }],
        { duration: TURN_MS + 60, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' })
    }
  }, [slide, stopSlide])

  // Pages mode: a trackpad swipe or a turn of the mouse wheel turns one page
  const onWheel = useCallback((e) => {
    if (flowRef.current !== 'paginated' || panelOpenRef.current || e.ctrlKey) return
    e.preventDefault()
    const w = wheelRef.current, now = performance.now()
    if (now - w.last > 220) { w.total = 0; w.done = false }    // a new flick or turn
    w.last = now
    if (w.done) return                                         // the rest of the same one
    w.total += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 16 : 1)
    if (Math.abs(w.total) > 40) { w.done = true; go(w.total > 0 ? 'next' : 'prev') }
  }, [go])

  const closePanels = useCallback(() => { setDrawer(null); setSettings(false) }, [])

  const onKey = useCallback((e) => {
    if (e.key === 'Escape') { closePanels(); return }
    if (panelOpenRef.current || e.target?.closest?.('input, textarea, select, button')) return
    if (flowRef.current !== 'paginated') {
      // Scroll mode: the scrolling box lives outside the book's frame, so keys pressed
      // inside the frame wouldn't move it on their own
      const box = rendRef.current?.manager?.container
      if (!box) return
      const step = { ArrowDown: 64, ArrowUp: -64, PageDown: box.clientHeight * 0.9,
                     PageUp: -box.clientHeight * 0.9, ' ': box.clientHeight * 0.9 }[e.key]
      if (step === undefined) return
      e.preventDefault?.()
      box.scrollBy({ top: e.shiftKey && e.key === ' ' ? -step : step, behavior: reducedMotion() ? 'auto' : 'smooth' })
      return
    }
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault?.(); go(e.shiftKey && e.key === ' ' ? 'prev' : 'next') }
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key))           { e.preventDefault?.(); go('prev') }
  }, [go, closePanels])

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  // Where a tap/click landed, as a fraction of the reading area's width
  const tapPosition = useCallback((e, clientX) => {
    const box = containerRef.current?.getBoundingClientRect()
    if (!e.view?.frameElement || !box?.width) return 0.5
    return (pageX(e, clientX) - box.left) / box.width
  }, [])

  const handleTap = useCallback((e, clientX, isTouch) => {
    if (e.view?.getSelection?.().toString()) return        // selecting text
    // Following a link. Only real ones: some books wrap whole chapters in a bare <a>
    if (e.target?.closest?.('a[href]')) return
    if (panelOpenRef.current) { closePanels(); return }
    const x = tapPosition(e, clientX)
    if (flowRef.current === 'paginated') {
      if (x < 0.3) { go('prev'); return }
      if (x > 0.7) { go('next'); return }
    }
    if (isTouch) setChromeHidden((h) => !h)
  }, [tapPosition, closePanels, go])

  /* ── Rendering ────────────────────────────────────── */
  const applyBookCss = useCallback((rend) => {
    const css = buildBookCss(prefsRef.current, flowRef.current)
    rend.getContents().forEach((c) => c.addStylesheetCss(css, BOOK_CSS_KEY))
  }, [])

  const renderBook = useCallback(async (flow, at) => {
    const book = bookRef.current
    const el   = containerRef.current
    if (!book || !el) return

    stopSlide(false)
    rendRef.current?.destroy()
    flowRef.current = flow
    const rend = book.renderTo(el, flow === 'scrolled'
      ? { width: el.offsetWidth, height: el.offsetHeight, flow: 'scrolled', manager: 'continuous' }
      : { width: el.offsetWidth, height: el.offsetHeight, flow: 'paginated',
          spread: spreadRef.current ? 'auto' : 'none', minSpreadWidth: 0, gap: pageGap() })
    rendRef.current = rend

    rend.hooks.content.register((contents) => {
      contents.addStylesheet(FONT_CSS_URL)
      contents.addStylesheetCss(buildBookCss(prefsRef.current, flowRef.current), BOOK_CSS_KEY)
      tameHeadings(contents.document)
      contents.document.addEventListener('wheel', onWheel, { passive: false })
    })

    rend.on('relocated', (loc) => {
      const cfi = loc.start?.cfi ?? null
      cfiRef.current = cfi
      if (bookId && cfi) {
        try { localStorage.setItem(storageKey(bookId), cfi) } catch { /* storage blocked: position won't persist */ }
      }
      setAtStart(!!loc.atStart)
      setAtEnd(!!loc.atEnd)
      setPageInfo(flowRef.current === 'paginated' ? chapterPages(rend) : null)
      updateProgress(cfi)
      if (loc.start?.href) setChapter(chapterName(book, loc.start.href))
    })

    rend.on('keydown', onKey)
    rend.on('mousemove', onMouseMove)
    rend.on('click', (e) => {
      if (Date.now() - lastTouchRef.current < 600) return   // already handled as a touch
      handleTap(e, e.clientX, false)
    })
    // Touch: a tap is a tap; a sideways drag in pages mode pulls the page along under
    // the finger and lets go to turn (or not, if it didn't go far or fast enough)
    rend.on('touchstart', (e) => {
      const t = e.changedTouches?.[0]
      if (!t) return
      const x = pageX(e, t.clientX)
      touchRef.current = { x, y: t.clientY, mode: null, trail: [[x, performance.now()]] }
    })
    rend.on('touchmove', (e) => {
      const s = touchRef.current, t = e.changedTouches?.[0]
      if (!s || !t || flowRef.current !== 'paginated' || panelOpenRef.current) return
      const x = pageX(e, t.clientX), dx = x - s.x, dy = t.clientY - s.y, now = performance.now()
      if (!s.mode) {
        if (Math.hypot(dx, dy) < 10) return
        s.mode = Math.abs(dx) > Math.abs(dy) ? 'drag' : 'other'
        if (s.mode === 'drag') {
          stopSlide(true)
          s.next = !turningRef.current && neighbour(rend, 'next')
          s.prev = !turningRef.current && neighbour(rend, 'prev')
        }
      }
      if (s.mode !== 'drag') return
      s.trail.push([x, now])
      while (s.trail.length > 2 && now - s.trail[0][1] > 100) s.trail.shift()
      const near = dx < 0 ? s.next : s.prev
      const el = containerRef.current
      if (near && !reducedMotion()) {
        // the real next page comes in under the finger
        const { m, base } = near, delta = m.layout.delta
        scrollQuietly(m, Math.min(base + delta, Math.max(base - delta, base - dx)))
        if (el) el.style.transform = ''
      } else if (el) {
        // a chapter's edge: the page gives a little, to show the pull registered
        const other = s.next || s.prev
        if (other) scrollQuietly(other.m, other.base)
        el.style.transform = `translate3d(${dx * 0.3}px,0,0)`
      }
    })
    rend.on('touchend', (e) => {
      const t = e.changedTouches?.[0], s = touchRef.current
      touchRef.current = null
      if (!t || !s) return
      lastTouchRef.current = Date.now()
      const x = pageX(e, t.clientX), dx = x - s.x, dy = t.clientY - s.y
      if (s.mode === 'drag') {
        const [x0, t0] = s.trail[0]
        const speed = (x - x0) / Math.max(1, performance.now() - t0)   // px per ms
        const el = containerRef.current, width = el?.offsetWidth || 1
        const far   = Math.abs(dx) > Math.min(90, width * 0.22)
        const flung = Math.abs(dx) > 24 && Math.abs(speed) > 0.35 && Math.sign(speed) === Math.sign(dx)
        const dir   = dx < 0 ? 'next' : 'prev'
        const near  = dir === 'next' ? s.next : s.prev
        if (near && !reducedMotion()) {
          slide(near.m, far || flung ? near.to : near.base, 200)
        } else {
          if (el?.style.transform) {
            const pulled = el.style.transform
            el.style.transform = ''
            el.animate([{ transform: pulled }, { transform: 'none' }], { duration: 180, easing: 'ease-out' })
          }
          if (far || flung) go(dir)
        }
      } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        handleTap(e, t.clientX, true)
      }
    })

    await rend.display(at ?? undefined)

    const manager  = rend.manager
    const scroller = manager?.container
    if (flow === 'scrolled' && scroller) {
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
    }
  }, [bookId, updateProgress, onKey, onMouseMove, handleTap, go, slide, stopSlide, onWheel])

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
        await renderBook(prefsRef.current.flow, savedCfi)
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

  /* ── Apply preference changes ─────────────────────── */
  const jumpTo = useCallback(async (target) => {
    if (!target || !rendRef.current) return
    closePanels()
    stopSlide(false)
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
  }, [closePanels, stopSlide])

  const prevPrefs = useRef(prefs)
  useEffect(() => {
    const before = prevPrefs.current
    prevPrefs.current = prefs
    const rend = rendRef.current
    if (before === prefs || !rend) return
    const at = cfiRef.current
    if (prefs.flow !== flowRef.current) {
      // Switching scroll <-> pages needs a fresh rendition, at the same place
      setJumping(true)
      const t = setTimeout(async () => {
        await renderBook(prefs.flow, at)
        setJumping(false)
      }, 180)
      return () => clearTimeout(t)
    }

    // Just the colours: nothing moves
    if (!REFLOW_PREFS.some((k) => before[k] !== prefs[k])) { applyBookCss(rend); return }

    if (flowRef.current === 'scrolled') {
      // Text reflows in place; keep the same spot in the chapter on screen while the
      // chapters settle to their new heights (rebuilding them would flash and drift)
      const manager = rend.manager
      const restore = holdScrollPlace(manager)
      applyBookCss(rend)
      manager.on('resize', restore)
      const raf = requestAnimationFrame(restore)
      const t   = setTimeout(() => manager.off('resize', restore), 1500)
      return () => { cancelAnimationFrame(raf); clearTimeout(t); manager.off('resize', restore) }
    }

    // Pages: the page breaks all move, so re-open at the same sentence
    applyBookCss(rend)
    const t = setTimeout(() => { if (at) rendRef.current?.display(at).catch(() => {}) }, 120)
    return () => clearTimeout(t)
  }, [prefs, renderBook, applyBookCss])

  /* ── Page size: one column, or two side by side when there's room ── */
  const theme     = THEMES[prefs.theme]
  const isPaged   = prefs.flow === 'paginated'
  const gap       = pageGap()
  const pagePx    = Math.round(prefs.fontSize * WIDTHS[prefs.width]) + gap   // a column of text and its margins
  const room      = stageW - 2 * SPREAD_MARGIN
  const canSpread = isPaged && room >= 2 * (prefs.fontSize * SPREAD_MIN_EM + gap)
  const spread    = canSpread && prefs.spread
  const bookPx    = spread ? 2 * Math.min(pagePx, Math.floor(room / 2)) : pagePx

  // Before the box changes size, so epub.js lays the new size out the new way
  useLayoutEffect(() => {
    if (spreadRef.current === spread) return
    spreadRef.current = spread
    const rend = rendRef.current
    if (!rend || flowRef.current !== 'paginated') return
    stopSlide(false)
    rend.spread(spread ? 'auto' : 'none', 0)
  }, [spread, stopSlide])

  /* ── Keep the rendition sized to its box ──────────── */
  useEffect(() => {
    const el = containerRef.current, stage = stageRef.current
    if (!el || !stage) return
    const book = new ResizeObserver(() => { stopSlide(false); rendRef.current?.resize(el.offsetWidth, el.offsetHeight) })
    const area = new ResizeObserver(() => setStageW(stage.clientWidth))
    book.observe(el)
    area.observe(stage)
    // the margins beside the pages turn them too
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => { book.disconnect(); area.disconnect(); stage.removeEventListener('wheel', onWheel) }
  }, [stopSlide, onWheel])

  /* ── Render ───────────────────────────────────────── */
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
      data-flow={prefs.flow}
      style={{
        '--r-bg': theme.bg, '--r-text': theme.text, '--r-accent': theme.accent,
        '--r-book': `${bookPx}px`,
      }}
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
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
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
              : <div className="rd-empty">No bookmarks yet — tap ◇ at the top to mark a page</div>
          )}
        </div>
      </aside>

      {settings && <ReaderSettings prefs={prefs} canSpread={canSpread} onChange={setPrefs} onClose={() => setSettings(false)} />}

      {/* ── Book ────────────────────────────────────── */}
      <main className="rd-stage" ref={stageRef}>
        {isPaged && (
          <>
            <button className={`rd-turn left${atStart ? ' off' : ''}`} onClick={() => go('prev')} aria-label="Previous page">‹</button>
            <button className={`rd-turn right${atEnd ? ' off' : ''}`} onClick={() => go('next')} aria-label="Next page">›</button>
          </>
        )}
        <div className={`rd-book${spread ? ' spread' : ''}${jumping ? ' jumping' : ''}`} ref={containerRef} />

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
        <span className="rd-foot-left">{pagesLeftLabel(pageInfo)}</span>
        <div className="rd-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress through the book">
          <div className="rd-fill" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <span className="rd-foot-pct">{hasProgress ? `${pct}%` : '…'}</span>
      </footer>
    </div>
  )
}
