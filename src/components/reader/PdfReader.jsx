import { useState, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import './PdfReader.css'

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

export default function PdfReader({ url, onProgress }) {
  const [numPages, setNumPages] = useState(null)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  const pageWidth = Math.min(window.innerWidth - 120, 900)

  const onLoad = ({ numPages: n }) => {
    setNumPages(n)
    onProgress?.(1 / n)
  }

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !numPages) return
    const scrollable = el.scrollHeight - el.clientHeight
    if (scrollable <= 0) return
    onProgress?.(Math.min(el.scrollTop / scrollable, 1))
  }, [numPages, onProgress])

  if (error) {
    return (
      <div className="pdf-reader">
        <div className="pdf-error mono">Could not load PDF: {error}</div>
      </div>
    )
  }

  return (
    <div className="pdf-reader">
      <div className="pdf-scroll" ref={scrollRef} onScroll={onScroll}>
        <Document
          file={url}
          onLoadSuccess={onLoad}
          onLoadError={(e) => setError(e.message)}
          loading={<div className="pdf-loading mono">Loading…</div>}
        >
          {numPages &&
            Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="pdf-page-wrap">
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderTextLayer
                  renderAnnotationLayer
                />
                <span className="pdf-page-label mono">{i + 1}</span>
              </div>
            ))}
        </Document>
      </div>
    </div>
  )
}
