import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { normalizeGoalsToCodes } from '../utils/goals.js'
import PrimaryButton from '../components/PrimaryButton.jsx'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import RadioCard from '../ui/RadioCard.jsx'
import './Welcome.css'

/** Политика конфиденциальности (Google Docs). */
const PRIVACY_POLICY_URL =
  'https://docs.google.com/document/d/195F-F1FnvYhJrSAv6yNNh8ZR10khf6tpu-MWxeL9st0/edit?tab=t.0'

/** Правила использования (Google Docs). */
const USAGE_RULES_URL =
  'https://docs.google.com/document/d/1TOT0pCYPori4p4MS2s5xxgu9e_DGkbw612-G5HDkIjM/edit?tab=t.0'

function welcomeGoalIcon(src) {
  const dense = src !== '/lightning-01.svg'
  return (
    <span
      className={dense ? 'welcome-goal-icon-mask welcome-goal-icon-mask--dense' : 'welcome-goal-icon-mask'}
      style={{ '--goal-icon-src': `url("${src}")` }}
      aria-hidden
    />
  )
}

const GOAL_OPTIONS = [
  {
    value: 'sugar',
    label: 'Взять вес под контроль',
    icon: welcomeGoalIcon('/ves.svg'),
  },
  {
    value: 'lightness',
    label: 'Дополнительные витамины',
    icon: welcomeGoalIcon('/vita.svg'),
  },
  {
    value: 'energy',
    label: 'Получить заряд бодрости',
    icon: welcomeGoalIcon('/lightning-01.svg'),
  },
  {
    value: 'immunity',
    label: 'Укрепить иммунитет',
    icon: welcomeGoalIcon('/umum.svg'),
  },
  {
    value: 'shopping',
    label: 'Быстрое восстановление',
    icon: welcomeGoalIcon('/vossta.svg'),
  },
]

function Welcome() {
  const navigate = useNavigate()
  const { userData, updateUserData } = useUserData()
  const [selectedGoals, setSelectedGoals] = useState(() => normalizeGoalsToCodes(userData?.goals))
  const [acceptTerms, setAcceptTerms] = useState(false)
  const userEditedGoalsRef = useRef(false)

  useEffect(() => {
    if (userEditedGoalsRef.current) return
    const fromContext = normalizeGoalsToCodes(userData?.goals)
    if (fromContext.length === 0) return
    setSelectedGoals((prev) => (prev.length === 0 ? fromContext : prev))
  }, [userData?.goals])

  const handleGoalToggle = (value) => {
    userEditedGoalsRef.current = true
    setSelectedGoals((prev) => {
      // если цель уже выбрана — снимаем выбор
      if (prev.includes(value)) {
        return prev.filter((goal) => goal !== value)
      }

      // если выбрано меньше 2 целей — просто добавляем
      if (prev.length < 2) {
        return [...prev, value]
      }

      // если уже выбраны 2 цели и пользователь выбирает третью —
      // заменяем последнюю выбранную новой (сохраняем первую)
      return [prev[0], value]
    })
  }

  const handleNext = () => {
    // сохраняем выбранные цели в контекст пользователя
    updateUserData({ goals: selectedGoals })
    navigate('/algorithm-settings')
  }

  const selectedCount = selectedGoals.length
  const hasValidGoals = selectedCount >= 1 && selectedCount <= 2
  const canProceed = hasValidGoals && acceptTerms

  return (
    <Page className="welcome-page">
      <Header title="Цели" showBack={false} />
      <ProgressBar currentStep={1} totalSteps={3} />
      
      <div className="welcome-content">
        <h1 className="welcome-heading">Что сейчас важнее?</h1>
        <p className="welcome-subtitle">
          Выберите 1-2 цели и мы подберём питание
        </p>

        <div className="welcome-goals">
          {GOAL_OPTIONS.map((option) => (
            <RadioCard
              key={option.value}
              icon={option.icon}
              label={option.label}
              value={option.value}
              selected={selectedGoals.includes(option.value)}
              onClick={handleGoalToggle}
            />
          ))}
        </div>
      </div>

      <div className="welcome-footer">
        <label className="welcome-consent">
          <input
            type="checkbox"
            className="welcome-consent-checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <span className="welcome-consent-text">
            Я соглашаюсь с{' '}
            <a
              className="welcome-consent-link"
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Политикой конфиденциальности
            </a>{' '}
            и{' '}
            <a
              className="welcome-consent-link"
              href={USAGE_RULES_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Правилами использования
            </a>
          </span>
        </label>

        {hasValidGoals && (
          <div className="welcome-success-message">
            <img src="/cel.svg" alt="" className="welcome-success-icon" aria-hidden="true" />
            <span>
              Отлично! Сфокусируемся на {selectedCount === 1 ? 'этой цели' : 'этих двух целях'}.
            </span>
          </div>
        )}
        <PrimaryButton onClick={handleNext} disabled={!canProceed}>
          Продолжить
        </PrimaryButton>
      </div>
    </Page>
  )
}

export default Welcome
