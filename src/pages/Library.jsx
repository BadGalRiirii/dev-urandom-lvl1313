import { Fragment, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SpineMosaic from '../components/library/SpineMosaic'
import { getBooks } from '../lib/api'
import liliesImg from '../assets/lilies.jpg'
import catPaintingImg from '../assets/cat-painting.jpg'
import './Library.css'

// Each EPUB shelf is one painting split across up to SHELF_SIZE spines, filled in
// upload order: the first 7 books make the lilies, the next 7 the cat painting.
// The last painting takes any overflow — add another image here to start a new shelf.
const SHELF_SIZE = 7
const PAINTINGS = [
  { image: liliesImg,      title: 'Lilies' },
  { image: catPaintingImg, title: 'The Cat Painting' },
]

function toShelves(books) {
  const oldestFirst = [...books].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  return PAINTINGS.map((painting, i) => {
    const isLast = i === PAINTINGS.length - 1
    const shelf  = oldestFirst.slice(i * SHELF_SIZE, isLast ? undefined : (i + 1) * SHELF_SIZE)
    return { ...painting, books: shelf.reverse() }   // newest first, as the shelf always showed
  }).filter((shelf) => shelf.books.length > 0)
}

function MosaicDivider() {
  return (
    <div className="mosaic-divider">
      <div className="mosaic-divider-line" />
      <span className="mosaic-divider-mark">· · ·</span>
      <div className="mosaic-divider-line" />
    </div>
  )
}

export default function Library() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBooks()
      .then((data) => { if (data?.length) setBooks(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const epubBooks   = books.filter((b) => b.file_type === 'epub')
  const epubShelves = toShelves(epubBooks)
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

      {!loading && epubShelves.map((shelf, i) => (
        <Fragment key={shelf.title}>
          {i > 0 && <MosaicDivider />}
          <SpineMosaic
            books={shelf.books}
            mosaicImage={shelf.image}
            title={shelf.title}
            type="EPUB"
          />
        </Fragment>
      ))}

      {!loading && epubBooks.length > 0 && pdfBooks.length > 0 && <MosaicDivider />}

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
