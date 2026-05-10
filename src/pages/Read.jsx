import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReaderToolbar from '../components/reader/ReaderToolbar'
import EpubReader from '../components/reader/EpubReader'
import PdfReader from '../components/reader/PdfReader'
import { getBook } from '../lib/api'
import { supabase } from '../lib/supabase'
import './Read.css'

const READER_MODES = {
  dark:  { bg: '#010200', text: '#90e090' },
  light: { bg: '#f5f5f0', text: '#1a2010' },
}

export default function Read() {
  const { id } = useParams()
  const [book, setBook] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('dark')
  const [fontSize, setFontSize] = useState(18)
  const [progress, setProgress] = useState(0)

  const themeStyle = READER_MODES[mode]

  useEffect(() => {
    getBook(id)
      .then((data) => {
        setBook(data)
        if (data.signed_url) setFileUrl(data.signed_url)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!book || !progress) return
    const t = setTimeout(() => {
      supabase.from('books').update({ progress, current_page: Math.round(progress * (book.total_pages || 100)) })
        .eq('id', id).then(() => {})
    }, 2000)
    return () => clearTimeout(t)
  }, [progress, book, id])

  if (loading) return (
    <div className="read-loading page">
      <div className="skeleton" style={{ height: '80vh', width: '100%' }} />
    </div>
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
        {book?.file_type === 'epub' ? (
          <EpubReader
            url={fileUrl}
            fontSize={fontSize}
            themeStyle={themeStyle}
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
