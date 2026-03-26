/**
 * Прокси картинок с tsx.x5static.net — иначе при COEP require-corp браузер блокирует <img crossorigin>.
 * Разрешён только один хост (без произвольных SSRF).
 */
const ALLOWED_HOST = 'tsx.x5static.net'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed')
    return
  }

  const raw = typeof req.query.url === 'string' ? req.query.url : ''
  if (!raw) {
    res.status(400).end('Missing url')
    return
  }

  let target
  try {
    target = new URL(raw)
  } catch {
    res.status(400).end('Bad url')
    return
  }

  if (target.hostname !== ALLOWED_HOST || target.protocol !== 'https:') {
    res.status(403).end('Forbidden')
    return
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: 'image/*,*/*' },
    })
    if (!upstream.ok) {
      res.status(502).end('Bad gateway')
      return
    }
    const ct = upstream.headers.get('content-type') || 'image/jpeg'
    const buf = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', ct)
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
    res.status(200).send(buf)
  } catch {
    res.status(502).end('Fetch failed')
  }
}
