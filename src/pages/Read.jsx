import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReaderToolbar from '../components/reader/ReaderToolbar'
import EpubReader from '../components/reader/EpubReader'
import PdfReader from '../components/reader/PdfReader'
import { getBook } from '../lib/api'
import './Read.css'

const READER_MODES = {
  dark:  { bg: '#0e1f1c', text: '#f0e2cc', accent: '#c9a847' },
  light: { bg: '#f5ede0', text: '#2a1a0e', accent: '#6b3d1e' },
}

export default function Read() {
  const { id } = useParams()
  const [book, setBook] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [mode, setMode] = useState('dark')
  const [fontSize, setFontSize] = useState(18)
  const [progress, setProgress] = useState(0)

  const themeStyle = READER_MODES[mode]

  // Film grain, scanlines and vignette sit on top of everything — not over book text.
  // overscroll-behavior stops a sideways page-turn swipe being read by the browser
  // as "go back/forward", which would throw you out of the book.
  useEffect(() => {
    const root = document.documentElement
    document.body.classList.add('page-read')
    root.style.overscrollBehavior = 'none'
    return () => {
      document.body.classList.remove('page-read')
      root.style.overscrollBehavior = ''
    }
  }, [])

  useEffect(() => {
    getBook(id)
      .then((data) => {
        setBook(data)
        if (data.signed_url) setFileUrl(data.signed_url)
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="read-loading page">
      <div className="skeleton" style={{ height: '80vh', width: '100%' }} />
    </div>
  )

  if (missing || !book) return (
    <div className="read-missing">
      <p className="serif">This book isn&apos;t on the shelf anymore.</p>
      <Link to="/library" className="pill">Back to the library</Link>
    </div>
  )

  if (book.file_type === 'epub') return (
    <EpubReader url={fileUrl} bookId={id} title={book.title} />
  )

  return (
    <div className="read-page" style={{ background: themeStyle.bg, color: themeStyle.text }}>
      <ReaderToolbar
        mode={mode}
        setMode={setMode}
        fontSize={fontSize}
        setFontSize={setFontSize}
        progress={progress}
      />
      <div className="reader-content">
        <PdfReader url={fileUrl} fontSize={fontSize} onProgress={setProgress} />
      </div>
    </div>
  )
}
