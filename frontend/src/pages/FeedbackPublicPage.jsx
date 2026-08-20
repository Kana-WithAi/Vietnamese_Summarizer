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

function FeedbackPublicPage() {
  const { lang, t } = useLanguage()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const loadFeedbacks = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await feedbacksApi.list({ page, limit: DEFAULT_PAGE_SIZE })
        const normalized = normalizeFeedbackList(response)
        setItems(normalized)
      } catch (loadError) {
        setItems([])
        setError(loadError?.message || (lang === 'vi' ? 'Không thể tải đánh giá công khai.' : 'Unable to load public reviews.'))
      } finally {
        setLoading(false)
      }
    }

    loadFeedbacks()
  }, [lang, page])

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
            const tags = Array.isArray(item?.tags)
              ? item.tags
              : item?.tag
                ? [item.tag]
                : Array.isArray(item?.criteria)
                  ? item.criteria
                  : []
            const comment = item?.comment || item?.feedback || item?.message || ''

            return (
              <article key={item?.id || item?._id || `${item?.rating || 'review'}-${index}`} className="rounded-3xl border border-surface-border bg-surface-raised p-5 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item?.target_type || 'summary'}</p>
                    <h2 className="mt-2 text-lg font-semibold text-white">{item?.user_name || item?.userName || (lang === 'vi' ? 'Người dùng' : 'User')}</h2>
                  </div>
                  <StarRating value={rating} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags.map((tag, tagIndex) => (
                      <span key={`${tag}-${tagIndex}`} className="rounded-full border border-surface-border bg-surface-base px-2.5 py-1 text-[11px] text-slate-300">
                        {typeof tag === 'string' ? tag : tag?.label || tag?.name || 'Tag'}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-surface-border bg-surface-base px-2.5 py-1 text-[11px] text-slate-400">
                      {lang === 'vi' ? 'Không có tiêu chí' : 'No criteria'}
                    </span>
                  )}
                </div>

                {comment && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{comment}</p>
                )}

                {item?.created_at || item?.createdAt ? (
                  <div className="mt-4 text-xs text-slate-500">
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
          Page {page}
        </span>
        <button
          type="button"
          onClick={() => setPage((current) => current + 1)}
          className="rounded-lg border border-surface-border bg-surface-raised px-4 py-2 text-sm text-slate-300"
        >
          {lang === 'vi' ? 'Tiếp' : 'Next'}
        </button>
      </div>
    </div>
  )
}

export default FeedbackPublicPage
