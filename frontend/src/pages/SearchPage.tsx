import { SearchBar } from '../components/SearchBar'
import { SearchResults } from '../components/SearchResults'
import { Topbar } from '../components/Topbar'
import { UploadPanel } from '../components/UploadPanel'
import { VideoBanner } from '../components/VideoBanner'
import { useVideoSession } from '../hooks/useVideoSession'
import { cx } from '../utils/cx'

export function SearchPage() {
  const { state, uploadAndIndex, runSearch, clearSearch, reset } = useVideoSession()
  const { phase, file } = state

  const hasVideo = phase === 'ready' || phase === 'searching' || phase === 'results'
  const isSearching = phase === 'searching'
  const showResults = phase === 'searching' || phase === 'results'

  return (
    <>
      <Topbar title={showResults ? 'Search Results' : 'Discover'} />

      <div
        className={cx(
          showResults
            ? 'flex-1 overflow-y-auto px-7 pt-4'
            : 'flex flex-1 flex-col items-center justify-center overflow-hidden p-6',
          hasVideo ? 'pb-32' : 'pb-24',
        )}
      >
        {phase === 'idle' && (
          <UploadPanel phase="idle" onFileSelected={uploadAndIndex} />
        )}
        {phase === 'uploading' && file && (
          <UploadPanel phase="uploading" file={file} progress={state.uploadProgress} />
        )}
        {phase === 'indexing' && file && (
          <UploadPanel phase="indexing" file={file} />
        )}
        {showResults && (
          <SearchResults
            results={state.results}
            query={state.query}
            loading={isSearching}
          />
        )}
      </div>

      <div className="absolute bottom-5 left-1/2 z-10 flex w-[520px] -translate-x-1/2 flex-col items-stretch gap-2">
        {hasVideo && file && <VideoBanner file={file} onReplace={reset} />}
        <SearchBar
          variant={showResults ? 'floating' : 'inline'}
          placeholder={
            hasVideo
              ? 'Search this for anything...'
              : 'Upload an image or video to start searching...'
          }
          disabled={!hasVideo}
          isSearching={isSearching}
          initialQuery={state.query}
          onSubmit={runSearch}
          onClear={clearSearch}
        />
      </div>
    </>
  )
}
