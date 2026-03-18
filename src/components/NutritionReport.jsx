import { forwardRef } from 'react'
import './NutritionReport.css'

// Временные мок‑данные, пока нет бекенда
const MOCK_REPORT = {
  initials: 'AM',
  name: 'Анна',
  exclusions: ['Глютен', 'Орехи', 'Лактоза'],
  profile: {
    gender: 'Женский',
    age: 32,
    height: 168,
    weight: 62,
    smoking: 'Не курит',
  },
  goals: ['Контроль сахара', 'Здоровье сердца'],
  caloriesByDay: [
    { label: 'Пн', total: 930 },
    { label: 'Вт', total: 910 },
    { label: 'Ср', total: 670 },
    { label: 'Чт', total: 920 },
    { label: 'Пт', total: 710 },
    { label: 'Сб', total: 880 },
    { label: 'Вс', total: 870 },
  ],
  avgCalories: 841,
  bju: {
    protein: { grams: 71, percent: 46 },
    fat: { grams: 32, percent: 21 },
    carbs: { grams: 52, percent: 34 },
  },
}

/**
 * Универсальный компонент отчёта о рационе.
 * Можно использовать как для PDF, так и для публичной HTML‑страницы.
 * Через ref можно передать DOM‑узел в html2pdf.js.
 *
 * isPublic — режим публичной ссылки (сейчас влияет только на обвязку страницы).
 */
