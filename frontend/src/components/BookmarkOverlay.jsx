import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

const ITEMS_PER_PAGE = 6

const initialBookmarks = [
  { id: 1, title: 'Project Report Q3', time: '2 hours ago' },
  { id: 2, title: 'Meeting Notes', time: '1 day ago' },
  { id: 3, title: 'Article Summary', time: '3 days ago' },
  { id: 4, title: 'Document Review', time: '1 week ago' },
  { id: 5, title: 'Presentation Script', time: '2 weeks ago' },
  { id: 6, title: 'Weekly Reflection', time: '3 weeks ago' },
  { id: 7, title: 'Client Feedback', time: '1 month ago' },
  { id: 8, title: 'Research Highlights', time: '2 months ago' },
]

function BookmarkOverlay({ isOpen, onClose }) {
  const overlayRef = useRef(null)
  const { t } = useLanguage()
  const [bookmarks, setBookmarks] = useState(initialBookmarks)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(bookmarks.length / ITEMS_PER_PAGE))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [bookmarks, page])

  const totalPages = Math.max(1, Math.ceil(bookmarks.length / ITEMS_PER_PAGE))

  const visibleBookmarks = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return bookmarks.slice(start, start + ITEMS_PER_PAGE)
  }, [bookmarks, page])

  const removeBookmark = (id) => {
    setBookmarks((prev) => prev.filter((item) => item.id !== id))
  }

  const clearBookmarks = () => {
    setBookmarks([])
    setPage(1)
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
          style={{ top: '60px', bottom: '48px' }}
        />
      )}

      <div
        ref={overlayRef}
        className={`fixed right-0 z-50 w-1/5 transform transition-transform duration-300 ease-out bg-surface-raised/80 border-l border-surface-border/50 backdrop-blur-xl shadow-2xl shadow-black/30 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ top: '60px', bottom: '48px' }}
      >
        <div className="flex items-center justify-between border-b border-surface-border/30 px-5 py-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            {t('nav.bookmark')}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-surface-base/50 hover:text-slate-200"
            aria-label="Close bookmarks"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {bookmarks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
              No bookmarks yet.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleBookmarks.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex items-center justify-between gap-3 rounded-lg border border-surface-border/20 bg-surface-base/40 p-3 transition hover:border-surface-border/40 hover:bg-surface-base/70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200 transition group-hover:text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v18l-6-4-6 4V4z" />
                      </svg>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBookmark(item.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-surface-base/50 hover:text-red-400"
                      aria-label={`Remove ${item.title}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {bookmarks.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-surface-border/30 px-5 py-3 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-md px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-surface-base/50 hover:text-slate-200"
            >
              Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="rounded-md px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-surface-base/50 hover:text-slate-200"
            >
              Next
            </button>
          </div>
        )}

        <div className="border-t border-surface-border/30 px-5 py-3">
          <button
            type="button"
            onClick={clearBookmarks}
            className="w-full text-left text-xs font-medium text-slate-400 transition hover:text-accent"
          >
            Clear Bookmarks
          </button>
        </div>
      </div>
    </>
  )
}

export default BookmarkOverlay
