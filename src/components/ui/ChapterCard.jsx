import './ChapterCard.css'

export default function ChapterCard({ volume = 'Vol. I', title = 'Selected Works', subtitle, stamp }) {
  return (
    <div className="chapter-card">
      <div className="chapter-card-inner">
        <span className="chapter-card-vol mono">{volume}</span>
        <div className="chapter-card-divider" />
        <span className="chapter-card-title display">{title}</span>
        {subtitle && <span className="chapter-card-sub">{subtitle}</span>}
        {stamp && <span className="chapter-card-stamp mono">{stamp}</span>}
      </div>
    </div>
  )
}
