/**
 * Доступ к результатам/рациону только если пользователь не «пустой»:
 * с сервера пришли базовые поля профиля ИЛИ локально уже заполнены цели/антропометрия (Welcome).
 */
export function profileResponseHasBasics(profile) {
  if (!profile || typeof profile !== 'object') return false
  if (profile.age != null && profile.age !== '') return true
  if (profile.height != null && profile.height !== '') return true
  if (profile.weight != null && profile.weight !== '') return true
  if (profile.gender != null && profile.gender !== '') return true
  if (Array.isArray(profile.goals) && profile.goals.length > 0) return true
  if (profile.smokeStatus != null && profile.smokeStatus !== '') return true
  return false
}

export function userDataHasOnboardingBasics(userData) {
  if (!userData || typeof userData !== 'object') return false
  const goals = userData.goals
  if (Array.isArray(goals) && goals.length > 0) return true
  if (userData.age != null && userData.age !== '') return true
  if (userData.height != null && userData.height !== '') return true
  if (userData.weight != null && userData.weight !== '') return true
  if (userData.gender != null && userData.gender !== '') return true
  return false
}

export function canAccessHealthScreens(hasServerProfileBasics, userData) {
  return Boolean(hasServerProfileBasics || userDataHasOnboardingBasics(userData))
}
