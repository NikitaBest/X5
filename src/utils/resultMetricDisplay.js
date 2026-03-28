/**
 * Общие правила: что считать «пользовательской» метрикой на экране результатов
 * и когда рисовать динамическую шкалу в детальном шите.
 */

/** Сырые показатели SDK / HRV — показываем только при нормальном UX с бэка. */
const RAW_SDK_METRIC_KEYS = new Set([
  'meanrri',
  'rmssd',
  'sdnn',
  'rri',
  'nn50',
  'lfhf',
  'hf',
  'lf',
  'pnn50',
  'covrri',
])

export function isRawSdkMetricKey(key) {
  if (key == null) return false
  return RAW_SDK_METRIC_KEYS.has(String(key).trim().toLowerCase())
}

export function normalizeScaleSegmentItems(scaleMetadata) {
  if (!scaleMetadata || typeof scaleMetadata !== 'object') return []
  const items = Array.isArray(scaleMetadata.items) ? scaleMetadata.items : []
  return items
    .filter(
      (i) =>
        i &&
        Number.isFinite(Number(i.percentFrom)) &&
        Number.isFinite(Number(i.percentTo)) &&
        Number(i.percentTo) > Number(i.percentFrom),
    )
    .map((i) => ({
      ...i,
      percentFrom: Number(i.percentFrom),
      percentTo: Number(i.percentTo),
    }))
    .sort((a, b) => a.percentFrom - b.percentFrom)
}

export function areScaleSegmentsLayoutValid(sortedItems) {
  if (sortedItems.length === 0) return false
  if (sortedItems.length === 1) return true
  let lastEnd = sortedItems[0].percentTo
  for (let i = 1; i < sortedItems.length; i += 1) {
    const { percentFrom, percentTo } = sortedItems[i]
    if (percentFrom < lastEnd - 0.5) return false
    lastEnd = Math.max(lastEnd, percentTo)
  }
  return true
}

/** Достаточно осмысленных сегментов для карточки и для динамической шкалы в шите. */
export function hasDisplayableScaleMetadata(scaleMetadata) {
  const norm = normalizeScaleSegmentItems(scaleMetadata)
  return areScaleSegmentsLayoutValid(norm)
}
