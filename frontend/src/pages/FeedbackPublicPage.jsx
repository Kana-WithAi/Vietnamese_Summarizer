import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { feedbacksApi } from '../utils/api'

const DEFAULT_PAGE_SIZE = 12

function StarRating({ value = 0 }) {
  const filled = Math.max(0, Math.min(5, Number(value) || 0))

  return (
    <div className="flex items-center gap-1 text-yellow-400">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 20 20"
          fill={star <= filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.922-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.785.57-1.84-.196-1.54-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.027 8.72c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function normalizeFeedbackList(response) {
  const payload = response?.data || response || {}
  return Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.feedbacks)
      ? payload.feedbacks
      : Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload)
          ? payload
          : []
}

function getFeedbackAuthorName(item, lang = 'vi') {
  const directCandidates = [
    item?.user_name,
    item?.userName,
    item?.full_name,
    item?.fullName,
    item?.name,
    item?.author_name,
    item?.authorName,
    item?.user?.name,
    item?.user?.full_name,
    item?.user?.fullName,
    item?.user?.username,
    item?.author?.name,
    item?.author?.full_name,
    item?.author?.fullName,
    item?.author?.username,
  ]

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  const emailCandidates = [
    item?.user?.email,
    item?.author?.email,
    item?.email,
    item?.user_email,
    item?.userEmail,
  ]

  for (const email of emailCandidates) {
    if (typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim()
      const prefix = cleanEmail.split('@')[0]
      if (prefix) {
        return prefix
      }
      return cleanEmail
    }
  }

  return lang === 'vi' ? 'Khách ẩn danh' : 'Anonymous User'
}

function FeedbackPublicPage() {
  const { lang, t } = useLanguage()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedFeedbackModal, setSelectedFeedbackModal] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadFeedbacks = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await feedbacksApi.list({ page, limit: DEFAULT_PAGE_SIZE })
        if (!isMounted) return
        const normalized = normalizeFeedbackList(response)
        setItems(normalized)
      } catch (loadError) {
        if (!isMounted) return
        setItems([])
        setError(loadError?.message || (lang === 'vi' ? 'Không thể tải đánh giá công khai.' : 'Unable to load public reviews.'))
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadFeedbacks()
    return () => {
      isMounted = false
    }
  }, [page])

  const filteredItems = useMemo(() => {
    if (ratingFilter === 'all') return items
    const target = Number(ratingFilter)
    return items.filter((item) => Number(item?.rating ?? item?.score ?? 0) === target)
  }, [items, ratingFilter])

  const averageRating = useMemo(() => {
    if (!items.length) return 0
    const total = items.reduce((sum, item) => sum + (Number(item?.rating ?? item?.score ?? 0) || 0), 0)
    return total / items.length
  }, [items])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {lang === 'vi' ? 'Cộng đồng' : 'Community'}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">{lang === 'vi' ? 'Đánh giá từ người dùng' : 'User reviews'}</h1>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-base px-4 py-3">
            <div className="text-xs uppercase tracking-wider text-slate-500">{lang === 'vi' ? 'Điểm trung bình' : 'Average rating'}</div>
            <div className="mt-1 flex items-center gap-3">
              <StarRating value={averageRating} />
              <span className="text-lg font-semibold text-white">{averageRating ? averageRating.toFixed(1) : '0.0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="rounded-3xl border border-surface-border bg-surface-raised p-4">
        <div className="flex flex-wrap gap-2">
          {['all', '5', '4', '3', '2', '1'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRatingFilter(option)}
              className={`rounded-full border px-3 py-2 text-sm transition ${
                ratingFilter === option
                  ? 'border-accent bg-accent/15 text-white'
                  : 'border-surface-border bg-surface-base text-slate-300 hover:border-accent/50'
              }`}
            >
              {option === 'all'
                ? (lang === 'vi' ? 'Tất cả' : 'All')
                : `${option} ${lang === 'vi' ? 'sao' : 'stars'}`}
            </button>
          ))}
        </div>
      </div>

      {/* Review List */}
      {loading ? (
        <div className="rounded-3xl border border-surface-border bg-surface-raised p-8 text-center text-slate-300">
          {lang === 'vi' ? 'Đang tải đánh giá...' : 'Loading reviews...'}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">{error}</div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-surface-border bg-surface-raised p-8 text-center text-slate-300">
          {lang === 'vi' ? 'Chưa có đánh giá nào phù hợp.' : 'No reviews match the selected filter.'}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => {
            const rating = Number(item?.rating ?? item?.score ?? 0)
            const rawTargetType = String(item?.target_type || 'summary').toLowerCase()
            const translatedTargetType = t(`feedback.targetTypes.${rawTargetType}`)
            const displayTargetType = translatedTargetType && translatedTargetType !== `feedback.targetTypes.${rawTargetType}`
              ? translatedTargetType
              : rawTargetType.toUpperCase()

            const tags = Array.isArray(item?.tags)
              ? item.tags
              : item?.tag
                ? [item.tag]
                : Array.isArray(item?.criteria)
                  ? item.criteria
                  : []
            const comment = item?.comment || item?.feedback || item?.message || ''
            const isLongComment = comment.length > 130

            return (
              <article key={item?.id || item?._id || `${item?.rating || 'review'}-${index}`} className="flex flex-col justify-between rounded-3xl border border-surface-border bg-surface-raised p-5 shadow-lg shadow-black/10">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{displayTargetType}</p>
                      <h2 className="mt-2 text-lg font-semibold text-white">{getFeedbackAuthorName(item, lang)}</h2>
                    </div>
                    <StarRating value={rating} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.length > 0 ? (
                      tags.map((tag, tagIndex) => {
                        const tagCode = typeof tag === 'string' ? tag : tag?.code || tag?.id || tag?.label || tag?.name || ''
                        const translatedTag = tagCode ? t(`feedback.reasons.${tagCode}`) : ''
                        const displayTag = translatedTag && translatedTag !== `feedback.reasons.${tagCode}`
                          ? translatedTag
                          : typeof tag === 'string'
                            ? tag
                            : tag?.label || tag?.name || 'Tag'

                        return (
                          <span key={`${tagCode || tagIndex}-${tagIndex}`} className="rounded-full border border-surface-border bg-surface-base px-2.5 py-1 text-[11px] text-slate-300">
                            {displayTag}
                          </span>
                        )
                      })
                    ) : (
                      <span className="rounded-full border border-surface-border bg-surface-base px-2.5 py-1 text-[11px] text-slate-400">
                        {lang === 'vi' ? 'Không có tiêu chí' : 'No criteria'}
                      </span>
                    )}
                  </div>

                  {comment && (
                    <div className="mt-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300 line-clamp-3 break-words [overflow-wrap:anywhere]">
                        {comment}
                      </p>
                      {isLongComment && (
                        <button
                          type="button"
                          onClick={() => setSelectedFeedbackModal(item)}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover transition"
                        >
                          <span>{lang === 'vi' ? 'Xem thêm' : 'Read more'}</span>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {item?.created_at || item?.createdAt ? (
                  <div className="mt-4 text-xs text-slate-500 pt-2 border-t border-surface-border/40">
                    {new Date(item.created_at || item.createdAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-3 pb-10">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1}
          className="rounded-lg border border-surface-border bg-surface-raised px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
        >
          {lang === 'vi' ? 'Trước' : 'Previous'}
        </button>
        <span className="flex items-center rounded-lg border border-surface-border bg-surface-raised px-4 py-2 text-sm text-slate-300">
          {lang === 'vi' ? `Trang ${page}` : `Page ${page}`}
        </span>
        <button
          type="button"
          onClick={() => setPage((current) => current + 1)}
          className="rounded-lg border border-surface-border bg-surface-raised px-4 py-2 text-sm text-slate-300"
        >
          {lang === 'vi' ? 'Tiếp' : 'Next'}
        </button>
      </div>

      {/* Review Detail Modal */}
      {selectedFeedbackModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedFeedbackModal(null)}
        >
          <div
            className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-surface-border pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {(() => {
                    const rawType = String(selectedFeedbackModal?.target_type || 'summary').toLowerCase()
                    const trans = t(`feedback.targetTypes.${rawType}`)
                    return trans && trans !== `feedback.targetTypes.${rawType}` ? trans : rawType.toUpperCase()
                  })()}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  {getFeedbackAuthorName(selectedFeedbackModal, lang)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedbackModal(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-surface-elevated hover:text-white transition"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Rating & Date */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <StarRating value={Number(selectedFeedbackModal?.rating ?? selectedFeedbackModal?.score ?? 0)} />
              {selectedFeedbackModal?.created_at || selectedFeedbackModal?.createdAt ? (
                <span className="text-xs text-slate-500">
                  {new Date(selectedFeedbackModal.created_at || selectedFeedbackModal.createdAt).toLocaleDateString(
                    lang === 'vi' ? 'vi-VN' : 'en-US',
                    { year: 'numeric', month: 'short', day: 'numeric' },
                  )}
                </span>
              ) : null}
            </div>

            {/* Criteria Tags */}
            {(() => {
              const modalTags = Array.isArray(selectedFeedbackModal?.tags)
                ? selectedFeedbackModal.tags
                : selectedFeedbackModal?.tag
                  ? [selectedFeedbackModal.tag]
                  : Array.isArray(selectedFeedbackModal?.criteria)
                    ? selectedFeedbackModal.criteria
                    : []
              if (!modalTags.length) return null
              return (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {modalTags.map((tag, tagIdx) => {
                    const tagCode = typeof tag === 'string' ? tag : tag?.code || tag?.id || tag?.label || tag?.name || ''
                    const translatedTag = tagCode ? t(`feedback.reasons.${tagCode}`) : ''
                    const displayTag = translatedTag && translatedTag !== `feedback.reasons.${tagCode}`
                      ? translatedTag
                      : typeof tag === 'string' ? tag : tag?.label || tag?.name || 'Tag'
                    return (
                      <span key={tagIdx} className="rounded-full border border-surface-border bg-surface-base px-2.5 py-1 text-xs text-slate-300">
                        {displayTag}
                      </span>
                    )
                  })}
                </div>
              )
            })()}

            {/* Full Comment */}
            <div className="mt-4 flex-1 overflow-y-auto pr-1 scrollbar-thin">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200 break-words [overflow-wrap:anywhere]">
                {selectedFeedbackModal?.comment || selectedFeedbackModal?.feedback || selectedFeedbackModal?.message || ''}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex justify-end border-t border-surface-border pt-4">
              <button
                type="button"
                onClick={() => setSelectedFeedbackModal(null)}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-surface-base hover:bg-accent-hover transition shadow-lg shadow-accent/20"
              >
                {lang === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeedbackPublicPage
