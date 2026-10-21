import { THEMES, FONTS, SPACING, WIDTHS, FONT_SIZE } from './readerPrefs'

const SPACING_LABELS = { snug: 'Snug', comfy: 'Comfy', airy: 'Airy' }
const WIDTH_LABELS   = { narrow: 'Narrow', medium: 'Medium', wide: 'Wide' }

function Segmented({ label, options, value, onChange, className = '' }) {
  return (
    <div className={`rs-row ${className}`}>
      <span className="rs-label">{label}</span>
      <div className="rs-seg" role="radiogroup" aria-label={label}>
        {options.map(([key, text, style]) => (
          <button
            key={key}
            role="radio"
            aria-checked={value === key}
            className={`rs-seg-btn${value === key ? ' on' : ''}`}
            style={style}
            onClick={() => onChange(key)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ReaderSettings({ prefs, onChange, onClose }) {
  const set = (key) => (value) => onChange({ ...prefs, [key]: value })
  const size = (delta) => set('fontSize')(
    Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, prefs.fontSize + delta)))

  return (
    <div className="rs-panel" role="dialog" aria-label="Reading settings">
      <div className="rs-head">
        <span className="rs-title">Reading settings</span>
        <button className="rs-close" onClick={onClose} aria-label="Close settings">×</button>
      </div>

      <div className="rs-row">
        <span className="rs-label">Theme</span>
        <div className="rs-themes" role="radiogroup" aria-label="Theme">
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              role="radio"
              aria-checked={prefs.theme === key}
              className={`rs-theme${prefs.theme === key ? ' on' : ''}`}
              style={{ background: t.bg, color: t.text }}
              onClick={() => set('theme')(key)}
            >
              <span className="rs-theme-aa">Aa</span>
              <span className="rs-theme-name">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Segmented
        label="Font"
        value={prefs.font}
        onChange={set('font')}
        options={Object.entries(FONTS).map(([key, f]) => [key, f.label, f.family ? { fontFamily: f.family } : undefined])}
      />

      <div className="rs-row">
        <span className="rs-label">Size</span>
        <div className="rs-size">
          <button className="rs-size-btn small" onClick={() => size(-FONT_SIZE.step)}
                  disabled={prefs.fontSize <= FONT_SIZE.min} aria-label="Smaller text">A</button>
          <span className="rs-size-val">{prefs.fontSize}</span>
          <button className="rs-size-btn big" onClick={() => size(FONT_SIZE.step)}
                  disabled={prefs.fontSize >= FONT_SIZE.max} aria-label="Larger text">A</button>
        </div>
      </div>

      <Segmented
        label="Spacing"
        value={prefs.spacing}
        onChange={set('spacing')}
        options={Object.keys(SPACING).map((k) => [k, SPACING_LABELS[k]])}
      />

      {/* Phones are already narrower than the narrowest column, so this is desktop-only */}
      <Segmented
        className="rs-row-width"
        label="Width"
        value={prefs.width}
        onChange={set('width')}
        options={Object.keys(WIDTHS).map((k) => [k, WIDTH_LABELS[k]])}
      />

      <Segmented
        label="Align"
        value={prefs.justify ? 'justify' : 'left'}
        onChange={(v) => set('justify')(v === 'justify')}
        options={[['left', 'Left'], ['justify', 'Justified']]}
      />

      <Segmented
        label="Layout"
        value={prefs.flow}
        onChange={set('flow')}
        options={[['scrolled', 'Scroll'], ['paginated', 'Pages']]}
      />
    </div>
  )
}
