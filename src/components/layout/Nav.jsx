import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import './Nav.css'

const links = [
  { to: '/', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/journal', label: 'Journal' },
  { to: '/music', label: 'Music' },
]

export default function Nav() {
  const location = useLocation()
  const chapterMap = {
    '/': 'SYS://HOME',
    '/library': 'SYS://LIBRARY',
    '/journal': 'SYS://JOURNAL',
    '/music': 'SYS://MUSIC',
    '/read': 'SYS://READING',
    '/post': 'SYS://JOURNAL',
  }
  const currentPath = Object.keys(chapterMap).find(k =>
    k !== '/' && location.pathname.startsWith(k)
  ) || (location.pathname === '/' ? '/' : null)
  const chapterLabel = chapterMap[currentPath] || 'SYS://HOME'

  return (
    <motion.nav
      className="nav"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <span className="nav-chapter mono">{chapterLabel}</span>
      <div className="nav-links">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`pill ${location.pathname === to ? 'active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>
    </motion.nav>
  )
}
