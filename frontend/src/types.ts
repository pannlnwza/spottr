export type Box = {
  x: number
  y: number
  w: number
  h: number
}

export type SearchResult = {
  frame_idx: number
  timestamp: number
  score: number
  box: Box
}

export type UploadResponse = {
  message: string
  filename: string
}

export type SearchResponse = {
  query: string
  results: SearchResult[]
}
