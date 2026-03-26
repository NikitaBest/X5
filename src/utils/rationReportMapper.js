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
  const rationRows = Array.isArray(value?.ration) ? value.ration : []

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
    const foods = Array.isArray(row?.food) ? row.food : []
    for (const food of foods) {
      const m = macrosForFood(food)
      bucket.totalKcal += m.kcal
      bucket.macros.proteinGrams += m.protein
      bucket.macros.fatGrams += m.fat
      bucket.macros.carbsGrams += m.carbs
      bucket.meals.push({
        key: String(food?.id ?? `${day}-${row?.type ?? 'meal'}`),
        slot: mealLabel(row?.type),
        text: food?.product?.title || 'Продукт',
        kcal: Math.round(m.kcal),
      })
    }
  }

  const orderedDays = [...dayMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, d]) => ({
      ...d,
      totalKcal: Math.round(d.totalKcal),
      macros: {
        proteinGrams: Math.round(d.macros.proteinGrams),
        fatGrams: Math.round(d.macros.fatGrams),
        carbsGrams: Math.round(d.macros.carbsGrams),
      },
      weekday: weekdayLabelByDay(day),
    }))

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

  return {
    initials: 'XP',
    name: 'Пользователь',
    exclusions: [],
    profile: {
      gender: '—',
      age: 0,
      height: 0,
      weight: 0,
      smoking: '—',
    },
    goals: ['Сбалансированное питание'],
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

