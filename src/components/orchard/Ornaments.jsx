// The gilded bits both games are framed with (styled in Orchard.css)

export function Corner({ className }) {
  return (
    <svg className={`orch-corner ${className}`} viewBox="0 0 160 160" aria-hidden="true">
      <path d="M6 154V62C6 30 30 6 62 6h92" />
      <path className="faint" d="M18 154V72c0-30 24-54 54-54h82" />
      <path d="M6 62c34 0 56-22 56-56" />
      <path className="faint" d="M62 62c-16 0-22-15-12-22 9-6 19 3 13 11" />
      <circle cx="62" cy="62" r="3.2" />
    </svg>
  )
}

export function Frame() {
  return (
    <div className="orch-frame" aria-hidden="true">
      <Corner className="tl" /><Corner className="tr" /><Corner className="bl" /><Corner className="br" />
    </div>
  )
}

export function Ornament() {
  return (
    <div className="orch-ornament" aria-hidden="true">
      <span /><i>❦</i><span />
    </div>
  )
}
