import type { SearchResponse } from '../types'
import { client } from './client'

export async function searchVideo(query: string, topK = 18): Promise<SearchResponse> {
  const { data } = await client.get<SearchResponse | { error: string }>('/search', {
    params: { q: query, top_k: topK },
  })
  if ('error' in data) {
    throw new Error(data.error)
  }
  return data
}