const NutritionReport = forwardRef(function NutritionReport({ report = MOCK_REPORT /*, isPublic = false */ }, ref) {
  const { initials, name, exclusions, profile, goals, caloriesByDay, avgCalories, bju } = report
  const maxDayCalories = Math.max(1, ...caloriesByDay.map((d) => d.total || 0))
  const minBarHeight = 56
  const maxBarHeight = 110
  const rawBjuPercents = {
    protein: Number(bju?.protein?.percent ?? 0),
    fat: Number(bju?.fat?.percent ?? 0),
    carbs: Number(bju?.carbs?.percent ?? 0),
  }
  const bjuPercentSum = rawBjuPercents.protein + rawBjuPercents.fat + rawBjuPercents.carbs
  const bjuPercents =
    bjuPercentSum > 0
      ? {
          protein: (rawBjuPercents.protein / bjuPercentSum) * 100,
          fat: (rawBjuPercents.fat / bjuPercentSum) * 100,
          carbs: (rawBjuPercents.carbs / bjuPercentSum) * 100,
        }
      : { protein: 0, fat: 0, carbs: 0 }

  return (
    <div ref={ref} className="nutrition-report">
      <header className="nutrition-report-header">
        <div className="nutrition-report-header-text">
          <h1 className="nutrition-report-title">Ваш рацион готов!</h1>
          <p className="nutrition-report-subtitle">
            На основе rPPG-сканирования и ваших индивидуальных целей мы подобрали сбалансированный план питания
            на неделю. Рацион учитывает ваши исключения и направлен на достижение выбранных целей здоровья.
          </p>
        </div>
      </header>

      <section className="nutrition-report-top-cards">
        <div className="nutrition-report-card">
          <h2 className="nutrition-report-card-title">Исключения</h2>
          <div className="nutrition-report-tags">
            {exclusions.map((item) => (
              <span key={item} className="nutrition-report-tag">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="nutrition-report-card nutrition-report-card--profile">
          <h2 className="nutrition-report-card-title">Профиль</h2>
          <div className="nutrition-report-profile-grid">
            <span>Пол</span>
            <span>{profile.gender}</span>
            <span>Возраст</span>
            <span>{profile.age} года</span>
            <span>Рост</span>
            <span>{profile.height} см</span>
            <span>Вес</span>
            <span>{profile.weight} кг</span>
            <span>Курение</span>
            <span className="nutrition-report-profile-accent">{profile.smoking}</span>
          </div>
        </div>

        <div className="nutrition-report-card">
          <h2 className="nutrition-report-card-title">Цели</h2>
          <ul className="nutrition-report-goals">
            {goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="nutrition-report-calories">
        <h2 className="nutrition-report-section-title">Калории по дням</h2>
        <div className="nutrition-report-bars">
          {caloriesByDay.map((day) => (
            <div key={day.label} className="nutrition-report-bar">
              <div className="nutrition-report-bar-total">{day.total}</div>
              <div className="nutrition-report-bar-chart" style={{ height: `${maxBarHeight}px` }}>
                <div
                  className="nutrition-report-bar-stack"
                  style={{
                    height: `${Math.round(
                      minBarHeight + (Math.max(0, day.total || 0) / maxDayCalories) * (maxBarHeight - minBarHeight),
                    )}px`,
                  }}
                >
                  <div className="nutrition-report-bar-segment nutrition-report-bar-segment--protein" />
                  <div className="nutrition-report-bar-segment nutrition-report-bar-segment--fat" />
                  <div className="nutrition-report-bar-segment nutrition-report-bar-segment--carb" />
                </div>
              </div>
              <div className="nutrition-report-bar-label">{day.label}</div>
            </div>
          ))}
        </div>
        <div className="nutrition-report-legend">
          <span className="dot dot--protein" /> Белки
          <span className="dot dot--fat" /> Жиры
          <span className="dot dot--carb" /> Углев.
        </div>
        <p className="nutrition-report-legend-note">
          Распределение калорий и макронутриентов по дням недели
        </p>
      </section>

      <section className="nutrition-report-bottom">
        <div className="nutrition-report-card nutrition-report-card--wide">
          <div className="nutrition-report-kcal-main">
            <span className="nutrition-report-kcal-value">{avgCalories}</span>
            <span className="nutrition-report-kcal-unit">ккал</span>
          </div>
          <div className="nutrition-report-kcal-text-main">Средний суточный калораж</div>
          <div className="nutrition-report-kcal-text-sub">
            Ваша дневная норма калорий, рассчитанная на основе rPPG‑анализа
          </div>
        </div>

        <div className="nutrition-report-card nutrition-report-card--wide">
          <h2 className="nutrition-report-card-title">Средний БЖУ / день</h2>
          <div className="nutrition-report-bju-row">
            <div className="nutrition-report-bju-item nutrition-report-bju-item--protein">
              <span className="nutrition-report-bju-grams">{bju.protein.grams}г</span>
              <span className="nutrition-report-bju-label">Белки {bju.protein.percent}%</span>
            </div>
            <div className="nutrition-report-bju-item nutrition-report-bju-item--fat">
              <span className="nutrition-report-bju-grams">{bju.fat.grams}г</span>
              <span className="nutrition-report-bju-label">Жиры {bju.fat.percent}%</span>
            </div>
            <div className="nutrition-report-bju-item nutrition-report-bju-item--carb">
              <span className="nutrition-report-bju-grams">{bju.carbs.grams}г</span>
              <span className="nutrition-report-bju-label">Углеводы {bju.carbs.percent}%</span>
            </div>
          </div>
          <div className="nutrition-report-bju-progress">
            <div
              className="nutrition-report-bju-progress-seg nutrition-report-bju-progress-seg--protein"
              style={{ width: `${bjuPercents.protein}%` }}
            />
            <div
              className="nutrition-report-bju-progress-seg nutrition-report-bju-progress-seg--fat"
              style={{ width: `${bjuPercents.fat}%` }}
            />
            <div
              className="nutrition-report-bju-progress-seg nutrition-report-bju-progress-seg--carb"
              style={{ width: `${bjuPercents.carbs}%` }}
            />
          </div>
          <div className="nutrition-report-bju-caption">
            Баланс белков, жиров и углеводов в среднем за день
          </div>
        </div>
      </section>

      <footer className="nutrition-report-disclaimer">
        Данный рацион составлен на основе rPPG‑анализа и не является медицинской рекомендацией.
        Проконсультируйтесь с врачом перед изменением диеты.
      </footer>
    </div>
  )
})

export default NutritionReport

