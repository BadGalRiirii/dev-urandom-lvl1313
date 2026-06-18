import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import './Ticker.css'

const DEFAULT_ITEMS = [
  'Every Thing I Loved',
  'Vol. I',
  'riri / dev / urandom',
  'Selected Works',
  'Books · Films · Music · Words',
  'Chapter 01',
  'The Archive is Open',
  'Arcane © Riot Games / Fortiche',
  'Art Nouveau · Fan Illustrations',
  'Caitlyn · Jinx · Piltover & Zaun',
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
              <span className="ticker-sep">✦</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
