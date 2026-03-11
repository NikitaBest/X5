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

function DayCalendar() {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [selectedDate, setSelectedDate] = useState(today)

  const weekStart = useMemo(() => getWeekStart(today), [today])
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + index)
        return d
      }),
    [weekStart],
  )

  return (
    <div className="day-calendar">
      <div className="day-calendar-row">
        {days.map((date, index) => {
          const isSelected = date.getTime() === selectedDate.getTime()
          const weekdayLabel = WEEKDAY_LABELS[index]
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
      <div className="day-calendar-date">{formatFullDate(selectedDate)}</div>
    </div>
  )
}

export default DayCalendar

