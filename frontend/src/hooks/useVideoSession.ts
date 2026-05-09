import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useState, useEffect } from 'react'
import { searchVideo } from '../api/search'
import { uploadVideo, getIndexingProgress } from '../api/upload'
import type { SearchResult } from '../types'

export type Phase =
  | 'idle'
  | 'uploading'
  | 'indexing'
  | 'ready'
  | 'searching'
  | 'results'

export type SessionState = {
  phase: Phase
  file: File | null
  uploadProgress: number
  indexProgress?: number
  query: string
  results: SearchResult[]
}

const SEARCH_KEY = 'search'

export function useVideoSession() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [submittedQuery, setSubmittedQuery] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [indexProgress, setIndexProgress] = useState<number | undefined>(undefined)

  const uploadMutation = useMutation({
    mutationFn: (newFile: File) => uploadVideo(newFile, setUploadProgress),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [SEARCH_KEY] })
    },
  })

  // Poll for indexing progress
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (uploadMutation.isPending && uploadProgress >= 100) {
      interval = setInterval(async () => {
        try {
          const res = await getIndexingProgress()
          if (res.status === 'processing') {
            setIndexProgress(res.percent)
          }
        } catch (e) {
          // ignore
        }
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
      if (!uploadMutation.isPending) {
        setIndexProgress(undefined)
      }
    }
  }, [uploadMutation.isPending, uploadProgress])

  const searchQuery = useQuery({
    queryKey: [SEARCH_KEY, submittedQuery],
    queryFn: () => searchVideo(submittedQuery),
    enabled: !!submittedQuery && uploadMutation.isSuccess,
    placeholderData: keepPreviousData,
  })

  const phase: Phase = (() => {
    if (uploadMutation.isPending) {
      return uploadProgress >= 100 ? 'indexing' : 'uploading'
    }
    if (!uploadMutation.isSuccess) return 'idle'
    if (!submittedQuery) return 'ready'
    if (searchQuery.isFetching) return 'searching'
    if (searchQuery.data) return 'results'
    return 'ready'
  })()

  const uploadAndIndex = useCallback(
    (newFile: File) => {
      setFile(newFile)
      setSubmittedQuery('')
      setUploadProgress(0)
      uploadMutation.mutate(newFile)
    },
    [uploadMutation],
  )

  const runSearch = useCallback((query: string) => {
    const trimmed = query.trim()
    if (trimmed) setSubmittedQuery(trimmed)
  }, [])

  const clearSearch = useCallback(() => {
    setSubmittedQuery('')
  }, [])

  const reset = useCallback(() => {
    uploadMutation.reset()
    setSubmittedQuery('')
    setUploadProgress(0)
    setIndexProgress(undefined)
    setFile(null)
    queryClient.removeQueries({ queryKey: [SEARCH_KEY] })
  }, [queryClient, uploadMutation])

  const state: SessionState = {
    phase,
    file,
    uploadProgress,
    indexProgress,
    query: submittedQuery,
    results: searchQuery.data?.results ?? [],
  }

  return { state, uploadAndIndex, runSearch, clearSearch, reset }
}
