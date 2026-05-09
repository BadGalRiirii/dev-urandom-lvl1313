import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import './Ticker.css'

const DEFAULT_ITEMS = [
  'Every thing I loved',
  '— Vol. I —',
  'riri/dev/urandom/lvl1313',
  '— Selected Works —',
  'Books / Films / Music / Words',
  '— Chapter 01 —',
  'The Archive is open',
]

export default function Ticker({ items = DEFAULT_ITEMS }) {
  const doubled = [...items, ...items]

  return (
    <div className="ticker-wrap">
      <div className="ticker-label mono">NOW PLAYING</div>
      <div className="ticker-track">
        <motion.div
          className="ticker-inner"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        >
          {doubled.map((item, i) => (
            <span key={i} className="ticker-item mono">
              {item}
              <span className="ticker-sep">◆</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
