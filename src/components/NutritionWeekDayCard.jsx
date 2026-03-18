function clampPercent(n) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function getMacroPercents(macros) {
  const p = Number(macros?.proteinGrams ?? 0)
  const f = Number(macros?.fatGrams ?? 0)
  const c = Number(macros?.carbsGrams ?? 0)
  const sum = p + f + c
  if (sum <= 0) return { protein: 0, fat: 0, carbs: 0 }
  return {
    protein: clampPercent((p / sum) * 100),
    fat: clampPercent((f / sum) * 100),
    carbs: clampPercent((c / sum) * 100),
  }
}

function NutritionWeekDayCard({ day }) {
  const percents = getMacroPercents(day?.macros)
  const totalKcal = day?.totalKcal ?? 0

  return (
    <section className="nutrition-week-day">
      <div className="nutrition-week-day-inner">
        <div className="nutrition-week-day-header">
          <div className="nutrition-week-day-title">{day?.title}</div>
          <div className="nutrition-week-day-kcal">
            <span className="nutrition-week-day-kcal-value">{totalKcal}</span>
            <span className="nutrition-week-day-kcal-unit">ккал</span>
          </div>
        </div>

        <div className="nutrition-week-day-meals">
          {(day?.meals ?? []).map((m) => (
            <div key={m.key} className="nutrition-week-day-meal">
              <div className="nutrition-week-day-meal-slot">{m.slot}</div>
              <div className="nutrition-week-day-meal-text">{m.text}</div>
              <div className="nutrition-week-day-meal-kcal">{m.kcal}</div>
            </div>
          ))}
        </div>

        <div className="nutrition-week-day-macrobar" aria-hidden="true">
          <div
            className="nutrition-week-day-macroseg nutrition-week-day-macroseg--protein"
            style={{ width: `${percents.protein}%` }}
          />
          <div
            className="nutrition-week-day-macroseg nutrition-week-day-macroseg--fat"
            style={{ width: `${percents.fat}%` }}
          />
          <div
            className="nutrition-week-day-macroseg nutrition-week-day-macroseg--carb"
            style={{ width: `${percents.carbs}%` }}
          />
        </div>

        <div className="nutrition-week-day-macros">
          <div className="nutrition-week-day-macro">
            <span className="nutrition-week-day-dot nutrition-week-day-dot--protein" aria-hidden="true" />
            Белки {day?.macros?.proteinGrams}г
          </div>
          <div className="nutrition-week-day-macro">
            <span className="nutrition-week-day-dot nutrition-week-day-dot--fat" aria-hidden="true" />
            Жиры {day?.macros?.fatGrams}г
          </div>
          <div className="nutrition-week-day-macro">
            <span className="nutrition-week-day-dot nutrition-week-day-dot--carb" aria-hidden="true" />
            Углев. {day?.macros?.carbsGrams}г
          </div>
        </div>
      </div>
    </section>
  )
}

export default NutritionWeekDayCard

