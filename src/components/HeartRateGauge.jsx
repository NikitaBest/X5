import { useEffect, useState } from 'react'
import './HeartRateGauge.css'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Маппим пульс на угол стрелки по всему полукругу: от левого края (-180°) до правого (0°)
function getNeedleAngle(pulse) {
  if (pulse == null || Number.isNaN(pulse)) {
    return -180 // базовое положение, если данных нет — край слева
  }

  // Расширенный рабочий диапазон: от 40 до 140 уд/мин,
  // чтобы стрелка заметно двигалась на всём полукруге
  const minPulse = 40
  const maxPulse = 140
  const clamped = clamp(pulse, minPulse, maxPulse)
  const fraction = (clamped - minPulse) / (maxPulse - minPulse) // 0..1

  const minAngle = -180
  const maxAngle = 0
  return minAngle + (maxAngle - minAngle) * fraction
}

// Плавная интерполяция цвета по той же шкале, что и цветовая дуга
function lerpColor(color1, color2, t) {
  const c1 = {
    r: parseInt(color1.slice(1, 3), 16),
    g: parseInt(color1.slice(3, 5), 16),
    b: parseInt(color1.slice(5, 7), 16),
  }
  const c2 = {
    r: parseInt(color2.slice(1, 3), 16),
    g: parseInt(color2.slice(3, 5), 16),
    b: parseInt(color2.slice(5, 7), 16),
  }

  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)

  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Цвет фона по углу: плавная интерполяция по той же шкале, что и цветовая линия
function getZoneColorByAngle(angle) {
  // Центр дуги и радиус должны совпадать с путём "M20 127 A107 107 0 0 1 234 127"
  const centerX = 127
  const radius = 107
  const leftX = 20
  const rightX = 234

  const rad = (angle * Math.PI) / 180
  const tipX = centerX + radius * Math.cos(rad)

  const fractionX = clamp((tipX - leftX) / (rightX - leftX), 0, 1) // 0..1 слева направо по шкале

  // Те же ключевые цвета, что и на дуге
  const stops = [
    { pos: 0, color: '#FF6B6B' }, // красный
    { pos: 0.33, color: '#FEC014' }, // жёлтый/оранжевый
    { pos: 0.66, color: '#C9F47A' }, // светло‑зелёный
    { pos: 1, color: '#30AD43' }, // зелёный
  ]

  // Находим два ближайших цвета и интерполируем между ними
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i]
    const b = stops[i + 1]
    if (fractionX >= a.pos && fractionX <= b.pos) {
      const localT = (fractionX - a.pos) / (b.pos - a.pos)
      return lerpColor(a.color, b.color, localT)
    }
  }

  // На крайний случай
  return stops[stops.length - 1].color
}

function HeartRateGauge({ pulse }) {
  const numericPulse = typeof pulse === 'number' ? pulse : null
  const targetAngle = getNeedleAngle(numericPulse)
  const [angle, setAngle] = useState(-180)
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
            {/* В самом низу полукруга — более мягкое, растянутое размытие */}
            <stop offset="0" stopColor={zoneColor} stopOpacity="0.12" />
            <stop offset="0.35" stopColor={zoneColor} stopOpacity="0.5" />
            {/* К середине и к верху фона цвет становится плотнее */}
            <stop offset="0.65" stopColor={zoneColor} stopOpacity="0.85" />
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
          strokeWidth="10"
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


