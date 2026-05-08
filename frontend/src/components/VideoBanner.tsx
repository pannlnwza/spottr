import { Video } from 'lucide-react'
import { useVideoThumbnail } from '../hooks/useVideoThumbnail'

type Props = {
  file: File
  onReplace: () => void
}

export function VideoBanner({ file, onReplace }: Props) {
  const thumbnail = useVideoThumbnail(file)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] ">
      <div className="aspect-video h-8 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Video className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} />
          </div>
        )}
      </div>
      <span
        className="min-w-0 flex-1 truncate font-medium text-ink"
        title={file.name}
      >
        {file.name}
      </span>
      <button
        type="button"
        onClick={onReplace}
        className="flex-shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[12px] font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-ink"
      >
        Replace
      </button>
    </div>
  )
}
