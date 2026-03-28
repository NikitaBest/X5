function unwrapPayload(payload) {
  if (payload == null || typeof payload !== 'object') return null
  // Не отбрасываем ответ при isSuccess: false — данные скана часто всё равно в value
  const v = payload.value != null && typeof payload.value === 'object' ? payload.value : payload
  return v
}

/**
 * Ищет непустой массив transcripts в объекте (разные вложенности бэкенда).
 */
export function pickTranscriptsFromNode(node, depth = 0) {
  if (node == null || depth > 10) return null

  if (Array.isArray(node)) {
    for (const el of node) {
      const t = pickTranscriptsFromNode(el, depth + 1)
      if (t) return t
    }
    return null
  }

  if (typeof node !== 'object') return null

  const direct = node.transcripts ?? node.Transcripts
  if (Array.isArray(direct) && direct.length > 0) return direct

  const nested = [node.scanResult, node.scan, node.result, node.rppgResult, node.payload, node.data, node.body]
  for (const n of nested) {
    const t = pickTranscriptsFromNode(n, depth + 1)
    if (t) return t
  }
  return null
}

const TRANSCRIPT_LIKE_KEYS = new Set(['key', 'Key', 'metricKey', 'name', 'Name', 'metric'])

function looksLikeTranscriptArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false
  return arr.every(
    (x) => x && typeof x === 'object' && Object.keys(x).some((k) => TRANSCRIPT_LIKE_KEYS.has(k)),
  )
}

/**
 * Рекурсивно ищет массив похожий на transcripts в любом месте JSON.
 */
export function deepFindTranscriptArray(root, maxDepth = 12) {
  const seen = new Set()

  function walk(node, depth) {
    if (node == null || depth > maxDepth) return null
    if (typeof node !== 'object') return null
    if (seen.has(node)) return null
    seen.add(node)

    if (Array.isArray(node)) {
      if (looksLikeTranscriptArray(node)) return node
      for (const el of node) {
        const f = walk(el, depth + 1)
        if (f) return f
      }
      return null
    }

    for (const k of Object.keys(node)) {
      const v = node[k]
      if (typeof k === 'string' && k.toLowerCase() === 'transcripts' && Array.isArray(v) && v.length > 0) {
        return v
      }
      const f = walk(v, depth + 1)
      if (f) return f
    }
    return null
  }

  return walk(root, 0)
}

/** Есть ли в ответе скана массив transcripts (как на странице результатов). */
export function hasTranscriptsInResponse(response) {
  if (response == null || typeof response !== 'object') return false
  const v = unwrapPayload(response)
  if (v && pickTranscriptsFromNode(v)) return true
  return Boolean(deepFindTranscriptArray(response))
}

function collectArrays(inner, data) {
  const out = []
  const add = (x) => {
    if (Array.isArray(x) && x.length > 0) out.push(x)
  }
  add(inner?.data)
  add(inner?.items)
  add(inner?.scans)
  add(inner?.results)
  add(inner?.list)
  add(inner?.records)
  add(inner?.content)
  add(data?.data)
  add(data?.items)
  if (Array.isArray(inner)) add(inner)
  return out
}

function buildScanEnvelope(transcripts, healthScore, ...sources) {
  const merged = Object.assign({}, ...sources.filter(Boolean))
  return {
    value: {
      ...merged,
      transcripts,
      healthScore:
        healthScore ??
        merged.healthScore ??
        merged.overallScore ??
        merged.score ??
        merged.health_score,
    },
  }
}

/**
 * Достаёт последний скан из ответа GET /scan/get (разные формы value / списков).
 * @param {unknown} data
 * @returns {object|null} Объект вида { value: { transcripts, healthScore?, ... } }
 */
export function extractLastScanResponse(data) {
  if (data == null || typeof data !== 'object') return null

  const inner = unwrapPayload(data)
  if (inner) {
    const tr = pickTranscriptsFromNode(inner)
    if (tr) {
      return buildScanEnvelope(
        tr,
        inner.healthScore ?? inner.overallScore ?? inner.score ?? inner.health_score,
        inner,
      )
    }
  }

  for (const list of collectArrays(inner, data)) {
    for (const first of list) {
      if (first == null) continue

      const candidates = [
        first,
        first.value,
        first.scan,
        first.scanResult,
        first.payload,
        first.data,
      ].filter(Boolean)

      for (const node of candidates) {
        if (typeof node !== 'object') continue
        const tr = pickTranscriptsFromNode(node)
        if (tr && tr.length > 0) {
          return buildScanEnvelope(
            tr,
            node.healthScore ??
              first.healthScore ??
              first.value?.healthScore ??
              inner?.healthScore,
            node,
            first,
          )
        }
      }
    }
  }

  const deep = deepFindTranscriptArray(data)
  if (deep && deep.length > 0) {
    return buildScanEnvelope(deep, null, unwrapPayload(data) || {})
  }

  return null
}
