function cleanUserId(userId) {
  const s = String(userId ?? '').trim()
  return s || null
}

export function buildUtmByKind(kind, userId) {
  const uid = cleanUserId(userId)
  if (!uid) return null
  if (kind === 'save_ration') return `ref_save_ration_${uid}`
  if (kind === 'share_friend') return `share_friend_by_${uid}`
  if (kind === 'share_ration') return `share_ration_by_${uid}`
  return `ref_link_app_${uid}`
}

export function getRouteUtmForPath(pathname, userId) {
  const path = String(pathname || '').trim().toLowerCase()
  if (path === '/cart') return buildUtmByKind('save_ration', userId)
  return buildUtmByKind('app', userId)
}

export function buildLandingUrl({ id, utm }) {
  const base = 'https://scan.mobilemed.ai/'
  const url = new URL(base)
  const uid = cleanUserId(id)
  const u = String(utm ?? '').trim()
  if (uid) url.searchParams.set('id', uid)
  if (u) url.searchParams.set('utm', u)
  return url.toString()
}
