/** Коды целей на экране Welcome / в userData (как уходит в PUT при необходимости). */
export const GOAL_OPTION_CODES = ['sugar', 'lightness', 'energy', 'immunity', 'shopping']

const CODE_SET = new Set(GOAL_OPTION_CODES.map((c) => c.toLowerCase()))

/** Обратное соответствие русских подписей (актуальных и старых) → код. */
const RU_TO_CODE = {
  'взять вес под контроль': 'sugar',
  'взять сахар под контроль': 'sugar',
  'дополнительные витамины': 'lightness',
  'обрести лёгкость': 'lightness',
  'обрести легкость': 'lightness',
  'получить заряд бодрости': 'energy',
  'укрепить иммунитет': 'immunity',
  'быстрое восстановление': 'shopping',
  'выгодно покупать полезное': 'shopping',
  'бюджетно покупать полезное': 'shopping',
}

/**
 * Приводит сохранённые цели к массиву кодов (макс. 3), без дубликатов.
 * Поддерживает коды и русские строки с бэка / из профиля.
 */
export function normalizeGoalsToCodes(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out = []
  for (const item of raw) {
    const s = String(item ?? '').trim()
    if (!s) continue
    const lower = s.toLowerCase()
    let code = null
    if (CODE_SET.has(lower)) {
      code = lower
    } else {
      code = RU_TO_CODE[lower] ?? null
    }
    if (code && !out.includes(code)) out.push(code)
    if (out.length >= 3) break
  }
  return out
}
