import { useEffect, useState } from 'react'
import './HeartRateGauge.css'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Маппим пульс на угол стрелки: от -90° (низкий) до +90° (высокий)
function getNeedleAngle(pulse) {
  if (pulse == null || Number.isNaN(pulse)) {
    return -60 // базовое положение, если данных нет
  }

  // Для теста: сжимаем диапазон в узкий коридор 75–90 уд/мин,
  // чтобы было лучше видно, как стрелка двигается в этой зоне.
  const minPulse = 75
  const maxPulse = 90
  const clamped = clamp(pulse, minPulse, maxPulse)
  const fraction = (clamped - minPulse) / (maxPulse - minPulse) // 0..1

  const minAngle = -90
  const maxAngle = 0
  return minAngle + (maxAngle - minAngle) * fraction
}

// Цвет зоны по углу: совпадает с основными цветами шкалы, считаем по X-координате кончика стрелки
function getZoneColorByAngle(angle) {
  // Центр дуги и радиус должны совпадать с путём "M20 127 A107 107 0 0 1 234 127"
  const centerX = 127
  const radius = 107
  const leftX = 20
  const rightX = 234

  const rad = (angle * Math.PI) / 180
  const tipX = centerX + radius * Math.cos(rad)

  const fractionX = clamp((tipX - leftX) / (rightX - leftX), 0, 1) // 0..1 слева направо по шкале

  // Сегменты по X: 0–0.25 красный, 0.25–0.5 оранжевый, 0.5–0.75 светло‑зелёный, 0.75–1 зелёный
  if (fractionX <= 0.25) return '#FF6B6B'
  if (fractionX <= 0.5) return '#FEC014'
  if (fractionX <= 0.75) return '#C9F47A'
  return '#30AD43'
}

function HeartRateGauge({ pulse }) {
  const numericPulse = typeof pulse === 'number' ? pulse : null
  const targetAngle = getNeedleAngle(numericPulse)
  const [angle, setAngle] = useState(-90)
  const zoneColor = getZoneColorByAngle(angle)

  // Генерируем белые штрихи по всей дуге, как на примере
  const TICK_COUNT = 60
  const centerX = 127
  const centerY = 127
  // Радиусы для штрихов подогнаны под радиус фонового полукруга (95),
  // чтобы деления шли по границе зелёного фона, а не по внешней цветной дуге
  const innerRadius = 88
  const outerRadius = 95

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const fraction = i / (TICK_COUNT - 1) // 0..1 по всей дуге
    // Угол вдоль ВЕРХНЕГО полукруга: слева (-180°) → через верх (-90°) → справа (0°)
    const angleDeg = -180 + fraction * 180
    const rad = (angleDeg * Math.PI) / 180

    const x1 = centerX + innerRadius * Math.cos(rad)
    const y1 = centerY + innerRadius * Math.sin(rad)
    const x2 = centerX + outerRadius * Math.cos(rad)
    const y2 = centerY + outerRadius * Math.sin(rad)

    const isMajor = i % 5 === 0

    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#FFFFFF"
        strokeWidth={isMajor ? 2 : 1}
        strokeLinecap="round"
        opacity={0.9}
      />
    )
  })

  // При входе на страницу плавно анимируем стрелку из левого края к целевому углу
  useEffect(() => {
    setAngle(targetAngle)
  }, [targetAngle])

  return (
    <div className="hr-gauge">
      <svg
        className="hr-gauge-svg"
        viewBox="0 0 254 140"
        aria-hidden="true"
      >
        <defs>
          {/* Цветная шкала: слева красный → оранжевый → светло-зелёный → насыщенный зелёный */}
          <linearGradient id="hr-gauge-arc" x1="0" y1="140" x2="254" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FF6B6B" />       {/* красный */}
            <stop offset="0.33" stopColor="#FEC014" />    {/* оранжевый */}
            <stop offset="0.66" stopColor="#C9F47A" />    {/* светло-зелёный */}
            <stop offset="1" stopColor="#30AD43" />       {/* зелёный */}
          </linearGradient>
          {/* Фон внутри полукруга: полукруг чуть меньшего радиуса, чем цветная дуга,
              с плавным размытием цвета снизу вверх */}
          <linearGradient
            id="hr-gauge-bg"
            x1="0"
            y1="127"
            x2="0"
            y2="20"
            gradientUnits="userSpaceOnUse"
          >
            {/* В самом низу полукруга цвет более светлый */}
            <stop offset="0" stopColor={zoneColor} stopOpacity="0.4" />
            <stop offset="0.25" stopColor={zoneColor} stopOpacity="0.6" />
            {/* К середине и к верху фона цвет становится плотнее */}
            <stop offset="0.6" stopColor={zoneColor} stopOpacity="0.85" />
            <stop offset="1" stopColor={zoneColor} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Фоновый полукруг меньшего радиуса — даёт зазор под цветной линией */}
        <path
          d="M32 127 A95 95 0 0 1 222 127 L32 127 Z"
          fill="url(#hr-gauge-bg)"
        />

        {/* Основная цветная шкала — полукруг, как на макете */}
        <path
          d="M20 127 A107 107 0 0 1 234 127"
          fill="none"
          stroke="url(#hr-gauge-arc)"
          strokeWidth="16"
          strokeLinecap="butt"
        />

        {/* Внутренние белые штрихи‑деления по дуге */}
        {ticks}

        {/* Центральная точка */}
        <circle
          cx="127"
          cy="127"
          r="10"
          fill="#323232"
          stroke="#FFFFFF"
          strokeWidth="3"
        />

        {/* Стрелка: толстая часть у центра, острый черный кончик у шкалы */}
        <g
          className="hr-gauge-needle-group"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <polygon
            points="127,123 127,131 230,127"
            fill="#323232"
          />
        </g>
      </svg>
    </div>
  )
}

export default HeartRateGauge


