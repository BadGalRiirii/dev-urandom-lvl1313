import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReaderToolbar from '../components/reader/ReaderToolbar'
import EpubReader from '../components/reader/EpubReader'
import PdfReader from '../components/reader/PdfReader'
import { getBook } from '../lib/api'
import { supabase } from '../lib/supabase'

import { CottageCoreMeta, drawCottageCore } from '../components/reader/themes/CottageCore'
import { MidnightForestMeta, drawMidnightForest } from '../components/reader/themes/MidnightForest'
import { SakuraBloomMeta, drawSakuraBloom } from '../components/reader/themes/SakuraBloom'
import { WisteriaKiramanMeta, drawWisteriaKiraman } from '../components/reader/themes/WisteriaKiraman'
import { ScholarInkMeta, drawScholarInk } from '../components/reader/themes/ScholarInk'
import { CyberpunkMeta, drawCyberpunk } from '../components/reader/themes/Cyberpunk'

import './Read.css'

const THEMES = {
  cottage:  { meta: CottageCoreMeta,    draw: drawCottageCore },
  midnight: { meta: MidnightForestMeta, draw: drawMidnightForest },
  sakura:   { meta: SakuraBloomMeta,    draw: drawSakuraBloom },
  wisteria: { meta: WisteriaKiramanMeta,draw: drawWisteriaKiraman },
  scholar:  { meta: ScholarInkMeta,     draw: drawScholarInk },
  cyberpunk:{ meta: CyberpunkMeta,      draw: drawCyberpunk },
}

export default function Read() {
  const { id } = useParams()
  const [book, setBook] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [themeId, setThemeId] = useState('cottage')
  const [fontSize, setFontSize] = useState(18)
  const [progress, setProgress] = useState(0)
  const canvasRef = useRef(null)
  const tickRef = useRef(0)
  const rafRef = useRef(null)

  const theme = THEMES[themeId] || THEMES.cottage

  useEffect(() => {
    getBook(id)
      .then((data) => {
        setBook(data)
        if (data.signed_url) setFileUrl(data.signed_url)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  // Canvas theme animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const loop = () => {
      tickRef.current++
      theme.draw(ctx, canvas.width, canvas.height, tickRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [themeId])

  // Save progress
  useEffect(() => {
    if (!book || !progress) return
    const t = setTimeout(() => {
      supabase.from('books').update({ progress, current_page: Math.round(progress * (book.total_pages || 100)) })
        .eq('id', id).then(() => {})
    }, 2000)
    return () => clearTimeout(t)
  }, [progress, book, id])

  const meta = theme.meta

  if (loading) return (
    <div className="read-loading page">
      <div className="skeleton" style={{ height: '80vh', width: '100%' }} />
    </div>
  )

  return (
    <div className="read-page" style={{ '--reader-bg': meta.bg, '--reader-text': meta.text, '--reader-accent': meta.accent }}>
      {/* Animated background canvas */}
      <canvas ref={canvasRef} className="reader-canvas" />
      <div className="reader-canvas-overlay" />

      <ReaderToolbar
        theme={themeId}
        setTheme={setThemeId}
        fontSize={fontSize}
        setFontSize={setFontSize}
        progress={progress}
      />

      {/* No key={themeId} — theme changes update in-place via effects, never remount */}
      <div className="reader-content">
        {book?.file_type === 'epub' ? (
          <EpubReader
            url={fileUrl}
            fontSize={fontSize}
            themeStyle={meta}
            onProgress={setProgress}
          />
        ) : (
          <PdfReader
            url={fileUrl}
            fontSize={fontSize}
            onProgress={setProgress}
          />
        )}
      </div>

    </div>
  )
}
