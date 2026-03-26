import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import DayCalendar from '../components/DayCalendar.jsx'
import MealCard from '../components/MealCard.jsx'
import MealDetailSheet from '../components/MealDetailSheet.jsx'
import { getRationByScan } from '../api/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import logger from '../utils/logger.js'
import { proxiedProductImageUrl } from '../utils/productImageProxy.js'
import './Results.css'

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Завтрак' },
  { key: 'lunch', label: 'Обед' },
  { key: 'dinner', label: 'Ужин' },
]

function getWeekStartMonday(date) {
  const tmp = new Date(date)
  const day = tmp.getDay() || 7
  tmp.setDate(tmp.getDate() - (day - 1))
  tmp.setHours(0, 0, 0, 0)
  return tmp
}

function planDayFromSelectedCalendarDate(selectedDate) {
  const weekStart = getWeekStartMonday(new Date())
  const d1 = new Date(selectedDate)
  d1.setHours(0, 0, 0, 0)
  return Math.round((d1.getTime() - weekStart.getTime()) / 86400000) + 1
}

function truncateText(text, maxLen) {
  const s = String(text ?? '').trim()
  if (!s) return ''
  if (s.length <= maxLen) return s
  return `${s.slice(0, maxLen).trim()}…`
}

function gramsToMacros(product, grams) {
  const g = Number(grams) || 0
  const factor = g / 100
  return {
    kcal: (Number(product?.kcalPer100G) || 0) * factor,
    protein: (Number(product?.proteinsGPer100G) || 0) * factor,
    fat: (Number(product?.fatsGPer100G) || 0) * factor,
    carbs: (Number(product?.carbsGPer100G) || 0) * factor,
  }
}

function mapReplaceToAlternatives(food) {
  const list = Array.isArray(food?.replace) ? food.replace : []
  return list.map((r) => {
    const p = r.product
    if (!p) return null
    const w = Number(r.weigth ?? r.weight ?? p.weightG) || 100
    const m = gramsToMacros(p, w)
    return {
      id: r.id,
      title: p.title || '',
      shortTitle: truncateText(p.title, 72),
      statusTag: food.reason ? truncateText(food.reason, 90) : '',
      tags: [],
      composition: p.mainIngrediants || p.fullIngrediants || '',
      calories: `${Math.round(m.kcal)} ккал`,
      protein: Math.round(m.protein * 10) / 10,
      fat: Math.round(m.fat * 10) / 10,
      carbs: Math.round(m.carbs * 10) / 10,
      imageUrl: proxiedProductImageUrl(
        Array.isArray(p.images) && p.images[0] ? p.images[0] : '',
      ) || null,
    }
  }).filter(Boolean)
}

function foodItemToMealPartial(food) {
  const p = food.product
  if (!p) return null
  const w = Number(food.weigth ?? food.weight ?? p.weightG) || 100
  const m = gramsToMacros(p, w)
  return {
    id: food.id,
    title: p.title || '',
    shortTitle: truncateText(p.title, 72),
    statusTag: food.reason ? truncateText(food.reason, 90) : '',
    tags: food.reason
      ? food.reason
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3)
      : [],
    composition: p.mainIngrediants || p.fullIngrediants || '',
    calories: `${Math.round(m.kcal)} ккал`,
    protein: Math.round(m.protein * 10) / 10,
    fat: Math.round(m.fat * 10) / 10,
    carbs: Math.round(m.carbs * 10) / 10,
    imageUrl: proxiedProductImageUrl(
      Array.isArray(p.images) && p.images[0] ? p.images[0] : '',
    ) || null,
  }
}

