/** Есть ли в ответе скана массив transcripts (как на странице результатов). */
export function hasTranscriptsInResponse(response) {
  return Array.isArray(response?.value?.transcripts) && response.value.transcripts.length > 0
}

/**
 * Достаёт последний скан из ответа GET /scan/get (разные формы value.data / items).
 * @param {unknown} data
 * @returns {object|null}
 */
export function extractLastScanResponse(data) {
  if (hasTranscriptsInResponse(data)) return data

  const list = Array.isArray(data?.value?.data)
    ? data.value.data
    : Array.isArray(data?.value?.items)
      ? data.value.items
      : Array.isArray(data?.data)
        ? data.data
        : []

  const first = list[0]
  if (hasTranscriptsInResponse(first)) return first
  if (Array.isArray(first?.transcripts) && first.transcripts.length > 0) {
    return { value: first }
  }
  return null
}
