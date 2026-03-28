import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { putUserUpdate } from '../api/client.js'
import logger from '../utils/logger.js'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import RadioCard from '../ui/RadioCard.jsx'
import NumberInput from '../ui/NumberInput.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import './AlgorithmSettings.css'

const GENDER_OPTIONS = [
  {
    value: 'male',
    label: 'Мужской',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" fill="currentColor"/>
        <path d="M15 7H9C8.73478 7 8.48043 7.10536 8.29289 7.29289C8.10536 7.48043 8 7.73478 8 8V15H10V22H14V15H16V8C16 7.73478 15.8946 7.48043 15.7071 7.29289C15.5196 7.10536 15.2652 7 15 7Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    value: 'female',
    label: 'Женский',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" fill="currentColor"/>
        <path d="M14.948 7.684C14.8817 7.48496 14.7545 7.3118 14.5844 7.18905C14.4142 7.0663 14.2098 7.00016 14 7H10C9.79021 7.00016 9.58578 7.0663 9.41565 7.18905C9.24551 7.3118 9.1183 7.48496 9.052 7.684L7.052 13.684L8.827 14.277L8 18H10V22H14V18H16L15.173 14.276L16.948 13.683L14.948 7.684Z" fill="currentColor"/>
      </svg>
    ),
  },
]

const SMOKING_OPTIONS = [
  {
    value: 'no',
    label: 'Не курю',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 16H17V19H2V16ZM20.5 16H22V19H20.5V16ZM18 16H19.5V19H18V16ZM18.85 7.73C19.47 7.12 19.85 6.28 19.85 5.35C19.85 3.5 18.35 2 16.5 2V3.5C17.5 3.5 18.35 4.33 18.35 5.35C18.35 6.37 17.5 7.2 16.5 7.2V8.7C18.74 8.7 20.5 10.53 20.5 12.77V15H22V12.76C22 10.54 20.72 8.62 18.85 7.73ZM16.03 10.2H14.5C13.5 10.2 12.65 9.22 12.65 8.2C12.65 7.18 13.5 6.45 14.5 6.45V4.95C13.6115 4.95 12.7594 5.30295 12.1312 5.93119C11.5029 6.55944 11.15 7.41152 11.15 8.3C11.15 9.18848 11.5029 10.0406 12.1312 10.6688C12.7594 11.2971 13.6115 11.65 14.5 11.65H16.03C17.08 11.65 18 12.39 18 13.7V15H19.5V13.36C19.5 11.55 17.9 10.2 16.03 10.2Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    value: 'yes',
    label: 'Курю',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 2H16C15.4477 2 15 2.44772 15 3V5C15 5.55228 15.4477 6 16 6H18C18.5523 6 19 5.55228 19 5V3C19 2.44772 18.5523 2 18 2Z" fill="currentColor"/>
        <path d="M17 6V8C17 8.55228 17.4477 9 18 9H20C20.5523 9 21 8.55228 21 8V6H17Z" fill="currentColor"/>
        <path d="M19 9V11C19 11.5523 19.4477 12 20 12H21C21.5523 12 22 11.5523 22 11V9H19Z" fill="currentColor"/>
        <path d="M20 12V14C20 14.5523 20.4477 15 21 15H22C22.5523 15 23 14.5523 23 14V12H20Z" fill="currentColor"/>
        <path d="M3 16H17V19H3V16Z" fill="currentColor"/>
      </svg>
    ),
  },
]

function goalCodeToRu(goal) {
  const key = String(goal ?? '').trim().toLowerCase()
  if (!key) return ''
  const map = {
    sugar: 'Взять вес под контроль',
    lightness: 'Дополнительные витамины',
    energy: 'Получить заряд бодрости',
    immunity: 'Укрепить иммунитет',
    shopping: 'Быстрое восстановление',
  }
  return map[key] || String(goal).trim()
}

