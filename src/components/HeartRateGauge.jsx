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
          {/* Фон внутри полукруга: цвет зависит от зоны, куда указывает стрелка */}
          <radialGradient id="hr-gauge-bg" cx="50%" cy="100%" r="80%">
            <stop offset="0" stopColor={zoneColor} stopOpacity="0.35" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Фоновый розовый полукруг */}
        <path
          d="M20 127 A107 107 0 0 1 234 127 L234 140 L20 140 Z"
          fill="url(#hr-gauge-bg)"
        />

        {/* Основная цветная шкала — полукруг, как на макете */}
        <path
          d="M20 127 A107 107 0 0 1 234 127"
          fill="none"
          stroke="url(#hr-gauge-arc)"
          strokeWidth="16"
          strokeLinecap="round"
        />

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


