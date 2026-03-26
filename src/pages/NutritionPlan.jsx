import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import DayCalendar from '../components/DayCalendar.jsx'
import MealCard from '../components/MealCard.jsx'
import MealDetailSheet from '../components/MealDetailSheet.jsx'
import {
  getRationByScan,
  getRationGenerationStatus,
  postRationRegenerate,
} from '../api/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import logger from '../utils/logger.js'
import { proxiedProductImageUrl } from '../utils/productImageProxy.js'
import './Results.css'

const BASE_MEAL_TYPES = [
  { key: 'breakfast', label: 'Завтрак' },
  { key: 'lunch', label: 'Обед' },
  { key: 'snack', label: 'Перекус' },
  { key: 'dinner', label: 'Ужин' },
]
const RATION_POLL_MS = 2500
const RATION_POLL_TIMEOUT_MS = 180000
const WEEK_RATION_STATUS = {
  None: 0,
  Pending: 1,
  InProgress: 2,
  Completed: 3,
  Failed: 4,
}

function normalizeMealType(type) {
  const t = String(type || '').toLowerCase().trim()
  if (t === 'breakfast' || t === 'завтрак') return 'breakfast'
  if (t === 'lunch' || t === 'обед') return 'lunch'
  if (t === 'dinner' || t === 'ужин') return 'dinner'
  if (t === 'snack' || t === 'перекус') return 'snack'
  return t
}

function parseRationStatus(payload) {
  const v = payload?.value
  if (!v || typeof v !== 'object') return null
  const raw = v.status ?? v.weekRationGenerationStatus
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
  return Number.isFinite(n) ? n : null
}

function getPlanStartDateTomorrow(date) {
  const tmp = new Date(date)
  tmp.setDate(tmp.getDate() + 1)
  tmp.setHours(0, 0, 0, 0)
  return tmp
}

function planDayFromSelectedCalendarDate(selectedDate) {
  const planStart = getPlanStartDateTomorrow(new Date())
  const d1 = new Date(selectedDate)
  d1.setHours(0, 0, 0, 0)
  return Math.round((d1.getTime() - planStart.getTime()) / 86400000) + 1
}

function truncateText(text, maxLen) {
  const s = String(text ?? '').trim()
  if (!s) return ''
  if (s.length <= maxLen) return s
  return `${s.slice(0, maxLen).trim()}…`
}

