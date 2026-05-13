import { Bookmark, MoreVertical, Play, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Box, SearchResult } from '../types'
import { cx } from '../utils/cx'
import { formatTimestamp } from '../utils/format'

type Props = {
  results: SearchResult[]
  query: string
  loading?: boolean
}

const TARGET_COLUMN_WIDTH = 240
const GAP = 6
const BBOX_FILL = 0.78
const MIN_ASPECT = 0.5
const MAX_ASPECT = 3.0

type Column = {
  cards: { result: SearchResult; height: number }[]
  height: number
}

export function SearchResults({ results, query, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return
    setContainerWidth(node.clientWidth)
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const { columns, columnWidth } = useMemo(
    () => buildColumns(results, containerWidth),
    [results, containerWidth],
  )

  return (
    <div className={cx('transition-opacity', loading && 'opacity-60')}>
      <p className="mb-3 text-[13px] text-gray-500">
        {loading ? (
          <>
            Searching for{' '}
            <span className="font-medium text-ink">&ldquo;{query}&rdquo;</span>
            ...
          </>
        ) : (
          <>
            {results.length} {results.length === 1 ? 'result' : 'results'} for{' '}
            <span className="font-medium text-ink">&ldquo;{query}&rdquo;</span>
          </>
        )}
      </p>
      <div ref={containerRef} className="flex items-start" style={{ gap: GAP }}>
        {columns.map((col, i) => (
          <div
            key={i}
            className="flex flex-col"
            style={{ gap: GAP, width: columnWidth }}
          >
            {col.cards.map(({ result, height }) => (
              <ResultCard
                key={result.frame_idx}
                result={result}
                width={columnWidth}
                height={height}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ResultCard({
  result,
  width,
  height,
}: {
  result: SearchResult
  width: number
  height: number
}) {
  const frameSize = useImageSize(`/api/frame/${result.frame_idx}`)
  // TODO: persist reaction/bookmark to backend (POST /feedback) for model retraining
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null)
  const [bookmarked, setBookmarked] = useState(false)

  return (
    <div
      style={{ width, height }}
      className="group relative flex-shrink-0 cursor-pointer overflow-hidden rounded-md bg-gray-100"
    >
      {frameSize && (
        <FocusedImage
          frameSize={frameSize}
          cardWidth={width}
          cardHeight={height}
          src={`/api/frame/${result.frame_idx}`}
          box={result.box}
        />
      )}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Like"
          aria-pressed={reaction === 'like'}
          onClick={(e) => {
            e.stopPropagation()
            setReaction((r) => (r === 'like' ? null : 'like'))
          }}
          className="flex h-6 w-6 items-center justify-center border-0 bg-transparent text-white opacity-80 hover:opacity-100"
        >
          <ThumbsUp
            className="h-4 w-4"
            strokeWidth={2}
            fill={reaction === 'like' ? 'currentColor' : 'none'}
          />
        </button>
        <button
          type="button"
          aria-label="Dislike"
          aria-pressed={reaction === 'dislike'}
          onClick={(e) => {
            e.stopPropagation()
            setReaction((r) => (r === 'dislike' ? null : 'dislike'))
          }}
          className="flex h-6 w-6 items-center justify-center border-0 bg-transparent text-white opacity-80 hover:opacity-100"
        >
          <ThumbsDown
            className="h-4 w-4"
            strokeWidth={2}
            fill={reaction === 'dislike' ? 'currentColor' : 'none'}
          />
        </button>
        <button
          type="button"
          aria-label="Bookmark"
          aria-pressed={bookmarked}
          onClick={(e) => {
            e.stopPropagation()
            setBookmarked((b) => !b)
          }}
          className="flex h-6 w-6 items-center justify-center border-0 bg-transparent text-white opacity-80 hover:opacity-100"
        >
          <Bookmark
            className="h-4 w-4"
            strokeWidth={2}
            fill={bookmarked ? 'currentColor' : 'none'}
          />
        </button>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/15 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
          <Play className="h-3.5 w-3.5 text-ink" fill="currentColor" strokeWidth={0} />
        </div>
      </div>
      <div className="absolute right-0 bottom-0 left-0 flex items-center justify-between bg-gradient-to-b from-transparent to-black/70 px-2 py-1.5 text-[10px] text-white">
        <span className="font-medium tabular-nums">
          {formatTimestamp(result.timestamp)}
        </span>
        <button
          type="button"
          aria-label="More options"
          className="flex items-center justify-center border-0 bg-transparent text-white opacity-70 hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

function FocusedImage({
  frameSize,
  cardWidth,
  cardHeight,
  src,
  box,
}: {
  frameSize: { w: number; h: number }
  cardWidth: number
  cardHeight: number
  src: string
  box: Box
}) {
  const scale = Math.min(
    (cardHeight * BBOX_FILL) / Math.max(box.h, 1),
    (cardWidth * BBOX_FILL) / Math.max(box.w, 1),
  )
  const imgW = frameSize.w * scale
  const imgH = frameSize.h * scale
  const boxCenterX = (box.x + box.w / 2) * scale
  const boxCenterY = (box.y + box.h / 2) * scale

  return (
    <img
      src={src}
      alt=""
      style={{
        position: 'absolute',
        width: imgW,
        height: imgH,
        left: cardWidth / 2 - boxCenterX,
        top: cardHeight / 2 - boxCenterY,
        maxWidth: 'none',
      }}
    />
  )
}

function buildColumns(
  results: SearchResult[],
  containerWidth: number,
): { columns: Column[]; columnWidth: number } {
  if (containerWidth <= 0 || results.length === 0) {
    return { columns: [], columnWidth: 0 }
  }

  const columnCount = Math.max(
    1,
    Math.floor((containerWidth + GAP) / (TARGET_COLUMN_WIDTH + GAP)),
  )
  const columnWidth = (containerWidth - (columnCount - 1) * GAP) / columnCount

  const columns: Column[] = Array.from({ length: columnCount }, () => ({
    cards: [],
    height: 0,
  }))

  for (const result of results) {
    const aspect = clamp(
      result.box.w / Math.max(result.box.h, 1),
      MIN_ASPECT,
      MAX_ASPECT,
    )
    const cardHeight = columnWidth / aspect

    let shortest = 0
    for (let i = 1; i < columns.length; i++) {
      if (columns[i].height < columns[shortest].height) shortest = i
    }
    columns[shortest].cards.push({ result, height: cardHeight })
    columns[shortest].height += cardHeight + GAP
  }

  return { columns, columnWidth }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function useImageSize(src: string) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (!cancelled) {
        setSize({ w: img.naturalWidth, h: img.naturalHeight })
      }
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])
  return size
}
