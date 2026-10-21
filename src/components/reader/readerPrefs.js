// Reading preferences for the EPUB reader — remembered per browser.

const PREFS_KEY = 'riri_reader_prefs'
// Bumped when a default changes enough that everyone should get the new one once
const PREFS_VERSION = 3

export const THEMES = {
  paper: { label: 'Paper', bg: '#f4ecdf', text: '#2b2118', accent: '#7a4a22' },
  dusk:  { label: 'Dusk',  bg: '#0e1f1c', text: '#e8dcc6', accent: '#c9a847' },
  night: { label: 'Night', bg: '#0b0b0a', text: '#b9b0a2', accent: '#a8894a' },   // dim, for reading in bed
}

export const FONTS = {
  book:     { label: 'Book',     family: null },   // whatever the EPUB ships with
  literata: { label: 'Literata', family: "'Literata', Georgia, serif" },
  atkinson: { label: 'Atkinson', family: "'Atkinson Hyperlegible', system-ui, sans-serif" },
}

// Loaded into each chapter's frame (and the page, for the settings previews)
export const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Literata:ital,wght@0,400;0,600;1,400' +
  '&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap'

export const SPACING = { snug: 1.4, comfy: 1.6, airy: 1.85 }

// Column width in ems of the text, so it stays ~60–75 characters per line at any size
export const WIDTHS = { narrow: 28, medium: 34, wide: 42 }

export const FONT_SIZE = { min: 14, max: 30, step: 2 }

export const DEFAULT_PREFS = {
  theme:    'dusk',
  font:     'literata',
  fontSize: 19,
  spacing:  'comfy',
  width:    'medium',
  justify:  false,
}

// A phone held at arm's length needs less than a laptop screen
const deviceFontSize = () => (window.matchMedia('(max-width: 600px)').matches ? 17 : DEFAULT_PREFS.fontSize)

export function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    // Page-turning mode is gone: books always scroll
    delete saved.flow
    delete saved.spread
    // v2+: phones start with smaller text
    if ((saved.v ?? 1) < 2 && saved.fontSize === 19) delete saved.fontSize
    const prefs = { ...DEFAULT_PREFS, fontSize: deviceFontSize(), ...saved, v: PREFS_VERSION }
    // Drop anything stale from an older version of these options
    if (!THEMES[prefs.theme])    prefs.theme   = DEFAULT_PREFS.theme
    if (!FONTS[prefs.font])      prefs.font    = DEFAULT_PREFS.font
    if (!SPACING[prefs.spacing]) prefs.spacing = DEFAULT_PREFS.spacing
    if (!WIDTHS[prefs.width])    prefs.width   = DEFAULT_PREFS.width
    return prefs
  } catch {
    return { ...DEFAULT_PREFS, v: PREFS_VERSION }
  }
}

export function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch { /* private mode: just not remembered */ }
}

// CSS injected into the book's own pages (as text, so each change REPLACES the last —
// epub.js's rule-object themes only ever append). The !importants are needed because
// EPUBs ship their own styles: fixed colours, justified text, tight leading.
export function buildBookCss(prefs) {
  const t      = THEMES[prefs.theme]
  const family = FONTS[prefs.font].family
  const lh     = SPACING[prefs.spacing]
  const align  = prefs.justify ? 'justify' : 'left'
  const font   = family ? { 'font-family': `${family} !important` } : {}

  const rules = {
    'html': {
      'background': `${t.bg} !important`,
      // rem-sized books follow the size setting too
      'font-size':  `${prefs.fontSize}px !important`,
      // iPhones otherwise blow up the text in a frame they think is too wide
      '-webkit-text-size-adjust': '100%',
      'text-size-adjust': '100%',
      // A sideways swipe mustn't be read as back/forward. Only sideways: blocking
      // vertical too stops the scroll reaching the box around the frame, and then the
      // book can't be scrolled at all.
      'overscroll-behavior-x': 'none',
      'overflow-x': 'hidden',
    },
    'body': {
      'background':  `${t.bg} !important`,
      'color':       `${t.text} !important`,
      'font-size':   `${prefs.fontSize}px !important`,
      'line-height': `${lh} !important`,
      '-webkit-font-smoothing': 'antialiased',
      'text-rendering': 'optimizeLegibility',
      'font-kerning': 'normal',
      'overflow-wrap': 'break-word',
      ...font,
      // The frame spans the screen, so centre a readable column inside it
      'max-width': `${WIDTHS[prefs.width]}em !important`,
      'margin':    '0 auto !important',
      'padding':   '1.6em clamp(22px, 6vw, 32px) 3em !important',
      'box-sizing': 'border-box',
    },
    'body *': { 'color': 'inherit !important', 'background-color': 'transparent !important' },
    'p, li, blockquote, dd, dt, div': { 'line-height': `${lh} !important`, ...font },
    ...(family ? { 'span, em, i, b, strong, cite, small': font } : {}),
    'p': {
      'text-align':      `${align} !important`,
      'hyphens':         prefs.justify ? 'auto' : 'manual',
      '-webkit-hyphens': prefs.justify ? 'auto' : 'manual',
      // no lone word on a paragraph's last line
      'text-wrap': 'pretty',
    },
    'h1, h2, h3, h4, h5, h6': {
      'line-height': '1.25 !important', 'color': `${t.accent} !important`,
      'text-wrap': 'balance', 'text-indent': '0 !important', ...font,
    },
    'blockquote': { 'margin-left': '1.2em !important', 'margin-right': '0.6em !important' },
    'table': { 'max-width': '100% !important' },
    'pre': { 'white-space': 'pre-wrap !important' },
    // Real links only — some books wrap whole chapters in a bare <a id>
    'a[href], a[href] *': { 'color': `${t.accent} !important` },
    'img, svg, video': { 'max-width': '100% !important', 'height': 'auto !important' },
    'img': { 'display': 'block', 'margin': '1.5em auto' },
    '::selection': { 'background': `${t.accent}55` },
  }
  return Object.entries(rules)
    .map(([selector, decl]) => `${selector}{${Object.entries(decl).map(([k, v]) => `${k}:${v}`).join(';')}}`)
    .join('\n')
}
