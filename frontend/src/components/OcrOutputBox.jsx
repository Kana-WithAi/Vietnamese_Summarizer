import React, { useMemo, useState } from 'react'

const getNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const getTextFromBlock = (block) => {
  if (typeof block === 'string') return block.trim()
  if (!block || typeof block !== 'object') return ''

  const textCandidates = [
    block?.text,
    block?.content,
    block?.value,
    block?.output_text,
    block?.outputText,
    block?.extracted_text,
    block?.extractedText,
    block?.ocr_text,
    block?.ocrText,
    block?.raw_text,
    block?.rawText,
    block?.label,
  ]

  for (const candidate of textCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return ''
}

const getConfidence = (block) => {
  if (!block || typeof block !== 'object') return null
  const raw =
    block?.confidence ??
    block?.score ??
    block?.prob ??
    block?.probability ??
    block?.conf ??
    block?.accuracy ??
    null

  if (raw === null || raw === undefined) return null
  const num = Number(raw)
  if (!Number.isFinite(num)) return null
  return num > 1 && num <= 100 ? num / 100 : Math.max(0, Math.min(1, num))
}

const getBox = (block) => {
  if (!block || typeof block !== 'object') {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const rawBox =
    block?.bounding_box ||
    block?.boundingBox ||
    block?.box ||
    block?.bbox ||
    block?.rect ||
    block?.polygon ||
    block?.points ||
    block?.bounds ||
    block?.location ||
    block?.coords ||
    {}

  // 1. Array format: 4-point polygon [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
  if (Array.isArray(rawBox) && rawBox.length === 4 && Array.isArray(rawBox[0])) {
    const xs = rawBox.map((pt) => getNumber(pt[0]))
    const ys = rawBox.map((pt) => getNumber(pt[1]))
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    return {
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    }
  }

  // 2. Array format: [x, y, w, h] or [x1, y1, x2, y2]
  if (Array.isArray(rawBox) && rawBox.length >= 4) {
    const n0 = getNumber(rawBox[0])
    const n1 = getNumber(rawBox[1])
    const n2 = getNumber(rawBox[2])
    const n3 = getNumber(rawBox[3])

    if (n2 > n0 && n3 > n1 && n2 - n0 > 0 && n3 - n1 > 0 && n0 >= 0 && n1 >= 0) {
      return { x: n0, y: n1, width: n2 - n0, height: n3 - n1 }
    }
    return { x: n0, y: n1, width: Math.max(0, n2), height: Math.max(0, n3) }
  }

  // 3. Object format
  const x = getNumber(
    rawBox?.x ?? rawBox?.left ?? rawBox?.xmin ?? rawBox?.x1 ?? rawBox?.xMin ?? 0,
  )
  const y = getNumber(
    rawBox?.y ?? rawBox?.top ?? rawBox?.ymin ?? rawBox?.y1 ?? rawBox?.yMin ?? 0,
  )

  let width = getNumber(rawBox?.width ?? rawBox?.w ?? 0)
  if (!width) {
    const right = rawBox?.right ?? rawBox?.xmax ?? rawBox?.x2 ?? rawBox?.xMax
    if (right !== undefined) {
      width = Math.max(0, getNumber(right) - x)
    }
  }

  let height = getNumber(rawBox?.height ?? rawBox?.h ?? 0)
  if (!height) {
    const bottom = rawBox?.bottom ?? rawBox?.ymax ?? rawBox?.y2 ?? rawBox?.yMax
    if (bottom !== undefined) {
      height = Math.max(0, getNumber(bottom) - y)
    }
  }

  return { x, y, width, height }
}

const flattenBlocks = (value, seen = new WeakSet()) => {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenBlocks(item, seen))
  }

  if (typeof value !== 'object') {
    return []
  }

  if (seen.has(value)) {
    return []
  }

  seen.add(value)

  const blocks = []

  if (Array.isArray(value.blocks)) {
    blocks.push(...flattenBlocks(value.blocks, seen))
  }

  if (Array.isArray(value.pages)) {
    blocks.push(...flattenBlocks(value.pages, seen))
  }

  if (Array.isArray(value.lines)) {
    blocks.push(...flattenBlocks(value.lines, seen))
  }

  if (Array.isArray(value.paragraphs)) {
    blocks.push(...flattenBlocks(value.paragraphs, seen))
  }

  if (Array.isArray(value.items)) {
    blocks.push(...flattenBlocks(value.items, seen))
  }

  if (Array.isArray(value.results)) {
    blocks.push(...flattenBlocks(value.results, seen))
  }

  const text = getTextFromBlock(value)
  const box = getBox(value)

  const hasLayoutStructure = Boolean(
    value.bounding_box ||
      value.boundingBox ||
      value.box ||
      value.bbox ||
      value.rect ||
      value.polygon ||
      value.points,
  )

  if ((text || hasLayoutStructure) && (box.width > 0 || box.height > 0 || text)) {
    blocks.push({
      ...value,
      text,
      bounding_box: box,
      confidence: getConfidence(value),
    })
  }

  for (const [k, nestedValue] of Object.entries(value)) {
    if (
      nestedValue &&
      typeof nestedValue === 'object' &&
      !['bounding_box', 'boundingBox', 'box', 'bbox', 'polygon', 'points', 'rect'].includes(k)
    ) {
      blocks.push(...flattenBlocks(nestedValue, seen))
    }
  }

  return blocks
}

