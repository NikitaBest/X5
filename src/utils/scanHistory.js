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

function coerceFiniteNumber(x) {
  if (x == null || x === '') return null
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}

/** Явные поля общего индекса 0–100 (как на экране результатов). */
const HEALTH_SCORE_PRIMARY_KEYS = [
  'healthScore',
  'HealthScore',
  'overallScore',
  'OverallScore',
  'health_score',
  'rppgScore',
  'RppgScore',
]

/**
 * Сомнительные имена: на корне ответа `score` часто не про здоровье (статус, страница и т.д.).
 * Берём только после поиска во вложениях и только по PRIMARY.
 */
const HEALTH_SCORE_FALLBACK_KEYS = ['totalScore', 'score']

function pickFromKeyList(target, keys) {
  if (target == null || typeof target !== 'object') return null
  for (const k of keys) {
    const n = coerceFiniteNumber(target[k])
    if (n != null) return n
  }
  return null
}

/**
 * Узлы, где обычно лежит scan + healthScore (в т.ч. value.scan).
 */
function collectNestedHealthNodes(root) {
  if (root == null || typeof root !== 'object') return []
  const nodes = []
  const topKeys = ['value', 'scan', 'scanResult', 'rppgResult', 'payload', 'data']
  for (const k of topKeys) {
    const v = root[k]
    if (v == null || typeof v !== 'object' || Array.isArray(v)) continue
    nodes.push(v)
    for (const k2 of ['scan', 'scanResult', 'rppgResult', 'data', 'value']) {
      const inner = v[k2]
      if (inner != null && typeof inner === 'object' && !Array.isArray(inner)) nodes.push(inner)
    }
  }
  return nodes
}

/**
 * Ищет числовой общий балл для шкалы 0–100. Сначала вложения (реальный скан), потом корень;
 * не используем wellnessScore (другая шкала, напр. «баллы»).
 */
function pickHealthScoreFromObject(obj) {
  if (obj == null || typeof obj !== 'object') return null

  const nestedNodes = collectNestedHealthNodes(obj)
  for (const node of nestedNodes) {
    const n = pickFromKeyList(node, HEALTH_SCORE_PRIMARY_KEYS)
    if (n != null) return n
  }
  const topPrimary = pickFromKeyList(obj, HEALTH_SCORE_PRIMARY_KEYS)
  if (topPrimary != null) return topPrimary

  for (const node of nestedNodes) {
    const n = pickFromKeyList(node, HEALTH_SCORE_FALLBACK_KEYS)
    if (n != null) return n
  }
  return pickFromKeyList(obj, HEALTH_SCORE_FALLBACK_KEYS)
}

function buildScanEnvelope(transcripts, healthScoreHint, ...sources) {
  const merged = Object.assign({}, ...sources.filter(Boolean))
  const fromHint = coerceFiniteNumber(healthScoreHint)
  const fromTree = pickHealthScoreFromObject(merged)
  const healthScore = fromHint ?? fromTree ?? null

  const value = { ...merged, transcripts }
  if (healthScore != null) {
    value.healthScore = healthScore
  } else {
    delete value.healthScore
  }

  return { value }
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
      return buildScanEnvelope(tr, null, inner, data)
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
          return buildScanEnvelope(tr, null, node, first, first.value, inner, data)
        }
      }
    }
  }

  const deep = deepFindTranscriptArray(data)
  if (deep && deep.length > 0) {
    return buildScanEnvelope(deep, null, unwrapPayload(data) || {}, data)
  }

  return null
}