function toNumber(value) {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function kcalFromMeal(meal) {
  if (!meal) return 0
  const raw = String(meal.calories ?? '')
  const match = raw.match(/[\d.]+/)
  return match ? toNumber(match[0]) : 0
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
  const list = Array.isArray(food?.replace)
    ? food.replace
    : Array.isArray(food?.replaces)
      ? food.replaces
      : []
  const baseWeight = Number(food?.weigth ?? food?.weight ?? food?.product?.weightG ?? 0) || 0
  const baseKcal = toNumber(food?.kcal ?? 0)
  const baseProtein = toNumber(food?.proteins ?? food?.protein ?? 0)
  const baseFat = toNumber(food?.fats ?? food?.fat ?? 0)
  const baseCarbs = toNumber(food?.carbs ?? 0)
  return list.map((r) => {
    const p = r?.product ?? null
    const w = Number(r?.weigth ?? r?.weight ?? p?.weightG ?? 0) || (baseWeight || 100)
    const ratio = baseWeight > 0 ? w / baseWeight : 1
    const m = p
      ? gramsToMacros(p, w)
      : {
          kcal: baseKcal * ratio,
          protein: baseProtein * ratio,
          fat: baseFat * ratio,
          carbs: baseCarbs * ratio,
        }
    const reason = r?.reason ?? food?.reason ?? ''
    const title = p?.title || (r?.productId ? `Вариант #${r.productId}` : '')
    const imageUrl =
      p && Array.isArray(p.images) && p.images[0]
        ? proxiedProductImageUrl(p.images[0]) || null
        : null
    const composition = p?.mainIngrediants || p?.fullIngrediants || ''
    return {
      id: r?.id ?? r?.productId ?? '',
      title,
      shortTitle: truncateText(title, 72),
      statusTag: reason ? truncateText(reason, 90) : '',
      tags: reason
        ? reason
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 3)
        : [],
      composition,
      calories: `${Math.round(m.kcal)} ккал`,
      protein: Math.round(m.protein * 10) / 10,
      fat: Math.round(m.fat * 10) / 10,
      carbs: Math.round(m.carbs * 10) / 10,
      imageUrl,
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

function extractRationRows(data) {
  if (!data || typeof data !== 'object') return []
  const v = data.value != null && typeof data.value === 'object' ? data.value : data
  if (Array.isArray(v.ration)) return v.ration
  if (Array.isArray(v.items)) return v.items
  return []
}

function extractRationId(data) {
  const v = data?.value != null && typeof data.value === 'object' ? data.value : data
  const id = v?.id ?? data?.id ?? null
  return id != null && String(id).trim() ? String(id).trim() : null
}

function getVisibleMealTypesForDay(ration, planDay) {
  const dayNum = Number(planDay)
  const present = new Set(
    ration
      .filter((r) => Number(r.day) === dayNum)
      .map((r) => normalizeMealType(r.type)),
  )
  return BASE_MEAL_TYPES.filter((x) => present.has(x.key))
}

function buildEntriesForPlanDay(ration, planDay, mealTypes) {
  const dayNum = Number(planDay)
  const rows = ration.filter((r) => Number(r.day) === dayNum)
  const byType = {}
  for (const row of rows) {
    const t = normalizeMealType(row.type)
    if (!byType[t]) byType[t] = []
    const foods = Array.isArray(row.food) ? row.food : [row]
    byType[t].push(...foods)
  }

  // Сортируем внутри приёма пищи по order (в новой схеме он есть у каждого элемента)
  for (const key of Object.keys(byType)) {
    byType[key].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
  }

  return mealTypes.flatMap(({ key, label }) => {
    const foods = byType[key] || []
    return foods
      .map((food, index) => {
        const meal = foodItemToMealPartial(food)
        if (!meal) return null
        const alternatives = mapReplaceToAlternatives(food)
        return {
          key,
          label,
          meal,
          alternatives,
          showHeader: index === 0,
        }
      })
      .filter(Boolean)
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
  const planStartDate = useMemo(() => getPlanStartDateTomorrow(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(planStartDate)

  const [ration, setRation] = useState([])
  const [rationId, setRationId] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(scanId && token))
  const [isRegenerating, setIsRegenerating] = useState(false)

  const [mealEntries, setMealEntries] = useState([])

  const [activeSlot, setActiveSlot] = useState(null)
  const [openReplaceView, setOpenReplaceView] = useState(false)

  const loadRation = useCallback(async () => {
    if (!scanId || !token) return false
    const data = await getRationByScan(token, scanId)
    if (data && typeof data === 'object' && data.isSuccess === false) {
      throw new Error(data.error ? String(data.error) : 'Не удалось получить рацион.')
    }
    const rows = extractRationRows(data)
    if (!rows.length) {
      throw new Error('Рацион пока пуст. Попробуйте обновить позже.')
    }
    const nextRationId = extractRationId(data)
    setRationId(nextRationId)
    if (nextRationId) {
      try {
        window.localStorage.setItem('lastRationId', nextRationId)
      } catch {
        // ignore
      }
    }
    setRation(rows)
    return true
  }, [scanId, token])

  useEffect(() => {
    if (!scanId || !token) {
      setIsLoading(false)
      setRation([])
      return undefined
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    loadRation()
      .then(() => {
        if (cancelled) return
      })
      .catch((err) => {
        if (cancelled) return
        logger.warn('nutrition: getRationByScan failed', err)
        setLoadError(err?.message || 'Не удалось загрузить рацион. Попробуйте ещё раз.')
        setRation([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [scanId, token, loadRation])

  const planDay = useMemo(
    () => planDayFromSelectedCalendarDate(selectedDate),
    [selectedDate],
  )
  const visibleMealTypes = useMemo(
    () => getVisibleMealTypesForDay(ration, planDay),
    [ration, planDay],
  )

  useEffect(() => {
    const entries = buildEntriesForPlanDay(ration, planDay, visibleMealTypes)
    setMealEntries(entries)
  }, [ration, planDay, visibleMealTypes])

  const handleReplaceMeal = useCallback((entryIndex, newMeal) => {
    setMealEntries((prev) => {
      const next = [...prev]
      const oldEntry = next[entryIndex]
      if (!oldEntry) return prev
      next[entryIndex] = {
        ...oldEntry,
        meal: {
          ...newMeal,
          id: newMeal.id ?? oldEntry.meal?.id,
        },
      }
      return next
    })
  }, [])

  const handleCloseSheet = () => {
    setActiveSlot(null)
    setOpenReplaceView(false)
  }

  const handleRegenerateRation = useCallback(async () => {
    if (!scanId || !token || isRegenerating) return
    setLoadError(null)
    setIsRegenerating(true)
    setActiveSlot(null)
    setOpenReplaceView(false)

    try {
      await postRationRegenerate(token, scanId)
    } catch (err) {
      logger.warn('nutrition: regenerate start failed', err)
      setLoadError('Не удалось запустить перегенерацию. Попробуйте ещё раз.')
      setIsRegenerating(false)
      return
    }

    const startedAt = Date.now()
    while (Date.now() - startedAt < RATION_POLL_TIMEOUT_MS) {
      try {
        const statusData = await getRationGenerationStatus(token, scanId)
        const status = parseRationStatus(statusData)
        if (status === WEEK_RATION_STATUS.Completed) {
          await loadRation()
          setIsRegenerating(false)
          return
        }
        if (status === WEEK_RATION_STATUS.Failed) {
          setLoadError('Не удалось перегенерировать рацион. Попробуйте позже.')
          setIsRegenerating(false)
          return
        }
      } catch (err) {
        logger.warn('nutrition: regenerate status poll failed', err)
      }
      await new Promise((resolve) => window.setTimeout(resolve, RATION_POLL_MS))
    }

    setLoadError('Перегенерация заняла слишком много времени. Попробуйте позже.')
    setIsRegenerating(false)
  }, [scanId, token, isRegenerating, loadRation])

  const activeMeal = activeSlot != null ? mealEntries[activeSlot]?.meal : null
  const mealType = activeSlot != null ? mealEntries[activeSlot]?.label : null
  const activeAlternatives = activeSlot != null ? mealEntries[activeSlot]?.alternatives ?? [] : []
  const dayTotals = useMemo(() => {
    const totals = mealEntries.reduce(
      (acc, entry) => {
        const meal = entry?.meal
        if (!meal) return acc
        acc.kcal += kcalFromMeal(meal)
        acc.protein += toNumber(meal.protein)
        acc.fat += toNumber(meal.fat)
        acc.carbs += toNumber(meal.carbs)
        return acc
      },
      { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    )
    const macroSum = Math.max(0, totals.protein + totals.fat + totals.carbs)
    return {
      ...totals,
      macroSum,
      proteinShare: macroSum > 0 ? totals.protein / macroSum : 0,
      fatShare: macroSum > 0 ? totals.fat / macroSum : 0,
      carbsShare: macroSum > 0 ? totals.carbs / macroSum : 0,
    }
  }, [mealEntries])

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
      <div className="nutrition-plan-intro">
        <p className="nutrition-plan-intro-title">Рацион подобран на основе ваших показателей</p>
      </div>
      <DayCalendar startDate={planStartDate} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {(isLoading || isRegenerating) && (
        <div className="nutrition-plan-loading">
          <span className="nutrition-plan-loading-spinner" aria-hidden="true" />
          {isRegenerating ? 'Обновляем рацион…' : 'Загружаем рацион…'}
        </div>
      )}

      {loadError && !isLoading && !isRegenerating && (
        <p className="nutrition-plan-error" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && !isRegenerating && !loadError && ration.length > 0 && mealEntries.map((entry, index) => {
        const m = entry.meal
        return (
          <MealCard
            key={`${entry.key}-${m?.id ?? index}`}
            mealType={entry.showHeader ? entry.label : ''}
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

      {!isLoading && !isRegenerating && !loadError && ration.length > 0 ? (
        <section className="nutrition-day-summary">
          <h3 className="nutrition-day-summary-title">Итого за день</h3>
          <div className="nutrition-day-summary-kcal">
            <span className="nutrition-day-summary-kcal-value">{Math.round(dayTotals.kcal)}</span>
            <span className="nutrition-day-summary-kcal-unit">ккал</span>
          </div>

          <div className="nutrition-day-summary-bar" aria-hidden="true">
            <div
              className="nutrition-day-summary-segment nutrition-day-summary-segment--protein"
              style={{ flex: dayTotals.proteinShare || 0 }}
            />
            <div
              className="nutrition-day-summary-segment nutrition-day-summary-segment--fat"
              style={{ flex: dayTotals.fatShare || 0 }}
            />
            <div
              className="nutrition-day-summary-segment nutrition-day-summary-segment--carbs"
              style={{ flex: dayTotals.carbsShare || 0 }}
            />
          </div>

          <div className="nutrition-day-summary-legend">
            <div className="nutrition-day-summary-legend-item">
              <span className="nutrition-day-summary-dot nutrition-day-summary-dot--protein" />
              <span>Белки {Math.round(dayTotals.protein)}г</span>
            </div>
            <div className="nutrition-day-summary-legend-item">
              <span className="nutrition-day-summary-dot nutrition-day-summary-dot--fat" />
              <span>Жиры {Math.round(dayTotals.fat)}г</span>
            </div>
            <div className="nutrition-day-summary-legend-item">
              <span className="nutrition-day-summary-dot nutrition-day-summary-dot--carbs" />
              <span>Углев. {Math.round(dayTotals.carbs)}г</span>
            </div>
          </div>
        </section>
      ) : null}

      {!isLoading && !isRegenerating && !loadError && ration.length > 0 ? (
        <button type="button" className="nutrition-plan-reroll-btn" onClick={handleRegenerateRation}>
          <img src="/restart.svg" alt="" aria-hidden="true" />
          <span>Подобрать другой рацион</span>
        </button>
      ) : null}

      {!isLoading && !isRegenerating && !loadError && ration.length > 0 ? (
        <div className="nutrition-plan-footer">
          <div className="nutrition-plan-footer-divider" aria-hidden="true" />
          <p className="nutrition-plan-footer-caption">Рацион на 7 дней</p>
          <button
            type="button"
            className="nutrition-plan-cart-btn"
            onClick={() => navigate('/cart', { state: rationId ? { rationId } : {} })}
          >
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
