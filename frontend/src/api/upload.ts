import type { UploadResponse } from '../types'
import { client } from './client'

export async function uploadVideo(
  file: File,
  onProgress: (progress: number) => void,
): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)

  const { data } = await client.post<UploadResponse>('/upload', form, {
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress((event.loaded / event.total) * 100)
      }
    },
  })
  return data
}

export async function getIndexingProgress(): Promise<{ status: string, progress: number, total: number, percent: number }> {
  const { data } = await client.get('/upload/progress')
  return data
}