// Stable 2-pass line grouping sort for natural reading order
const sortBlocksInReadingOrder = (blocks) => {
  if (!blocks || !blocks.length) return []

  const items = blocks.map((b) => ({
    block: b,
    box: getBox(b),
  }))

  // Sort by Y position top-to-bottom
  items.sort((a, b) => a.box.y - b.box.y)

  const result = []
  let currentLine = []
  let currentLineY = -1
  let currentLineHeight = 20

  for (const item of items) {
    if (currentLine.length === 0) {
      currentLine.push(item)
      currentLineY = item.box.y
      currentLineHeight = Math.max(12, item.box.height || 20)
    } else {
      const isSameLine = Math.abs(item.box.y - currentLineY) <= currentLineHeight * 0.6
      if (isSameLine) {
        currentLine.push(item)
      } else {
        currentLine.sort((a, b) => a.box.x - b.box.x)
        result.push(...currentLine.map((i) => i.block))
        currentLine = [item]
        currentLineY = item.box.y
        currentLineHeight = Math.max(12, item.box.height || 20)
      }
    }
  }

  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.box.x - b.box.x)
    result.push(...currentLine.map((i) => i.block))
  }

  return result
}

export const OcrOutputBox = ({ ocrData, isLoading, t }) => {
  // ALL HOOKS DECLARED UNCONDITIONALLY AT TOP LEVEL (Strict React Rules of Hooks compliance)
  const [viewMode, setViewMode] = useState('layout') // 'layout' | 'flow'
  const [autoFitAndCenter, setAutoFitAndCenter] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [copiedId, setCopiedId] = useState(null)
  const [allCopied, setAllCopied] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const payload = ocrData?.payload || null
  const dimensions = ocrData?.dimensions || null

  const nestedBlocks = useMemo(() => {
    if (!payload) return []
    return flattenBlocks(payload)
  }, [payload])

  const validBlocks = useMemo(() => {
    if (!nestedBlocks.length) return []
    const seenMap = new Map()
    const result = []

    nestedBlocks.forEach((block, idx) => {
      const text = getTextFromBlock(block)
      const box = getBox(block)
      if (!text && box.width <= 0 && box.height <= 0) return

      const key = `${text}::${box.x}::${box.y}::${box.width}::${box.height}`
      if (!seenMap.has(key)) {
        seenMap.set(key, true)
        result.push({
          ...block,
          _index: idx,
          text,
          box,
          confidence: getConfidence(block),
        })
      }
    })

    return result
  }, [nestedBlocks])

  const sortedFlowBlocks = useMemo(() => {
    return sortBlocksInReadingOrder(validBlocks)
  }, [validBlocks])

  const textContent = useMemo(() => {
    if (!payload) return ''
    return (
      payload?.text ||
      payload?.full_text ||
      payload?.fullText ||
      payload?.content ||
      payload?.data?.text ||
      payload?.data?.full_text ||
      sortedFlowBlocks.map((b) => b.text).filter(Boolean).join('\n\n') ||
      ''
    )
  }, [payload, sortedFlowBlocks])

  // Smart Coordinate Normalization & Auto-fit Metrics
  const layoutMetrics = useMemo(() => {
    if (!validBlocks.length) {
      return {
        pageWidth: 1000,
        pageHeight: 1000,
        aspectRatio: '1 / 1',
        blocks: [],
        minX: 0,
        maxX: 1000,
        minY: 0,
        maxY: 1000,
        contentWidth: 1000,
        contentHeight: 1000,
      }
    }

    const minX = Math.min(...validBlocks.map((b) => b.box.x))
    const maxX = Math.max(...validBlocks.map((b) => b.box.x + b.box.width), 1)
    const minY = Math.min(...validBlocks.map((b) => b.box.y))
    const maxY = Math.max(...validBlocks.map((b) => b.box.y + b.box.height), 1)

    const contentWidth = Math.max(1, maxX - minX)
    const contentHeight = Math.max(1, maxY - minY)

    const isRatio = maxX <= 1.05 && maxY <= 1.05
    const isPercent = !isRatio && maxX <= 105 && maxY <= 105 && !payload?.page_width
    const isLayoutLM =
      !isRatio && !isPercent && maxX <= 1005 && maxY <= 1005 && !payload?.page_width && !dimensions?.width

    let baseWidth = 1000
    let baseHeight = 1000

    if (isRatio) {
      baseWidth = 1
      baseHeight = 1
    } else if (isPercent) {
      baseWidth = 100
      baseHeight = 100
    } else if (isLayoutLM) {
      baseWidth = 1000
      baseHeight = 1000
    } else {
      const explicitW = getNumber(payload?.page_width ?? payload?.pageWidth ?? payload?.width)
      const explicitH = getNumber(payload?.page_height ?? payload?.pageHeight ?? payload?.height)
      const dimW = getNumber(dimensions?.width)
      const dimH = getNumber(dimensions?.height)

      if (explicitW && explicitW >= maxX) {
        baseWidth = explicitW
        baseHeight = explicitH || maxY || explicitW * 1.414
      } else if (dimW && dimW <= maxX * 1.3 && dimW >= maxX) {
        baseWidth = dimW
        baseHeight = dimH || maxY
      } else {
        baseWidth = Math.max(maxX, 1)
        baseHeight = Math.max(maxY, 1)
      }
    }

    // Centering & Auto-fit calculation
    const paddingX = autoFitAndCenter ? Math.max(baseWidth * 0.04, contentWidth * 0.05) : 0
    const paddingY = autoFitAndCenter ? Math.max(baseHeight * 0.04, contentHeight * 0.05) : 0

    let targetOriginX = 0
    let targetOriginY = 0
    let targetWidth = baseWidth
    let targetHeight = baseHeight

    if (autoFitAndCenter) {
      targetOriginX = Math.max(0, minX - paddingX)
      targetOriginY = Math.max(0, minY - paddingY)
      targetWidth = Math.max(contentWidth + paddingX * 2, 1)
      targetHeight = Math.max(contentHeight + paddingY * 2, 1)
    }

    const processedBlocks = validBlocks.map((block) => {
      const box = block.box

      let leftPct = ((box.x - targetOriginX) / targetWidth) * 100
      let topPct = ((box.y - targetOriginY) / targetHeight) * 100
      let widthPct = (box.width / targetWidth) * 100
      let heightPct = (box.height / targetHeight) * 100

      leftPct = Math.max(0, Math.min(leftPct, 98))
      topPct = Math.max(0, Math.min(topPct, 98))
      widthPct = Math.max(widthPct, 2)
      heightPct = Math.max(heightPct, 1.5)

      return {
        ...block,
        style: {
          left: `${leftPct.toFixed(2)}%`,
          top: `${topPct.toFixed(2)}%`,
          width: `${widthPct.toFixed(2)}%`,
          height: `${heightPct.toFixed(2)}%`,
        },
      }
    })

    return {
      pageWidth: targetWidth,
      pageHeight: targetHeight,
      aspectRatio: `${targetWidth} / ${targetHeight}`,
      blocks: processedBlocks,
      minX,
      maxX,
      minY,
      maxY,
      contentWidth,
      contentHeight,
    }
  }, [validBlocks, payload, dimensions, autoFitAndCenter])

  const query = searchQuery.trim().toLowerCase()
  const displayBlocks = useMemo(() => {
    if (!query) return layoutMetrics.blocks
    return layoutMetrics.blocks.map((b) => ({
      ...b,
      isMatch: b.text.toLowerCase().includes(query),
    }))
  }, [layoutMetrics.blocks, query])

  const displayFlowBlocks = useMemo(() => {
    if (!query) return sortedFlowBlocks
    return sortedFlowBlocks.map((b) => ({
      ...b,
      isMatch: b.text.toLowerCase().includes(query),
    }))
  }, [sortedFlowBlocks, query])

  const totalWords = useMemo(() => {
    return validBlocks.reduce((acc, b) => acc + (b.text.split(/\s+/).filter(Boolean).length || 0), 0)
  }, [validBlocks])

  const avgConfidence = useMemo(() => {
    const scores = validBlocks.map((b) => b.confidence).filter((c) => typeof c === 'number')
    if (!scores.length) return null
    const sum = scores.reduce((a, b) => a + b, 0)
    return (sum / scores.length) * 100
  }, [validBlocks])

  const handleCopySingleBlock = (text, id) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleCopyAll = () => {
    const fullText = sortedFlowBlocks.map((b) => b.text).filter(Boolean).join('\n\n') || textContent
    if (!fullText) return
    navigator.clipboard.writeText(fullText)
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 2000)
  }

  const getConfidenceBadgeColor = (conf) => {
    if (conf === null || conf === undefined) return 'bg-slate-700/80 text-slate-300'
    const pct = conf <= 1 ? conf * 100 : conf
    if (pct >= 90) return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
    if (pct >= 75) return 'bg-amber-500/20 border-amber-500/40 text-amber-300'
    return 'bg-rose-500/20 border-rose-500/40 text-rose-300'
  }

  // --- CONDITIONAL RENDERS AFTER ALL HOOKS ---
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-4 flex h-12 w-12 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-full bg-accent/20" />
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
        <p className="text-sm font-medium text-slate-300">
          {t?.('ocr.loading') || 'Đang trích xuất OCR...'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Phân tích cấu trúc hình ảnh và nhận diện văn bản...
        </p>
      </div>
    )
  }

  if (!ocrData) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center text-slate-500">
        <div className="mb-3 rounded-2xl border border-surface-border/40 bg-surface-base/40 p-4 text-3xl">
          📄
        </div>
        <p className="text-sm">{t?.('ocr.empty') || 'Kết quả OCR sẽ hiển thị ở đây...'}</p>
      </div>
    )
  }

  if (!validBlocks.length && textContent) {
    return (
      <div className="flex h-full min-h-[450px] max-h-[700px] flex-col rounded-xl bg-surface-base/40 p-4">
        <div className="mb-3 flex items-center justify-between border-b border-surface-border/40 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Văn bản nhận diện (Plain Text)
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(textContent)
              setAllCopied(true)
              setTimeout(() => setAllCopied(false), 2000)
            }}
            className="rounded-lg border border-surface-border bg-surface-base px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-accent hover:text-white"
          >
            {allCopied ? (t?.('ocr.copied') || 'Đã sao chép!') : (t?.('ocr.copyAll') || 'Sao chép toàn bộ')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">
          {textContent}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[500px] flex-col rounded-2xl border border-surface-border bg-slate-950/70 shadow-2xl backdrop-blur-xl">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border/60 bg-surface-raised/80 px-4 py-3">
        {/* Left: View Mode Pills & Stats */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-xl border border-surface-border bg-surface-base/80 p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('layout')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === 'layout'
                  ? 'bg-accent text-surface-base shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Xem bản dựng vị trí bounding box"
            >
              <span>📐</span>
              <span>{t?.('ocr.viewLayout') || 'Bản dựng vị trí'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flow')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === 'flow'
                  ? 'bg-accent text-surface-base shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Xem theo luồng văn bản đọc liền mạch"
            >
              <span>📄</span>
              <span>{t?.('ocr.viewFlow') || 'Đọc liền mạch'}</span>
            </button>
          </div>

          {/* Stats Badges */}
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="rounded-md border border-surface-border bg-surface-base/60 px-2 py-0.5 text-[11px] font-medium text-slate-300">
              {validBlocks.length} {t?.('ocr.blocksCount') || 'khối'}
            </span>
            <span className="rounded-md border border-surface-border bg-surface-base/60 px-2 py-0.5 text-[11px] font-medium text-slate-400">
              {totalWords} từ
            </span>
            {avgConfidence !== null && (
              <span
                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${getConfidenceBadgeColor(
                  avgConfidence / 100,
                )}`}
                title="Độ tin cậy OCR trung bình"
              >
                {avgConfidence.toFixed(1)}% độ chính xác
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls (Search, Auto-Fit, Zoom, Copy All) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t?.('ocr.searchBlocks') || 'Tìm trong OCR...'}
              className="w-32 rounded-lg border border-surface-border bg-surface-base px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:w-44 focus:border-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Auto-Fit / Center Toggle */}
          {viewMode === 'layout' && (
            <button
              type="button"
              onClick={() => setAutoFitAndCenter((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                autoFitAndCenter
                  ? 'border-accent/60 bg-accent/15 text-accent'
                  : 'border-surface-border bg-surface-base text-slate-400 hover:text-slate-200'
              }`}
              title="Tối ưu căn giữa và mở rộng khối văn bản để loại bỏ khoảng trống thừa bên phải"
            >
              <span>{autoFitAndCenter ? '⚖️ Căn giữa: Bật' : '⚖️ Căn giữa: Tắt'}</span>
            </button>
          )}

          {/* Zoom Controls (Layout view) */}
          {viewMode === 'layout' && (
            <div className="flex items-center rounded-lg border border-surface-border bg-surface-base p-0.5">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                className="px-1.5 py-0.5 text-xs text-slate-400 transition hover:text-white"
                title={t?.('ocr.zoomOut') || 'Thu nhỏ'}
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 hover:text-white"
                title={t?.('ocr.resetZoom') || 'Đặt lại xem'}
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
                className="px-1.5 py-0.5 text-xs text-slate-400 transition hover:text-white"
                title={t?.('ocr.zoomIn') || 'Phóng to'}
              >
                +
              </button>
            </div>
          )}

          {/* Copy All Button */}
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-surface-base shadow-sm transition hover:opacity-90 active:scale-95"
          >
            <span>{allCopied ? '✓' : '📋'}</span>
            <span>{allCopied ? (t?.('ocr.copied') || 'Đã chép!') : (t?.('ocr.copyAll') || 'Sao chép')}</span>
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <div className="relative flex-1 overflow-auto p-4 sm:p-6">
        {viewMode === 'layout' ? (
          /* ======================================================== */
          /* MODE 1: VISUAL LAYOUT CANVAS (BALANCED & AUTO-SCALED)   */
          /* ======================================================== */
          <div className="flex min-h-full items-center justify-center">
            <div
              className="relative mx-auto w-full max-w-4xl rounded-2xl border border-surface-border/80 bg-slate-900/90 p-2 shadow-2xl transition-transform duration-150"
              style={{
                aspectRatio: layoutMetrics.aspectRatio || '1 / 1',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
              }}
            >
              {/* Document Page Canvas */}
              <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-950/90 shadow-inner">
                {/* Background Grid Pattern for canvas alignment */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
                    backgroundSize: '20px 20px',
                  }}
                />

                {displayBlocks.map((block, index) => {
                  const isHovered = hoveredIndex === index
                  const isMatch = block.isMatch
                  const confidence = block.confidence
                  const text = block.text

                  if (!text && block.box.width <= 0 && block.box.height <= 0) {
                    return null
                  }

                  const isDimmed = query && !isMatch

                  return (
                    <div
                      key={`block-${block._index ?? index}`}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => handleCopySingleBlock(text, index)}
                      className={`group absolute flex cursor-pointer items-center justify-start overflow-hidden rounded-[3px] border px-1 py-0.5 text-slate-100 transition-all duration-150 ${
                        isMatch
                          ? 'z-30 border-amber-400 bg-amber-500/25 ring-2 ring-amber-400/50'
                          : isHovered
                            ? 'z-20 border-accent bg-accent/20 shadow-lg shadow-accent/20 ring-1 ring-accent'
                            : isDimmed
                              ? 'border-slate-800/40 bg-slate-900/40 opacity-25'
                              : 'border-slate-700/50 bg-slate-800/40 hover:border-accent/80 hover:bg-slate-800/80'
                      }`}
                      style={{
                        ...block.style,
                        fontSize: 'clamp(10px, 1.25vw, 15px)',
                        lineHeight: 1.2,
                      }}
                      title={
                        confidence !== null
                          ? `Độ chính xác: ${(confidence * 100).toFixed(0)}% (Click để sao chép)`
                          : 'Click để sao chép'
                      }
                    >
                      <span className="truncate select-none font-sans text-xs font-medium">
                        {text}
                      </span>

                      {/* Tooltip on Hover */}
                      {isHovered && (
                        <div className="pointer-events-none absolute -top-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-surface-border bg-slate-900/95 px-2 py-1 text-[10px] font-semibold text-white shadow-xl backdrop-blur-md">
                          <span>{copiedId === index ? '✓ Đã sao chép' : '📋 Click sao chép'}</span>
                          {confidence !== null && (
                            <span className="text-emerald-400">
                              {(confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* MODE 2: READING FLOW (FULL WIDTH, NO EMPTY MARGINS)    */
          /* ======================================================== */
          <div className="mx-auto max-w-4xl space-y-3">
            {displayFlowBlocks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-border bg-surface-base/30 p-8 text-center text-sm text-slate-400">
                {t?.('ocr.noMatchingBlocks') || 'Không tìm thấy khối văn bản phù hợp.'}
              </div>
            ) : (
              displayFlowBlocks.map((block, index) => {
                const isMatch = block.isMatch
                const confidence = block.confidence
                const text = block.text

                return (
                  <div
                    key={`flow-${block._index ?? index}`}
                    className={`group relative rounded-xl border p-4 transition-all duration-150 ${
                      isMatch
                        ? 'border-amber-500/60 bg-amber-500/10 shadow-lg'
                        : 'border-surface-border/50 bg-surface-base/50 hover:border-surface-border hover:bg-surface-base/80'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 border-b border-surface-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
                          #{index + 1}
                        </span>
                        {confidence !== null && (
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getConfidenceBadgeColor(
                              confidence,
                            )}`}
                          >
                            {(confidence * 100).toFixed(0)}% độ chính xác
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopySingleBlock(text, index)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-surface-elevated hover:text-white"
                        title={t?.('ocr.copyBlock') || 'Sao chép khối này'}
                      >
                        <span>{copiedId === index ? '✓' : '📋'}</span>
                        <span className="text-[11px]">
                          {copiedId === index ? (t?.('ocr.copied') || 'Đã chép') : (t?.('ocr.copyBlock') || 'Sao chép')}
                        </span>
                      </button>
                    </div>

                    <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">
                      {text}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default OcrOutputBox
