/** YouTube video id from youtube.com/watch?v=, youtu.be/ or /shorts/ links. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/.exec(url)
  return m ? m[1] : null
}

export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youtubeId(url)
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}
