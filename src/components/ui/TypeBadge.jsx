import './TypeBadge.css'

const TYPE_COLORS = {
  pdf:   { bg: 'rgba(200,30,30,0.12)', border: 'rgba(200,30,30,0.4)', text: '#e05050' },
  epub:  { bg: 'rgba(60,120,200,0.12)', border: 'rgba(60,120,200,0.4)', text: '#6090d0' },
  post:  { bg: 'rgba(230,180,0,0.1)', border: 'rgba(230,180,0,0.3)', text: '#e6b400' },
  music: { bg: 'rgba(100,200,100,0.1)', border: 'rgba(100,200,100,0.3)', text: '#60c060' },
  book:  { bg: 'rgba(180,100,200,0.1)', border: 'rgba(180,100,200,0.3)', text: '#b464c8' },
  film:  { bg: 'rgba(200,150,50,0.1)', border: 'rgba(200,150,50,0.3)', text: '#c89632' },
  series: { bg: 'rgba(80,180,200,0.1)', border: 'rgba(80,180,200,0.3)', text: '#50b4c8' },
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
