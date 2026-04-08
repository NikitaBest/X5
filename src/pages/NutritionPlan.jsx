import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import DayCalendar from '../components/DayCalendar.jsx'
import MealCard from '../components/MealCard.jsx'
import MealDetailSheet from '../components/MealDetailSheet.jsx'
import {
  getRationByScan,
  getRationById,
  getRationGenerationStatus,
  postRationRegenerate,
  postRationItemReplace,
  getScanHistory,
  extractScanIdFromEnvelope,
} from '../api/client.js'
import { extractLastScanResponse } from '../utils/scanHistory.js'
import { readLastScanId, writeLastScanId } from '../utils/lastScanId.js'
import { readCachedRationDisplay, writeCachedRationDisplay } from '../utils/rationDisplayCache.js'
import { readLastRationIdFromStorage, writeLastRationIdToStorage } from '../utils/lastRationIdStorage.js'
import {
  setRationRegenPollPending,
  takeRationRegenPollPendingForScan,
} from '../utils/rationRegenPollStorage.js'
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

function titleWithGrams(baseTitle, grams) {
  const t = String(baseTitle ?? '').trim()
  const g = Math.round(Number(grams) || 0)
  if (!g) return t
  return t ? `${t} · ${g} г` : `${g} г`
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
    const titleBase = p?.title || (r?.productId ? `Вариант #${r.productId}` : '')
    const title = titleWithGrams(titleBase, w)
    const imageUrl =
      p && Array.isArray(p.images) && p.images[0]
        ? proxiedProductImageUrl(p.images[0]) || null
        : null
    const composition = p?.mainIngrediants || p?.fullIngrediants || ''
    return {
      id: r?.id ?? r?.productId ?? '',
      productId: Number(r?.productId ?? p?.id ?? 0) || null,
      weigth: w,
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
  const title = titleWithGrams(p.title || '', w)
  return {
    id: food.id,
    productId: Number(food?.productId ?? p?.id ?? 0) || null,
    weigth: w,
    title,
    shortTitle: truncateText(title, 72),
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

function readStoredRationId() {
  return readLastRationIdFromStorage()
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
  const scanFromNav = location.state?.scanId
  const initialScanId =
    scanFromNav != null && String(scanFromNav).trim()
      ? String(scanFromNav).trim()
      : readLastScanId()

  const [scanId, setScanId] = useState(initialScanId)
  const [scanResolved, setScanResolved] = useState(() => Boolean(!token || initialScanId))

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const planStartDate = useMemo(() => getPlanStartDateTomorrow(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(planStartDate)

  const [ration, setRation] = useState(() => readCachedRationDisplay()?.rows ?? [])
  const [rationId, setRationId] = useState(() => readCachedRationDisplay()?.rationId ?? null)
  const [loadError, setLoadError] = useState(null)
  const [rationFetchPending, setRationFetchPending] = useState(
    () => Boolean(token && initialScanId && !(readCachedRationDisplay()?.rows?.length)),
  )
  const [isRegenerating, setIsRegenerating] = useState(false)
  const allergiesRegenPollSessionRef = useRef(0)

  const [mealEntries, setMealEntries] = useState([])

  const [activeSlot, setActiveSlot] = useState(null)
  const [openReplaceView, setOpenReplaceView] = useState(false)

  const handleNutritionBack = useCallback(() => {
    const st = location.state
    const to =
      typeof st?.returnTo === 'string' && st.returnTo.startsWith('/') ? st.returnTo : '/results'
    const sid = (scanId && String(scanId).trim()) || readLastScanId()
    if (sid) {
      navigate(to, { replace: true, state: { scanId: String(sid).trim() } })
    } else {
      navigate(to, { replace: true })
    }
  }, [navigate, location.state, scanId])

  const allergiesHeaderSlot = token ? (
    <button
      type="button"
      className="header-allergies-btn"
      aria-label="Аллергии и исключения"
      onClick={() => {
        const sid = (scanId && String(scanId).trim()) || readLastScanId()
        navigate('/allergies', {
          state: {
            returnTo: '/nutrition',
            ...(sid ? { scanId: String(sid).trim() } : {}),
          },
        })
      }}
    >
      <img src="/allerg.svg" alt="" width={28} height={28} />
    </button>
  ) : null

  useEffect(() => {
    const sid = location.state?.scanId
    if (sid == null || !String(sid).trim()) return
    const s = String(sid).trim()
    setScanId(s)
    writeLastScanId(s)
    setScanResolved(true)
  }, [location.state?.scanId])

  useEffect(() => {
    if (!token) {
      setScanResolved(true)
      return undefined
    }
    if (scanId) {
      setScanResolved(true)
      return undefined
    }
    let cancelled = false
    setScanResolved(false)
    getScanHistory(token, { pageNumber: 1, pageSize: 10 })
      .then((data) => {
        if (cancelled) return
        const last = extractLastScanResponse(data)
        let id = extractScanIdFromEnvelope(last)
        if (!id) id = extractScanIdFromEnvelope(data)
        if (id) {
          setScanId(id)
          writeLastScanId(id)
        }
      })
      .catch((err) => {
        if (!cancelled) logger.warn('nutrition: resolve scanId from history failed', err)
      })
      .finally(() => {
        if (!cancelled) setScanResolved(true)
      })
    return () => {
      cancelled = true
    }
  }, [token, scanId])

  const loadRation = useCallback(async () => {
    if (!token) return false

    const applyPayload = (data) => {
      if (!data || typeof data !== 'object') return false
      if (data.isSuccess === false) return false
      const rows = extractRationRows(data)
      if (!rows.length) return false
      const nextRationId = extractRationId(data)
      setRationId(nextRationId)
      if (nextRationId) {
        writeLastRationIdToStorage(nextRationId)
      }
      setRation(rows)
      writeCachedRationDisplay(rows, nextRationId)
      return true
    }

    if (scanId) {
      try {
        const data = await getRationByScan(token, scanId)
        if (applyPayload(data)) return true
      } catch (err) {
        logger.warn('nutrition: getRationByScan failed', err)
      }
    }

    const storedRationId = readStoredRationId()
    if (storedRationId) {
      try {
        const data = await getRationById(token, storedRationId)
        if (applyPayload(data)) return true
      } catch (err) {
        logger.warn('nutrition: getRationById failed', err)
      }
    }

    throw new Error(
      scanId || storedRationId
        ? 'Не удалось загрузить рацион. Попробуйте ещё раз.'
        : 'Рацион пока пуст. Попробуйте обновить позже.',
    )
  }, [scanId, token])

  const loadRationRef = useRef(loadRation)
  loadRationRef.current = loadRation

  useLayoutEffect(() => {
    if (!token || !scanResolved) {
      if (!token) setRationFetchPending(false)
      return undefined
    }

    let cancelled = false
    const hadCachedAtStart = ration.length > 0
    setRationFetchPending(true)
    setLoadError(null)

    loadRation()
      .then(() => {
        if (cancelled) return
      })
      .catch((err) => {
        if (cancelled) return
        logger.warn('nutrition: load ration failed', err)
        setLoadError(err?.message || 'Не удалось загрузить рацион. Попробуйте ещё раз.')
        if (!hadCachedAtStart) {
          setRation([])
          setRationId(null)
        }
      })
      .finally(() => {
        if (!cancelled) setRationFetchPending(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, scanResolved, scanId, loadRation])

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

  const handleReplaceMeal = useCallback(async (entryIndex, newMeal) => {
    const entry = mealEntries[entryIndex]
    const currentMeal = entry?.meal
    const rationItemId = currentMeal?.id
    const nextProductId = Number(newMeal?.productId ?? 0)
    const nextWeigth = Number(newMeal?.weigth ?? newMeal?.weight ?? currentMeal?.weigth ?? currentMeal?.weight ?? 0)

    if (!rationItemId || !Number.isFinite(nextProductId) || nextProductId <= 0) {
      setLoadError('Не удалось заменить блюдо. Попробуйте выбрать другой вариант.')
      return
    }

    try {
      setLoadError(null)
      await postRationItemReplace(token, {
        id: String(rationItemId),
        productId: nextProductId,
        weigth: Number.isFinite(nextWeigth) && nextWeigth > 0 ? nextWeigth : 100,
      })
      await loadRation()
    } catch (err) {
      logger.warn('nutrition: replace item failed', err)
      setLoadError('Не удалось заменить блюдо. Попробуйте ещё раз.')
    }
  }, [mealEntries, token, loadRation])

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

  /**
   * После аллергий: опрос статуса как у «Подобрать другой рацион».
   * Старт по sessionStorage и/или pendingRationRegeneration в location.state — чтобы не терять
   * опрос при повторном монтировании (Strict Mode) после take() из storage.
   * Не зависим от loadRation. sessionRef не даёт старому finally сбросить isRegenerating, если уже идёт новая сессия.
   */
  useLayoutEffect(() => {
    if (!token || !scanId) return undefined
    const claimedStorage = takeRationRegenPollPendingForScan(scanId)
    const pendingFromNav = location.state?.pendingRationRegeneration === true
    if (!claimedStorage && !pendingFromNav) return undefined

    const session = ++allergiesRegenPollSessionRef.current
    const preserveReturnTo =
      typeof location.state?.returnTo === 'string' && location.state.returnTo.startsWith('/')
        ? location.state.returnTo
        : undefined
    const clearPendingRationRegenNav = () => {
      navigate(location.pathname, {
        replace: true,
        state: {
          scanId: String(scanId),
          ...(preserveReturnTo ? { returnTo: preserveReturnTo } : {}),
        },
      })
    }

    let cancelled = false
    setIsRegenerating(true)
    setLoadError(null)
    setActiveSlot(null)
    setOpenReplaceView(false)

    ;(async () => {
      let terminal = false
      try {
        const startedAt = Date.now()
        while (Date.now() - startedAt < RATION_POLL_TIMEOUT_MS) {
          if (cancelled) return
          try {
            const statusData = await getRationGenerationStatus(token, scanId)
            const status = parseRationStatus(statusData)
            if (status === WEEK_RATION_STATUS.Completed) {
              await loadRationRef.current()
              terminal = true
              clearPendingRationRegenNav()
              return
            }
            if (status === WEEK_RATION_STATUS.Failed) {
              setLoadError('Не удалось перегенерировать рацион. Попробуйте позже.')
              terminal = true
              clearPendingRationRegenNav()
              return
            }
          } catch (err) {
            logger.warn('nutrition: regenerate status poll failed (from allergies)', err)
          }
          await new Promise((resolve) => setTimeout(resolve, RATION_POLL_MS))
        }
        setLoadError('Перегенерация заняла слишком много времени. Попробуйте позже.')
        terminal = true
        clearPendingRationRegenNav()
      } finally {
        if (!terminal && cancelled) {
          setRationRegenPollPending(scanId)
        }
        if (allergiesRegenPollSessionRef.current === session) {
          setIsRegenerating(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, scanId, location.state?.pendingRationRegeneration, navigate, location.pathname])

  const activeMeal = activeSlot != null ? mealEntries[activeSlot]?.meal : null
  const mealType = activeSlot != null ? mealEntries[activeSlot]?.label : null
  const activeAlternatives = activeSlot != null ? mealEntries[activeSlot]?.alternatives ?? [] : []
  const isMealSheetOpen = activeSlot != null
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

  if (!token) {
    return (
      <Page className="results-page">
        <Header title="Ваш рацион" showBack onBack={handleNutritionBack} endSlot={allergiesHeaderSlot} />
        <div className="nutrition-plan-empty">
          <p className="nutrition-plan-empty-text">Требуется авторизация для загрузки рациона.</p>
        </div>
      </Page>
    )
  }

  if (
    scanResolved &&
    !rationFetchPending &&
    !isRegenerating &&
    ration.length === 0 &&
    !loadError
  ) {
    return (
      <Page className="results-page">
        <Header title="Ваш рацион" showBack onBack={handleNutritionBack} endSlot={allergiesHeaderSlot} />
        <div className="nutrition-plan-empty">
          <p className="nutrition-plan-empty-text">
            Чтобы увидеть персональный рацион, сначала пройдите сканирование и откройте эту страницу из блока результатов.
          </p>
          <button type="button" className="results-button" onClick={() => navigate('/results', { replace: true })}>
            К результатам
          </button>
        </div>
      </Page>
    )
  }

  return (
    <Page className={`results-page${isMealSheetOpen ? ' nutrition-plan--sheet-open' : ''}`.trim()}>
      <Header title="Ваш рацион" showBack onBack={handleNutritionBack} endSlot={allergiesHeaderSlot} />
      <div className="nutrition-plan-intro">
        <p className="nutrition-plan-intro-title">Рацион подобран на основе ваших показателей, целей и данных профиля</p>
      </div>
      <DayCalendar
        startDate={planStartDate}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        belowDateText="Рацион на неделю вперёд — начинаем со следующего дня."
      />

      {isRegenerating ? (
        <>
          <div className="nutrition-plan-loading">
            <span className="nutrition-plan-loading-spinner" aria-hidden="true" />
            Обновляем рацион…
          </div>
          <p className="nutrition-plan-reroll-hint">Ваш рацион будет готов примерно через 1 минуту</p>
        </>
      ) : null}

      {loadError && !rationFetchPending && !isRegenerating && (
        <p className="nutrition-plan-error" role="alert">
          {loadError}
        </p>
      )}

      {!isRegenerating && !loadError && ration.length > 0 && mealEntries.map((entry, index) => {
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

      {!isRegenerating && !loadError && ration.length > 0 ? (
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

      {!isRegenerating && !loadError && ration.length > 0 && scanId ? (
        <>
          <button type="button" className="nutrition-plan-reroll-btn" onClick={handleRegenerateRation}>
            <img src="/restart.svg" alt="" aria-hidden="true" />
            <span>Подобрать другой рацион</span>
          </button>
          <p className="nutrition-plan-reroll-hint">Ваш рацион будет готов примерно через 1 минуту</p>
        </>
      ) : null}

      {!isRegenerating && !loadError && ration.length > 0 ? (
        <div className="nutrition-plan-footer">
          <div className="nutrition-plan-footer-divider" aria-hidden="true" />
          <p className="nutrition-plan-footer-caption">Рацион на 7 дней</p>
          <button
            type="button"
            className="nutrition-plan-cart-btn"
            onClick={() =>
              navigate('/cart', {
                state: rationId
                  ? { rationId, returnTo: '/nutrition' }
                  : { returnTo: '/nutrition' },
              })
            }
          >
            Перейти к списку покупок
          </button>
        </div>
      ) : null}

      <MealDetailSheet
        open={isMealSheetOpen}
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
