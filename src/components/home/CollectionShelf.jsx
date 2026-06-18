import { useNavigate } from 'react-router-dom'
import wisteria from '../../assets/wisteria.jpg'
import lilypods from '../../assets/lilypods.png'
import cdImg   from '../../assets/cd.png'
import './CollectionShelf.css'

const ITEMS = [
  {
    id:    'library',
    to:    '/library',
    label: 'Library',
    sub:   'Vol. I',
    num:   'I',
    img:   wisteria,
    type:  'book',
  },
  {
    id:    'journal',
    to:    '/journal',
    label: 'Journal',
    sub:   'Notes',
    num:   'II',
    img:   lilypods,
    type:  'book',
  },
  {
    id:    'music',
    to:    '/music',
    label: 'Music',
    sub:   'Archive',
    num:   'III',
    img:   cdImg,
    type:  'vinyl',
  },
]

export default function CollectionShelf() {
  const navigate = useNavigate()

  return (
    <div className="cshelf" role="navigation" aria-label="Collection">
      {ITEMS.map(({ id, to, label, sub, num, img, type }) => (
        <button
          key={id}
          className={`cshelf-item cshelf-${type}`}
          onClick={() => navigate(to)}
          aria-label={`Open ${label}`}
        >
          <img src={img} alt="" className="cshelf-cover" draggable={false} />

          {/* Inner Art Nouveau frame lines */}
          <span className="cshelf-frame" aria-hidden="true" />

          {/* Spine illusion on left edge */}
          {type === 'book' && <span className="cshelf-spine" aria-hidden="true" />}

          {/* Bottom label panel */}
          <div className="cshelf-label-panel">
            <span className="cshelf-num" aria-hidden="true">{num}</span>
            <span className="cshelf-name">{label}</span>
            <span className="cshelf-sub">{sub}</span>
          </div>

          {/* Corner ornament */}
          <span className="cshelf-pip" aria-hidden="true">✦</span>
        </button>
      ))}
    </div>
  )
}