function AlgorithmSettings() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { userData, updateUserData } = useUserData()
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [ageError, setAgeError] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [heightError, setHeightError] = useState('')
  const [weightError, setWeightError] = useState('')
  const [smokingStatus, setSmokingStatus] = useState('')

  // При возврате на экран заполняем поля из сохранённых данных пользователя
  useEffect(() => {
    if (userData?.gender) {
      setGender(userData.gender === 'MALE' ? 'male' : userData.gender === 'FEMALE' ? 'female' : '')
    }
    if (userData?.age != null) {
      setAge(String(userData.age))
    }
    if (userData?.height != null) {
      setHeight(String(userData.height))
    }
    if (userData?.weight != null) {
      setWeight(String(userData.weight))
    }
    if (userData?.smokingStatus) {
      setSmokingStatus(
        userData.smokingStatus === 'SMOKER'
          ? 'yes'
          : userData.smokingStatus === 'NON_SMOKER'
            ? 'no'
            : '',
      )
    }
  }, [userData])

  const parsedAge = Number(age)
  const isValidAge = Number.isFinite(parsedAge) && parsedAge >= 18 && parsedAge <= 120

  const getAgeWord = (value) => {
    const lastDigit = value % 10
    const lastTwoDigits = value % 100

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'лет'
    if (lastDigit === 1) return 'год'
    if (lastDigit >= 2 && lastDigit <= 4) return 'года'
    return 'лет'
  }
  
  // Флаги этапов для поэтапного появления блоков
  const hasGenderStepDone = !!gender
  const hasAgeStepDone = isValidAge
  const hasPhysicalStepDone = hasAgeStepDone && !!height && !!weight

  // Валидация всех обязательных полей
  const isFormValid = 
    gender && 
    isValidAge && 
    !heightError &&
    !weightError &&
    height && 
    weight && 
    smokingStatus

  const handleNext = async () => {
    if (!isFormValid) {
      if (!age) {
        setAgeError('Укажите возраст')
      } else if (!isValidAge) {
        setAgeError('Возраст должен быть от 18 до 120 лет')
      }
      if (!height) {
        setHeightError('Укажите рост')
      }
      if (!weight) {
        setWeightError('Укажите вес')
      }
      return
    }

    const userDataToSave = {
      gender: gender === 'male' ? 'MALE' : 'FEMALE',
      age: parsedAge,
      weight: parseFloat(weight),
      height: parseFloat(height),
      smokingStatus: smokingStatus === 'yes' ? 'SMOKER' : 'NON_SMOKER',
    }

    logger.user('Данные пользователя сохранены', userDataToSave)
    updateUserData(userDataToSave)

    const payload = {
      age: userDataToSave.age ?? 0,
      height: userDataToSave.height ?? 0,
      weight: userDataToSave.weight ?? 0,
      gender: userDataToSave.gender === 'MALE' ? 0 : userDataToSave.gender === 'FEMALE' ? 1 : 0,
      smokeStatus: userDataToSave.smokingStatus === 'SMOKER' ? 1 : 0,
      goals: Array.isArray(userData?.goals)
        ? userData.goals.map(goalCodeToRu).filter(Boolean)
        : [],
    }

    try {
      await putUserUpdate(token, payload)
    } catch (err) {
      logger.warn('Не удалось отправить данные на сервер', err)
    }
    navigate('/allergies')
  }

  return (
    <Page className="algorithm-settings-page">
      <Header title="Настройка алгоритмов" />
      <ProgressBar currentStep={2} totalSteps={3} />
      
      <div className="algorithm-settings-content">
        {/* Секция выбора пола */}
        <div className="settings-section settings-section--visible">
          <h2 className="settings-section-title">Ваш пол</h2>
          <p className="settings-section-subtitle">
            Влияет на нормы артериального давления и риск ИБС
          </p>
          
          <div className="gender-options">
            {GENDER_OPTIONS.map((option) => (
              <RadioCard
                key={option.value}
                icon={option.icon}
                label={option.label}
                value={option.value}
                selected={gender === option.value}
                onClick={setGender}
              />
            ))}
          </div>

          {gender && (
            <div className="settings-note">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#5DAF2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span>Учтено в базовых параметрах</span>
            </div>
          )}
        </div>

        {/* Секция возраста – появляется после выбора пола */}
        {hasGenderStepDone && (
          <div className="settings-section settings-section--step">
            <h2 className="settings-section-title">Возраст</h2>
            <p className="settings-section-subtitle">
              Для расчёта возрастных рисков
            </p>
            <NumberInput
              value={age}
              onChange={(value) => {
                setAge(value)
                if (!value) {
                  setAgeError('Укажите возраст')
                  return
                }
                const numeric = Number(value)
                if (!Number.isFinite(numeric) || numeric < 18 || numeric > 120) {
                  setAgeError('Возраст должен быть от 18 до 120 лет')
                } else {
                  setAgeError('')
                }
              }}
              placeholder="Возраст"
              unit="лет"
              maxLength={3}
            />
            {ageError && (
              <p className="date-error-text">{ageError}</p>
            )}
            {isValidAge && !ageError && (
              <div className="settings-note">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M13.3333 4L6 11.3333L2.66667 8"
                    stroke="#5DAF2E"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span>
                  {parsedAge} {getAgeWord(parsedAge)} — учтём возрастные нормы
                </span>
              </div>
            )}
          </div>
        )}

        {/* Секция физических параметров – появляется после ввода возраста */}
        {hasAgeStepDone && (
          <div className="settings-section settings-section--step">
            <h2 className="settings-section-title">Физические параметры</h2>
            <p className="settings-section-subtitle">
              Для расчёта индекса массы тела и метаболических рисков
            </p>
            
            <div className="physical-params-inputs">
              <NumberInput
                value={height}
                onChange={(value) => {
                  setHeight(value)
                  if (!value) {
                    setHeightError('Укажите рост')
                    return
                  }
                  const numeric = Number(value)
                  if (!Number.isFinite(numeric) || numeric < 130 || numeric > 230) {
                    setHeightError('Рост должен быть от 130 до 230 см')
                  } else {
                    setHeightError('')
                  }
                }}
                placeholder="Рост"
                unit="CM"
                maxLength={3}
              />
              <NumberInput
                value={weight}
                onChange={(value) => {
                  setWeight(value)
                  if (!value) {
                    setWeightError('Укажите вес')
                    return
                  }
                  const numeric = Number(value)
                  if (!Number.isFinite(numeric) || numeric < 40 || numeric > 200) {
                    setWeightError('Вес должен быть от 40 до 200 кг')
                  } else {
                    setWeightError('')
                  }
                }}
                placeholder="Вес"
                unit="KG"
                maxLength={3}
              />
            </div>

            {(heightError || weightError) && (
              <div className="date-error-text">
                {heightError || weightError}
              </div>
            )}

            {height && weight && !heightError && !weightError && (
              <div className="settings-note">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#5DAF2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span>Учтём ваши параметры</span>
              </div>
            )}
          </div>
        )}

        {/* Секция статуса курения – появляется после ввода роста и веса */}
        {hasPhysicalStepDone && (
          <div className="settings-section settings-section--step">
            <h2 className="settings-section-title">Статус курения</h2>
            <p className="settings-section-subtitle">
              Курение увеличивает риск сердечно-сосудистых заболеваний в 2-3 раза
            </p>
            
            <div className="gender-options">
              {SMOKING_OPTIONS.map((option) => (
                <RadioCard
                  key={option.value}
                  icon={option.icon}
                  label={option.label}
                  value={option.value}
                  selected={smokingStatus === option.value}
                  onClick={setSmokingStatus}
                />
              ))}
            </div>

            {smokingStatus === 'no' && (
              <div className="settings-note">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#5DAF2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span>Риски снижены</span>
              </div>
            )}
            {smokingStatus === 'yes' && (
              <div className="settings-note">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#5DAF2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span>Риски повышены</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="algorithm-settings-footer">
        <PrimaryButton onClick={handleNext} disabled={!isFormValid}>
          Далее
        </PrimaryButton>
        <p className="algorithm-settings-hint">
          Вы сможете изменить параметры в любой момент
        </p>
      </div>
    </Page>
  )
}

export default AlgorithmSettings

