function toNum(value) {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function macrosForFood(food) {
  const p = food?.product
  if (!p) return { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  const grams = toNum(food?.weigth ?? food?.weight ?? p?.weightG ?? 0)
  const factor = grams / 100
  return {
    kcal: toNum(p.kcalPer100G) * factor,
    protein: toNum(p.proteinsGPer100G) * factor,
    fat: toNum(p.fatsGPer100G) * factor,
    carbs: toNum(p.carbsGPer100G) * factor,
  }
}

function mealLabel(type) {
  const t = String(type || '').toLowerCase()
  if (t === 'breakfast') return 'Завтрак'
  if (t === 'lunch') return 'Обед'
  if (t === 'dinner') return 'Ужин'
  if (t === 'snack') return 'Перекус'
  return type || 'Приём пищи'
}

function weekdayLabelByDay(dayNum) {
  const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  return labels[Math.max(1, Math.min(7, Number(dayNum) || 1)) - 1]
}

function weekdayMetaByDay(dayNum) {
  const index = Math.max(1, Math.min(7, Number(dayNum) || 1)) - 1
  const short = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][index]
  const full = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'][index]
  const id = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][index]
  return { short, full, id }
}

/**
 * Маппит ответ GET /ration/{rationId} в структуру NutritionReport.
 * @param {any} payload
 */
