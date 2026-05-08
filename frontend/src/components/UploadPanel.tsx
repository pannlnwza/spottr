import { Image as ImageIcon, Loader2, UploadCloud, Video } from 'lucide-react'
import {
  useId,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { cx } from '../utils/cx'

type Props =
  | { phase: 'idle'; onFileSelected: (file: File) => void }
  | { phase: 'uploading'; file: File; progress: number }
  | { phase: 'indexing'; file: File }

const PANEL_WIDTH = 'w-[400px]'

const isAcceptedMedia = (file: File) =>
  file.type.startsWith('image/') || file.type.startsWith('video/')

export function UploadPanel(props: Props) {
  if (props.phase === 'idle') {
    return <IdleZone onFileSelected={props.onFileSelected} />
  }
  if (props.phase === 'uploading') {
    return (
      <ProgressView
        file={props.file}
        progress={props.progress}
        caption="Uploading..."
      />
    )
  }
  return (
    <ProgressView
      file={props.file}
      progress={100}
      caption="Building search index..."
      showSpinner
    />
  )
}

function IdleZone({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputId = useId()

  const accept = (file?: File | null) => {
    if (file && isAcceptedMedia(file)) onFileSelected(file)
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault()
        setIsDragging(false)
        accept(e.dataTransfer.files[0])
      }}
      className={cx(
        'flex cursor-pointer flex-col items-center rounded-full px-8 py-16 transition-colors',
        PANEL_WIDTH,
        isDragging && 'bg-gray-50/60',
      )}
    >
      <UploadCloud
        className={cx(
          'h-10 w-10 transition-colors',
          isDragging ? 'text-indigo-500' : 'text-gray-400',
        )}
        strokeWidth={1.25}
      />
      <h2 className="mt-4 font-display text-base font-semibold text-ink">
        Upload an image or video to begin
      </h2>
      <p className="mt-2 text-[13px] text-gray-500">
        Drop a file here, or{' '}
        <span className="font-medium text-ink">click to browse</span>
      </p>
      <input
        id={inputId}
        type="file"
        accept="image/*,video/*"
        className="sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => accept(e.target.files?.[0])}
      />
    </label>
  )
}

function ProgressView({
  file,
  progress,
  caption,
  showSpinner,
}: {
  file: File
  progress: number
  caption: string
  showSpinner?: boolean
}) {
  const Icon = file.type.startsWith('image/') ? ImageIcon : Video
  return (
    <div className={cx('flex flex-col items-center', PANEL_WIDTH)}>
      <Icon
        className="h-9 w-9 text-gray-400"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <p
        className="mt-4 max-w-full truncate text-sm font-medium text-ink"
        title={file.name}
      >
        {file.name}
      </p>
      <div className="mt-5 flex w-full items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-[width] duration-150 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="flex-shrink-0 text-xs font-medium tabular-nums text-ink">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[12px] text-gray-500">
        {showSpinner && (
          <Loader2
            aria-hidden="true"
            className="h-3 w-3 flex-shrink-0 animate-spin text-indigo-600"
            strokeWidth={2.5}
          />
        )}
        <span>{caption}</span>
      </div>
    </div>
  )
}
