import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserData } from '../contexts/UserDataContext.jsx'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import RadioCard from '../ui/RadioCard.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import './RecentActivity.css'

const ACTIVITY_OPTIONS = [
  {
    value: 'physical',
    label: 'Физическая активность',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9L12 3L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M6 15L12 21L18 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M12 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  {
    value: 'caffeine',
    label: 'Кофеин или энергетики',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8H19C20.1046 8 21 8.89543 21 10V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V10C3 8.89543 3.89543 8 5 8H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M7 8V6C7 4.89543 7.89543 4 9 4H15C16.1046 4 17 4.89543 17 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  {
    value: 'smoking',
    label: 'Курение',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8H19C20.1046 8 21 8.89543 21 10V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V10C3 8.89543 3.89543 8 5 8H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M7 8V6C7 4.89543 7.89543 4 9 4H15C16.1046 4 17 4.89543 17 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M12 12V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M20 4L22 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  {
    value: 'none',
    label: 'Ничего из этого',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M9 12C9 12.5304 9.21071 13.0391 9.58579 13.4142C9.96086 13.7893 10.4696 14 11 14C11.5304 14 12.0391 13.7893 12.4142 13.4142C12.7893 13.0391 13 12.5304 13 12C13 11.4696 12.7893 10.9609 12.4142 10.5858C12.0391 10.2107 11.5304 10 11 10C10.4696 10 9.96086 10.2107 9.58579 10.5858C9.21071 10.9609 9 11.4696 9 12Z" fill="currentColor"/>
      </svg>
    ),
  },
]

function RecentActivity() {
  const navigate = useNavigate()
  const { updateUserData } = useUserData()
  const [selectedActivity, setSelectedActivity] = useState('none')

  const handleNext = () => {
    // сохраняем выбранную активность в контекст пользователя
    updateUserData({ recentActivity: selectedActivity })
    navigate('/preparation')
  }

  return (
    <Page className="recent-activity-page">
      <Header title="Смарт анализ" />
      <ProgressBar currentStep={2} totalSteps={3} />
      
      <div className="recent-activity-content">
        <h1 className="recent-activity-title">Для самого точного результата</h1>
        <p className="recent-activity-subtitle">
          Для самого точного результата, отметьте, что было в последний час
        </p>

        <div className="recent-activity-options">
          {ACTIVITY_OPTIONS.map((option) => (
            <RadioCard
              key={option.value}
              icon={option.icon}
              label={option.label}
              value={option.value}
              selected={selectedActivity === option.value}
              onClick={setSelectedActivity}
            />
          ))}
        </div>
      </div>

      <div className="recent-activity-footer">
        <PrimaryButton onClick={handleNext}>
          Подготовиться к точному анализу
        </PrimaryButton>
      </div>
    </Page>
  )
}

export default RecentActivity