export function mapRationToNutritionReport(payload) {
  const value = payload?.value && typeof payload.value === 'object' ? payload.value : payload
  const rationRows = Array.isArray(value?.ration)
    ? value.ration
    : Array.isArray(value?.items)
      ? value.items
      : []

  const dayMap = new Map()
  for (const row of rationRows) {
    const day = Number(row?.day) || 1
    if (!dayMap.has(day)) {
      const weekday = weekdayMetaByDay(day)
      dayMap.set(day, {
        id: weekday.id,
        title: `День ${day} (${weekday.full})`,
        totalKcal: 0,
        meals: [],
        macros: { proteinGrams: 0, fatGrams: 0, carbsGrams: 0 },
      })
    }
    const bucket = dayMap.get(day)
    const foods = Array.isArray(row?.food) ? row.food : [row]
    const mealType = mealLabel(row?.type)
    for (const food of foods) {
      const m = macrosForFood(food)
      bucket.totalKcal += m.kcal
      bucket.macros.proteinGrams += m.protein
      bucket.macros.fatGrams += m.fat
      bucket.macros.carbsGrams += m.carbs
      bucket.meals.push({
        key: String(food?.id ?? `${day}-${row?.type ?? 'meal'}`),
        slot: mealType,
        text: food?.product?.title || 'Продукт',
        kcal: Math.round(m.kcal),
        order: Number(food?.order ?? row?.order ?? 0),
      })
    }
  }

  const orderedDays = [...dayMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, d]) => {
      const sortedMeals = Array.isArray(d.meals)
        ? [...d.meals].sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0))
        : []
      return {
        ...d,
        meals: sortedMeals,
        totalKcal: Math.round(d.totalKcal),
        macros: {
          proteinGrams: Math.round(d.macros.proteinGrams),
          fatGrams: Math.round(d.macros.fatGrams),
          carbsGrams: Math.round(d.macros.carbsGrams),
        },
        weekday: weekdayLabelByDay(day),
      }
    })

  const caloriesByDay = orderedDays.map((d, idx) => ({
    label: d.weekday || weekdayLabelByDay(idx + 1),
    total: d.totalKcal,
  }))

  const daysCount = Math.max(1, orderedDays.length)
  const totalWeekKcal = orderedDays.reduce((acc, d) => acc + toNum(d.totalKcal), 0)
  const totalProtein = orderedDays.reduce((acc, d) => acc + toNum(d.macros.proteinGrams), 0)
  const totalFat = orderedDays.reduce((acc, d) => acc + toNum(d.macros.fatGrams), 0)
  const totalCarbs = orderedDays.reduce((acc, d) => acc + toNum(d.macros.carbsGrams), 0)
  const macroSum = totalProtein + totalFat + totalCarbs

  const avgProtein = totalProtein / daysCount
  const avgFat = totalFat / daysCount
  const avgCarbs = totalCarbs / daysCount

  // userMe (профиль/исключения) приходит отдельным запросом /user/me.
  // В ответе часто используется обёртка { value: { profile, ... } } — это нужно учесть.
  const userMe = arguments?.[1] ?? null
  const raw = userMe?.value && typeof userMe.value === 'object' ? userMe.value : userMe

  const profile = raw?.profile && typeof raw.profile === 'object' ? raw.profile : null

  const goals = Array.isArray(profile?.goals) && profile.goals.length > 0 ? profile.goals : ['Сбалансированное питание']

  const normalizeExclusionValue = (item) => {
    if (item == null) return null
    if (typeof item === 'string') return item.trim()
    const v = item?.productName ?? item?.name ?? item?.title ?? item?.label ?? item?.tag
    return v != null ? String(v).trim() : null
  }

  const exclusionsRaw =
    raw?.exclusions ??
    raw?.excludedProducts ??
    raw?.excludeProducts ??
    raw?.exclusionsList ??
    raw?.excludeList ??
    raw?.excludeProductList ??
    []

  const exclusions = Array.isArray(exclusionsRaw)
    ? exclusionsRaw.map(normalizeExclusionValue).filter(Boolean)
    : []

  const genderRaw = profile?.gender
  const smokingRaw = profile?.smokeStatus ?? profile?.smokingStatus ?? profile?.smoke

  const gender = (() => {
    if (genderRaw === 0) return 'Мужской'
    if (genderRaw === 1) return 'Женский'
    if (typeof genderRaw === 'string') {
      const s = genderRaw.trim().toUpperCase()
      if (s === 'MALE' || s === 'M') return 'Мужской'
      if (s === 'FEMALE' || s === 'F') return 'Женский'
      return genderRaw
    }
    return '—'
  })()

  const smoking = (() => {
    if (smokingRaw === 0) return 'Не курит'
    if (smokingRaw === 1) return 'Курит'
    if (typeof smokingRaw === 'string') {
      const s = smokingRaw.trim().toUpperCase()
      if (s === 'NON_SMOKER' || s === 'NO' || s === 'НЕ КУРИТ') return 'Не курит'
      if (s === 'SMOKER' || s === 'YES' || s === 'КУРИТ') return 'Курит'
      return smokingRaw
    }
    return '—'
  })()

  const initials = (() => {
    const nameRaw =
      raw?.name ??
      raw?.fullName ??
      raw?.full_name ??
      raw?.displayName ??
      raw

    const first = nameRaw?.firstName ?? nameRaw?.first ?? nameRaw?.givenName
    const last = nameRaw?.lastName ?? nameRaw?.last ?? nameRaw?.familyName
    const n = `${first ?? ''} ${last ?? ''}`.trim()
    if (!n) return 'XP'
    const parts = n.split(/\s+/).filter(Boolean)
    const a = (parts[0]?.[0] ?? '').toUpperCase()
    const b = (parts[1]?.[0] ?? '').toUpperCase()
    return `${a}${b}` || 'XP'
  })()

  const displayName = raw?.name ?? raw?.fullName ?? raw?.full_name ?? 'Пользователь'

  return {
    initials,
    name: displayName,
    exclusions,
    profile: {
      gender,
      age: profile?.age ?? 0,
      height: profile?.height ?? 0,
      weight: profile?.weight ?? 0,
      smoking,
    },
    goals,
    caloriesByDay,
    avgCalories: Math.round(totalWeekKcal / daysCount),
    bju: {
      protein: {
        grams: Math.round(avgProtein),
        percent: macroSum > 0 ? Math.round((totalProtein / macroSum) * 100) : 0,
      },
      fat: {
        grams: Math.round(avgFat),
        percent: macroSum > 0 ? Math.round((totalFat / macroSum) * 100) : 0,
      },
      carbs: {
        grams: Math.round(avgCarbs),
        percent: macroSum > 0 ? Math.round((totalCarbs / macroSum) * 100) : 0,
      },
    },
    weekPlan: {
      rangeLabel: value?.createdAt ? `Сформирован: ${new Date(value.createdAt).toLocaleDateString('ru-RU')}` : 'Текущий рацион',
      days: orderedDays.map((d) => ({
        id: d.id,
        title: d.title,
        totalKcal: d.totalKcal,
        meals: d.meals,
        macros: d.macros,
      })),
    },
  }
}

