import { Heart, MoreVertical, Play } from 'lucide-react'
import type { SearchResult } from '../types'
import { cx } from '../utils/cx'
import { formatTimestamp } from '../utils/format'

type Props = {
  results: SearchResult[]
  query: string
  loading?: boolean
}

const widths = [220, 180, 150, 200, 170, 190, 160, 240, 230, 155, 185, 165]
const ROW_SIZE = 6

export function SearchResults({ results, query, loading }: Props) {
  const rows = chunk(results, ROW_SIZE)

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
      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-1.5">
            {row.map((result, j) => (
              <ResultCard
                key={result.frame_idx}
                result={result}
                position={i * ROW_SIZE + j}
                isLast={j === row.length - 1}
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
  position,
  isLast,
}: {
  result: SearchResult
  position: number
  isLast: boolean
}) {
  const width = widths[position % widths.length]

  return (
    <div
      style={isLast ? undefined : { width }}
      className={cx(
        'group relative h-[200px] flex-shrink-0 cursor-pointer overflow-hidden rounded-md bg-gray-100',
        isLast && 'flex-1',
      )}
    >
      <img
        src={`/api/frame/${result.frame_idx}`}
        alt=""
        className="h-full w-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      <button
        type="button"
        aria-label="Bookmark"
        className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center border-0 bg-transparent text-white"
      >
        <Heart className="h-4 w-4" strokeWidth={2} />
      </button>
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
