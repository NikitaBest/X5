function unwrapPayload(payload) {
  if (payload == null || typeof payload !== 'object') return null
  if (payload.isSuccess === false) return null
  const v = payload.value != null && typeof payload.value === 'object' ? payload.value : payload
  return v
}

/**
 * Ищет непустой массив transcripts в объекте (разные вложенности бэкенда).
 */
export function pickTranscriptsFromNode(node) {
  if (node == null || typeof node !== 'object') return null
  const direct = node.transcripts
  if (Array.isArray(direct) && direct.length > 0) return direct

  const nested = [node.scanResult, node.scan, node.result, node.rppgResult, node.payload, node.data]
  for (const n of nested) {
    if (n == null || typeof n !== 'object') continue
    const t = n.transcripts
    if (Array.isArray(t) && t.length > 0) return t
  }
  return null
}

/** Есть ли в ответе скана массив transcripts (как на странице результатов). */
export function hasTranscriptsInResponse(response) {
  const v = unwrapPayload(response)
  if (!v) return false
  if (pickTranscriptsFromNode(v)) return true
  return false
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
  add(data?.data)
  add(data?.items)
  if (Array.isArray(inner)) add(inner)
  return out
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
      return {
        value: {
          ...inner,
          transcripts: tr,
          healthScore:
            inner.healthScore ??
            inner.overallScore ??
            inner.score ??
            inner.health_score,
        },
      }
    }
  }

  for (const list of collectArrays(inner, data)) {
    const first = list[0]
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
        return {
          value: {
            ...node,
            ...first,
            transcripts: tr,
            healthScore:
              node.healthScore ??
              first.healthScore ??
              first.value?.healthScore ??
              inner?.healthScore,
          },
        }
      }
    }
  }

  return null
}
