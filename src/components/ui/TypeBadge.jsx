import './TypeBadge.css'

const TYPE_COLORS = {
  pdf:    { bg: 'rgba(255,50,50,0.12)',    border: 'rgba(255,50,50,0.4)',    text: '#ff6060' },
  epub:   { bg: 'rgba(0,255,65,0.08)',     border: 'rgba(0,255,65,0.3)',     text: '#00ff41' },
  post:   { bg: 'rgba(0,255,65,0.06)',     border: 'rgba(0,255,65,0.22)',    text: '#00ff41' },
  music:  { bg: 'rgba(127,255,0,0.08)',    border: 'rgba(127,255,0,0.25)',   text: '#7fff00' },
  book:   { bg: 'rgba(0,255,65,0.06)',     border: 'rgba(0,255,65,0.22)',    text: '#00cc33' },
  film:   { bg: 'rgba(255,180,50,0.08)',   border: 'rgba(255,180,50,0.25)', text: '#ffb432' },
  series: { bg: 'rgba(0,255,65,0.06)',     border: 'rgba(0,255,65,0.2)',     text: '#00dd44' },
}

export default function TypeBadge({ type = 'post' }) {
  const c = TYPE_COLORS[type.toLowerCase()] || TYPE_COLORS.post
  return (
    <span
      className="type-badge mono"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {type.toUpperCase()}
    </span>
  )
}
