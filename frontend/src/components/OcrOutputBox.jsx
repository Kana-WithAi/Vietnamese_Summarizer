import React from 'react'

const getNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const getTextFromBlock = (block) => {
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
  ]

  for (const candidate of textCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return ''
}

const getBox = (block) => {
  const box = block?.bounding_box || block?.boundingBox || block?.box || {}

  const x = getNumber(box?.x ?? box?.left ?? 0)
  const y = getNumber(box?.y ?? box?.top ?? 0)
  const width = getNumber(box?.width ?? box?.w ?? (box?.right !== undefined ? box.right - x : 0))
  const height = getNumber(box?.height ?? box?.h ?? (box?.bottom !== undefined ? box.bottom - y : 0))

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

  const text = getTextFromBlock(value)
  const box = getBox(value)

  const hasLayoutStructure = Boolean(value.bounding_box || value.boundingBox || value.box)
  if ((text || hasLayoutStructure) && (box.width || box.height || text)) {
    blocks.push({ ...value, text, bounding_box: box })
  }

  for (const nestedValue of Object.values(value)) {
    if (nestedValue && typeof nestedValue === 'object') {
      blocks.push(...flattenBlocks(nestedValue, seen))
    }
  }

  return blocks
}

export const OcrOutputBox = ({ ocrData, isLoading, t }) => {
  if (isLoading) {
    return <div className="p-4 text-center text-slate-400">{t?.('ocr.loading') || 'Extracting OCR...'}</div>
  }

  if (!ocrData) {
    return <div className="p-4 text-slate-500">{t?.('ocr.empty') || 'OCR results will appear here...'}</div>
  }

  const { payload, dimensions } = ocrData
  const nestedBlocks = flattenBlocks(payload)
  const blocks = nestedBlocks.filter((block) => {
    const hasText = Boolean(getTextFromBlock(block))
    const box = getBox(block)
    return hasText || box.width > 0 || box.height > 0
  })

  const textContent =
    payload?.text ||
    payload?.full_text ||
    payload?.fullText ||
    payload?.content ||
    payload?.data?.text ||
    payload?.data?.full_text ||
    ''

  if (!blocks.length && textContent) {
    return (
      <div className="h-full min-h-[500px] max-h-[700px] overflow-y-auto whitespace-pre-wrap p-4 font-sans leading-relaxed text-slate-200">
        {textContent}
      </div>
    )
  }

  const maxBlockX = Math.max(
    ...blocks.map((block) => getBox(block).x + getBox(block).width),
    1,
  )
  const maxBlockY = Math.max(
    ...blocks.map((block) => getBox(block).y + getBox(block).height),
    1,
  )

  const pageWidth =
    getNumber(payload?.page_width ?? payload?.pageWidth, 0) ||
    getNumber(dimensions?.width, 0) ||
    maxBlockX ||
    1
  const pageHeight =
    getNumber(payload?.page_height ?? payload?.pageHeight, 0) ||
    getNumber(dimensions?.height, 0) ||
    maxBlockY ||
    1

  return (
    <div className="h-full min-h-[500px] max-h-[700px] overflow-y-auto rounded-lg bg-slate-900 p-4">
      <div
        className="relative w-full rounded border border-slate-700 bg-slate-800 shadow-lg"
        style={{ aspectRatio: `${pageWidth} / ${pageHeight}` }}
      >
        {blocks.map((block, index) => {
          const box = getBox(block)
          const text = getTextFromBlock(block)

          if (!text && !box.width && !box.height) {
            return null
          }

          const left = ((box.x || 0) / pageWidth) * 100
          const top = ((box.y || 0) / pageHeight) * 100
          const width = ((box.width || 0) / pageWidth) * 100
          const height = ((box.height || 0) / pageHeight) * 100

          const confidence = block?.confidence ?? block?.score ?? 0
          const fontSize = Math.max(10, Math.min(18, height * 1.2))

          return (
            <div
              key={`${block.id || text || 'ocr-block'}-${index}`}
              className="absolute flex items-center overflow-hidden rounded-sm border border-transparent text-slate-100 transition-all hover:border-emerald-400 hover:bg-emerald-500/10"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${Math.max(width, 2)}%`,
                height: `${Math.max(height, 2)}%`,
                fontSize: `${fontSize}px`,
                lineHeight: 1.1,
              }}
              title={`Confidence: ${((confidence || 0) * 100).toFixed(0)}%`}
            >
              {text}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OcrOutputBox
