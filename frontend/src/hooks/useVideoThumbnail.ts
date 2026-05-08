import { useEffect, useState } from 'react'

export function useVideoThumbnail(file: File | null): string | null {
  const [thumbnail, setThumbnail] = useState<string | null>(null)

  useEffect(() => {
    setThumbnail(null)
    if (!file) return

    // Images: object URL is the thumbnail directly.
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setThumbnail(url)
      return () => URL.revokeObjectURL(url)
    }

    // Videos: seek to an early frame and capture via canvas.
    let cancelled = false
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
    }

    video.onloadedmetadata = () => {
      const seekTo = Math.min(0.5, (video.duration || 0) * 0.1)
      video.currentTime = Number.isFinite(seekTo) ? seekTo : 0
    }

    video.onseeked = () => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        cleanup()
        return
      }
      ctx.drawImage(video, 0, 0)
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        if (!cancelled) setThumbnail(dataUrl)
      } catch {
        // toDataURL can fail (e.g. tainted canvas); leave thumbnail null
      }
      cleanup()
    }

    video.onerror = cleanup

    return () => {
      cancelled = true
      cleanup()
    }
  }, [file])

  return thumbnail
}
