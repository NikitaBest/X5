import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserData } from '../contexts/UserDataContext.jsx'
import logger from '../utils/logger.js'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import RadioCard from '../ui/RadioCard.jsx'
import DateInput from '../ui/DateInput.jsx'
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

function AlgorithmSettings() {
  const navigate = useNavigate()
  const { updateUserData } = useUserData()
  const [gender, setGender] = useState('male')
  const [birthDate, setBirthDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [smokingStatus, setSmokingStatus] = useState('')

  // Валидация даты
  const validateDate = (dateString) => {
    if (!dateString || dateString.length !== 10) {
      return { isValid: false, error: '' }
    }

    const parts = dateString.split('.')
    if (parts.length !== 3) {
      return { isValid: false, error: 'Неверный формат даты' }
    }

    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const year = parseInt(parts[2], 10)

    // Проверка диапазонов
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
      return { isValid: false, error: 'Неверная дата' }
    }

    // Проверка корректности даты
    const date = new Date(year, month - 1, day)
    if (
      date.getDate() !== day ||
      date.getMonth() !== month - 1 ||
      date.getFullYear() !== year
    ) {
      return { isValid: false, error: 'Неверная дата' }
    }

    // Проверка что дата не в будущем
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date > today) {
      return { isValid: false, error: 'Дата не может быть в будущем' }
    }

    // Проверка разумного возраста (например, не старше 150 лет)
    const age = today.getFullYear() - year
    if (age > 150) {
      return { isValid: false, error: 'Неверная дата рождения' }
    }

    return { isValid: true, error: '' }
  }

  // Расчет возраста
  const calculateAge = (dateString) => {
    if (!dateString || dateString.length !== 10) return null

    const parts = dateString.split('.')
    if (parts.length !== 3) return null

    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const year = parseInt(parts[2], 10)

    const birthDate = new Date(year, month - 1, day)
    const today = new Date()

    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  // Функция для правильного склонения слова "год"
  const getAgeWord = (age) => {
    const lastDigit = age % 10
    const lastTwoDigits = age % 100

    // Исключение для 11, 12, 13, 14
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'лет'
    }

    // 1, 21, 31, 41... → "год"
    if (lastDigit === 1) {
      return 'год'
    }

    // 2, 3, 4, 22, 23, 24, 32, 33, 34... → "года"
    if (lastDigit >= 2 && lastDigit <= 4) {
      return 'года'
    }

    // 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 25... → "лет"
    return 'лет'
  }

  const handleDateChange = (value) => {
    setBirthDate(value)
    if (value.length === 10) {
      const validation = validateDate(value)
      setDateError(validation.error)
    } else {
      setDateError('')
    }
  }

  // Используем useMemo для оптимизации валидации
  const dateValidation = useMemo(() => {
    if (birthDate.length !== 10) {
      return { isValid: false, age: null }
    }
    const validation = validateDate(birthDate)
    if (validation.isValid) {
      const age = calculateAge(birthDate)
      return { isValid: true, age }
    }
    return { isValid: false, age: null }
  }, [birthDate])

  const isValidDate = dateValidation.isValid && !dateError
  const age = dateValidation.age
  
  // Валидация всех обязательных полей
  const isFormValid = 
    gender && 
    isValidDate && 
    height && 
    weight && 
    smokingStatus

  const handleNext = () => {
    if (isFormValid) {
      // Сохраняем данные пользователя в контекст
      const userDataToSave = {
        gender: gender === 'male' ? 'MALE' : 'FEMALE',
        age: age,
        weight: parseFloat(weight),
        height: parseFloat(height),
        smokingStatus: smokingStatus === 'yes' ? 'SMOKER' : 'NON_SMOKER',
      }
      
      logger.user('Данные пользователя сохранены', userDataToSave)
      updateUserData(userDataToSave)
      navigate('/preparation')
    }
  }

  return (
    <Page className="algorithm-settings-page">
      <Header title="Настройка алгоритмов" />
      
      <div className="algorithm-settings-content">
        {/* Секция выбора пола */}
        <div className="settings-section">
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

        {/* Секция даты рождения */}
        <div className="settings-section">
          <h2 className="settings-section-title">Дата рождения</h2>
          <p className="settings-section-subtitle">
            Для расчёта возрастных рисков
          </p>
          
          <DateInput
            value={birthDate}
            onChange={handleDateChange}
            placeholder="ДД.ММ.ГГГГ"
          />
          {dateError && (
            <p className="date-error-text">{dateError}</p>
          )}
          {isValidDate && age !== null && (
            <div className="settings-note">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#5DAF2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span>
                Возраст: {age} {getAgeWord(age)}
              </span>
            </div>
          )}
        </div>

        {/* Секция физических параметров */}
        <div className="settings-section">
          <h2 className="settings-section-title">Физические параметры</h2>
          <p className="settings-section-subtitle">
            Для расчёта индекса массы тела и метаболических рисков
          </p>
          
          <div className="physical-params-inputs">
            <NumberInput
              value={height}
              onChange={setHeight}
              placeholder="Рост"
              unit="CM"
              maxLength={3}
            />
            <NumberInput
              value={weight}
              onChange={setWeight}
              placeholder="Вес"
              unit="KG"
              maxLength={3}
            />
          </div>

          {height && weight && (
            <div className="settings-note">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#5DAF2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span>Учтём ваши параметры</span>
            </div>
          )}
        </div>

        {/* Секция статуса курения */}
        <div className="settings-section">
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

