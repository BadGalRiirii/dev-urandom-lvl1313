import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SpineMosaic from '../components/library/SpineMosaic'
import { getBooks } from '../lib/api'
import liliesImg from '../assets/lilies.jpg'
import catPaintingImg from '../assets/cat-painting.jpg'
import './Library.css'

export default function Library() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBooks()
      .then((data) => { if (data?.length) setBooks(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const epubBooks = books.filter((b) => b.file_type === 'epub')
  const pdfBooks  = books.filter((b) => b.file_type === 'pdf')

  return (
    <div className="library-page page">
      <div className="library-header">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="library-eyebrow mono">Chapter 02</div>
          <h1 className="library-title display">The Library</h1>
          <p className="library-sub serif">every spine tells a story</p>
        </motion.div>
      </div>

      {loading && (
        <div className="library-loading">
          <div className="skeleton" style={{ height: 400, width: '70%', margin: '0 auto' }} />
        </div>
      )}

      {!loading && books.length === 0 && (
        <div className="library-empty mono">
          No books in the archive yet — upload some via /admin
        </div>
      )}

      {!loading && epubBooks.length > 0 && (
        <SpineMosaic
          books={epubBooks}
          mosaicImage={liliesImg}
          title="Lilies"
          type="EPUB"
        />
      )}

      {!loading && epubBooks.length > 0 && pdfBooks.length > 0 && (
        <div className="mosaic-divider">
          <div className="mosaic-divider-line" />
          <span className="mosaic-divider-mark">· · ·</span>
          <div className="mosaic-divider-line" />
        </div>
      )}

      {!loading && pdfBooks.length > 0 && (
        <SpineMosaic
          books={pdfBooks}
          mosaicImage={catPaintingImg}
          title="The Cat Painting"
          type="PDF"
        />
      )}
    </div>
  )
}
