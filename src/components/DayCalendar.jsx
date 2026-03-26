import { useMemo, useState } from 'react'
import './DayCalendar.css'

const WEEKDAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

function formatFullDate(date) {
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function getWeekStart(date) {
  const tmp = new Date(date)
  const day = tmp.getDay() || 7 // 1..7, где 1 = понедельник
  tmp.setDate(tmp.getDate() - (day - 1))
  tmp.setHours(0, 0, 0, 0)
  return tmp
}

/**
 * @param {{ selectedDate?: Date, onSelectDate?: (d: Date) => void, startDate?: Date }} props
 * Если переданы selectedDate и onSelectDate — календарь контролируется снаружи.
 */
function DayCalendar({ selectedDate: selectedDateProp, onSelectDate, startDate, belowDateText } = {}) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [internalSelected, setInternalSelected] = useState(today)
  const selectedDate = selectedDateProp ?? internalSelected
  const setSelectedDate = onSelectDate ?? setInternalSelected

  const baseStart = useMemo(() => {
    if (startDate instanceof Date && Number.isFinite(startDate.getTime())) {
      const d = new Date(startDate)
      d.setHours(0, 0, 0, 0)
      return d
    }
    return getWeekStart(today)
  }, [startDate, today])
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const d = new Date(baseStart)
        d.setDate(baseStart.getDate() + index)
        return d
      }),
    [baseStart],
  )

  return (
    <div className="day-calendar">
      <div className="day-calendar-row">
        {days.map((date) => {
          const isSelected = date.getTime() === selectedDate.getTime()
          const weekdayLabel = WEEKDAY_LABELS[(date.getDay() + 6) % 7]
          return (
            <button
              key={date.toISOString()}
              type="button"
              className={`day-calendar-pill${isSelected ? ' day-calendar-pill--selected' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <div className="day-calendar-pill-weekday">{weekdayLabel}</div>
              <div className="day-calendar-pill-day">{date.getDate()}</div>
            </button>
          )
        })}
      </div>
      <div className="day-calendar-date-block">
        <div className="day-calendar-date">{formatFullDate(selectedDate)}</div>
        {belowDateText ? <div className="day-calendar-note">{belowDateText}</div> : null}
      </div>
    </div>
  )
}

export default DayCalendar