function mergeFoodsForSlot(foods) {
  if (!Array.isArray(foods) || foods.length === 0) return null
  if (foods.length === 1) {
    const one = foodItemToMealPartial(foods[0])
    return one ? { ...one, slotFoodCount: 1 } : null
  }
  let kcal = 0
  let protein = 0
  let fat = 0
  let carbs = 0
  const partials = []
  for (const f of foods) {
    const p = f.product
    if (!p) continue
    const w = Number(f.weigth ?? f.weight ?? p.weightG) || 100
    const m = gramsToMacros(p, w)
    kcal += m.kcal
    protein += m.protein
    fat += m.fat
    carbs += m.carbs
    const part = foodItemToMealPartial(f)
    if (part) partials.push(part)
  }
  if (partials.length === 0) return null
  const first = partials[0]
  const shortTitle =
    partials.length > 1
      ? `${first.shortTitle} и ещё ${partials.length - 1}`
      : first.shortTitle
  return {
    id: `merged-${foods[0].id}`,
    title: partials.map((x) => x.title).join(' · '),
    shortTitle,
    statusTag: partials
      .map((x) => x.statusTag)
      .filter(Boolean)
      .join(' · ')
      .slice(0, 120),
    tags: partials.flatMap((x) => x.tags).slice(0, 4),
    composition: partials
      .map((x) => x.composition)
      .filter(Boolean)
      .join('\n\n'),
    calories: `${Math.round(kcal)} ккал`,
    protein: Math.round(protein * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    imageUrl: first.imageUrl,
    slotFoodCount: foods.length,
  }
}

function extractRationRows(data) {
  if (!data || typeof data !== 'object') return []
  const v = data.value != null && typeof data.value === 'object' ? data.value : data
  if (!Array.isArray(v.ration)) return []
  return v.ration
}

function buildSlotsForPlanDay(ration, planDay) {
  const dayNum = Number(planDay)
  const rows = ration.filter((r) => Number(r.day) === dayNum)
  const byType = {}
  for (const row of rows) {
    const t = String(row.type || '').toLowerCase()
    if (!byType[t]) byType[t] = []
    const foods = Array.isArray(row.food) ? row.food : []
    byType[t].push(...foods)
  }

  return MEAL_TYPES.map(({ key, label }) => {
    const foods = byType[key] || []
    const meal = mergeFoodsForSlot(foods)
    const alternatives = (() => {
      const all = foods.flatMap((f) => mapReplaceToAlternatives(f))
      const seen = new Set()
      return all.filter((x) => {
        const k = String(x?.title || x?.id || '')
        if (!k || seen.has(k)) return false
        seen.add(k)
        return true
      })
    })()
    return { key, label, meal, alternatives }
  })
}

function NutritionPlan() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const scanId = location.state?.scanId ?? null

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const [selectedDate, setSelectedDate] = useState(today)

  const [ration, setRation] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(scanId && token))

  const [meals, setMeals] = useState([null, null, null])
  const [alternativesBySlot, setAlternativesBySlot] = useState([[], [], []])

  const [activeSlot, setActiveSlot] = useState(null)
  const [openReplaceView, setOpenReplaceView] = useState(false)

  useEffect(() => {
    if (!scanId || !token) {
      setIsLoading(false)
      setRation([])
      return undefined
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    getRationByScan(token, scanId)
      .then((data) => {
        if (cancelled) return
        if (data && typeof data === 'object' && data.isSuccess === false) {
          setLoadError(data.error ? String(data.error) : 'Не удалось получить рацион.')
          setRation([])
          return
        }
        const rows = extractRationRows(data)
        if (!rows.length) {
          setLoadError('Рацион пока пуст. Попробуйте обновить позже.')
          setRation([])
          return
        }
        setRation(rows)
      })
      .catch((err) => {
        if (cancelled) return
        logger.warn('nutrition: getRationByScan failed', err)
        setLoadError('Не удалось загрузить рацион. Попробуйте ещё раз.')
        setRation([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [scanId, token])

  const planDay = useMemo(
    () => planDayFromSelectedCalendarDate(selectedDate),
    [selectedDate],
  )

  useEffect(() => {
    const slots = buildSlotsForPlanDay(ration, planDay)
    setMeals(slots.map((s) => s.meal))
    setAlternativesBySlot(slots.map((s) => s.alternatives))
  }, [ration, planDay])

  const handleReplaceMeal = useCallback((slotIndex, newMeal) => {
    setMeals((prev) => {
      const next = [...prev]
      next[slotIndex] = {
        ...newMeal,
        id: newMeal.id ?? next[slotIndex]?.id,
      }
      return next
    })
  }, [])

  const handleCloseSheet = () => {
    setActiveSlot(null)
    setOpenReplaceView(false)
  }

  const activeMeal = activeSlot != null ? meals[activeSlot] : null
  const mealType = activeSlot != null ? MEAL_TYPES[activeSlot]?.label : null
  const activeAlternatives = activeSlot != null ? alternativesBySlot[activeSlot] ?? [] : []

  if (!scanId) {
    return (
      <Page className="results-page">
        <Header title="Ваш рацион" showBack />
        <div className="nutrition-plan-empty">
          <p className="nutrition-plan-empty-text">
            Чтобы увидеть персональный рацион, сначала пройдите сканирование и откройте эту страницу из блока результатов.
          </p>
          <button type="button" className="results-button" onClick={() => navigate('/results')}>
            К результатам
          </button>
        </div>
      </Page>
    )
  }

  if (!token) {
    return (
      <Page className="results-page">
        <Header title="Ваш рацион" showBack />
        <div className="nutrition-plan-empty">
          <p className="nutrition-plan-empty-text">Требуется авторизация для загрузки рациона.</p>
        </div>
      </Page>
    )
  }

  return (
    <Page className="results-page">
      <Header title="Ваш рацион" showBack />
      <DayCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {isLoading && (
        <p className="nutrition-plan-loading">Загружаем рацион…</p>
      )}

      {loadError && !isLoading && (
        <p className="nutrition-plan-error" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && !loadError && ration.length > 0 && MEAL_TYPES.map((slot, index) => {
        const m = meals[index]
        return (
          <MealCard
            key={slot.key}
            mealType={slot.label}
            title={m?.shortTitle || 'Нет позиций на этот приём пищи'}
            description={m ? truncateText(m.composition, 140) : 'Выберите другой день в календаре или дождитесь обновления плана.'}
            tag={m?.statusTag || null}
            imageUrl={m?.imageUrl || null}
            onClick={m ? () => { setOpenReplaceView(false); setActiveSlot(index); } : undefined}
            onReplaceClick={
              m
                ? () => { setOpenReplaceView(true); setActiveSlot(index); }
                : undefined
            }
          />
        )
      })}

      {!isLoading && !loadError && ration.length > 0 ? (
        <div className="nutrition-plan-footer">
          <button type="button" className="nutrition-plan-cart-btn" onClick={() => navigate('/cart')}>
            Добавить в корзину
          </button>
        </div>
      ) : null}

      <MealDetailSheet
        open={activeSlot != null}
        onClose={handleCloseSheet}
        meal={activeMeal}
        mealType={mealType}
        slotIndex={activeSlot}
        alternatives={activeAlternatives}
        onReplaceMeal={handleReplaceMeal}
        initialView={openReplaceView ? 'alternatives' : 'detail'}
      />
    </Page>
  )
}

export default NutritionPlan
