import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useUserData } from '../contexts/UserDataContext.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import RadioCard from '../ui/RadioCard.jsx'
import './Welcome.css'

const GOAL_OPTIONS = [
  {
    value: 'sugar',
    label: 'Взять сахар под контроль',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21M3 8H21M3 16H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  {
    value: 'lightness',
    label: 'Обрести лёгкость',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2V22M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    ),
  },
  {
    value: 'energy',
    label: 'Получить заряд бодрости',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  {
    value: 'immunity',
    label: 'Укрепить иммунитет',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  {
    value: 'shopping',
    label: 'Выгодно покупать полезное',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
]

function Welcome() {
  const navigate = useNavigate()
  const { updateUserData } = useUserData()
  const [selectedGoals, setSelectedGoals] = useState([])

  const handleGoalToggle = (value) => {
    setSelectedGoals((prev) => {
      if (prev.includes(value)) {
        return prev.filter((goal) => goal !== value)
      } else if (prev.length < 2) {
        return [...prev, value]
      }
      return prev
    })
  }

  const handleNext = () => {
    // сохраняем выбранные цели в контекст пользователя
    updateUserData({ goals: selectedGoals })
    navigate('/recent-activity')
  }

  const selectedCount = selectedGoals.length
  const canProceed = selectedCount >= 1 && selectedCount <= 2

  return (
    <Page className="welcome-page">
      <Header title="Смарт анализ" showBack={false} />
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
        {canProceed && (
          <div className="welcome-success-message">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="#5DAF2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
