/** Хосты медиа, которые при COEP: require-corp нужно отдавать через same-origin прокси. */
const PROXY_HOSTS = new Set(['tsx.x5static.net'])

/**
 * Превращает абсолютный URL картинки продукта в URL прокси (same-origin), чтобы
 * изображение открывалось при Cross-Origin-Embedder-Policy: require-corp.
 * @param {string|null|undefined} url
 * @returns {string}
 */
export function proxiedProductImageUrl(url) {
  if (url == null || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'https:' || !PROXY_HOSTS.has(u.hostname)) return trimmed
    return `/api/media-proxy?url=${encodeURIComponent(trimmed)}`
  } catch {
    return trimmed
  }
}
