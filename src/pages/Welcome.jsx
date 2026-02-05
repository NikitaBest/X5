import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import PrimaryButton from '../components/PrimaryButton.jsx'
import Page from '../layout/Page.jsx'
import './Welcome.css'

function Welcome() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [isRequestingCamera, setIsRequestingCamera] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const isFirstStep = step === 0
  const isSecondStep = step === 1

  const requestCameraAccess = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Ваше устройство не поддерживает доступ к камере.')
      return
    }

    setIsRequestingCamera(true)
    setCameraError('')
    let stream = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })

      // Доступ получен, останавливаем поток и переходим на страницу выбора приоритета
      stream.getTracks().forEach((track) => track.stop())
      navigate('/priority')
    } catch (err) {
      // Обработка различных типов ошибок
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Доступ к камере отклонен. Пожалуйста, разрешите доступ в настройках браузера.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Камера не найдена на вашем устройстве.')
      } else {
        setCameraError('Не удалось получить доступ к камере. Проверьте разрешения.')
      }
      console.error('Camera access error:', err)
    } finally {
      setIsRequestingCamera(false)
      // Гарантируем остановку потока в случае ошибки
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }

  return (
    <Page className="home-page">
      <div className="welcome-content">
        {step === 0 ? (
          <svg 
            className="welcome-icon welcome-icon-wink" 
            width="140" 
            height="140" 
            viewBox="0 0 140 140" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M52.5 93.3333C57.4583 97.0083 63.4958 99.1666 70 99.1666C76.5042 99.1666 82.5417 97.0083 87.5 93.3333" stroke="#07C3DC" strokeWidth="8" strokeLinecap="round"/>
            <path className="wink-eye-left" d="M52.5001 70C55.7217 70 58.3334 66.0825 58.3334 61.25C58.3334 56.4175 55.7217 52.5 52.5001 52.5C49.2784 52.5 46.6667 56.4175 46.6667 61.25C46.6667 66.0825 49.2784 70 52.5001 70Z" fill="#07C3DC"/>
            <path className="wink-eye-right" d="M87.5001 70C90.7217 70 93.3334 66.0825 93.3334 61.25C93.3334 56.4175 90.7217 52.5 87.5001 52.5C84.2784 52.5 81.6667 56.4175 81.6667 61.25C81.6667 66.0825 84.2784 70 87.5001 70Z" fill="#07C3DC"/>
            <path d="M12.8334 58.3333C15.1267 47.1261 20.6615 36.8393 28.7504 28.7504C36.8394 20.6615 47.1261 15.1267 58.3334 12.8333M12.8334 81.6666C15.1267 92.8739 20.6615 103.161 28.7504 111.25C36.8394 119.339 47.1261 124.873 58.3334 127.167M127.167 58.3333C124.873 47.1261 119.339 36.8393 111.25 28.7504C103.161 20.6615 92.874 15.1267 81.6667 12.8333M127.167 81.6666C124.873 92.8739 119.339 103.161 111.25 111.25C103.161 119.339 92.874 124.873 81.6667 127.167" stroke="#07C3DC" strokeWidth="8" strokeLinecap="round"/>
          </svg>
        ) : step === 1 ? (
          <svg 
            className="welcome-icon welcome-icon-shield" 
            width="140" 
            height="140" 
            viewBox="0 0 140 140" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M73.255 17.395C71.1324 16.6766 68.8325 16.6766 66.71 17.395L27.1833 30.7825C25.8959 31.2007 24.7588 31.9862 23.912 33.0423C23.0653 34.0984 22.5458 35.3791 22.4175 36.7266C20.4516 61.3783 23.8641 79.6075 31.9666 93.38C39.8066 106.709 52.3483 116.398 69.9825 123.62C87.6341 116.398 100.187 106.709 108.027 93.38C116.136 79.6133 119.548 61.3783 117.582 36.7266C117.454 35.3791 116.935 34.0984 116.088 33.0423C115.241 31.9862 114.104 31.2007 112.817 30.7825L73.255 17.395ZM63.9041 9.11165C67.8459 7.77533 72.1178 7.77328 76.0608 9.10582L115.622 22.4933C118.528 23.4611 121.088 25.2582 122.985 27.663C124.881 30.0678 126.033 32.9752 126.297 36.0266C128.357 61.7516 124.897 81.97 115.57 97.8191C106.213 113.715 91.2975 124.641 71.5866 132.405C70.5558 132.811 69.4092 132.811 68.3783 132.405C48.685 124.641 33.775 113.715 24.4241 97.8191C15.1025 81.97 11.6433 61.7458 13.6966 36.0266C13.961 32.9752 15.1126 30.0678 17.0095 27.663C18.9064 25.2582 21.4657 23.4611 24.3716 22.4933L63.9041 9.11165Z" fill="#07C3DC"/>
            <path className="shield-shine" opacity="0.5" d="M70 116.667C99.3533 104.767 113.202 83.895 110.501 44.5259C110.198 40.0517 107.141 36.2659 102.9 34.79L74.7833 25.0017C73.2453 24.4662 71.6285 24.1922 70 24.1909V116.667Z" fill="#07C3DC"/>
            <path 
              className="shield-shine-outline" 
              d="M73.255 17.395C71.1324 16.6766 68.8325 16.6766 66.71 17.395L27.1833 30.7825C25.8959 31.2007 24.7588 31.9862 23.912 33.0423C23.0653 34.0984 22.5458 35.3791 22.4175 36.7266C20.4516 61.3783 23.8641 79.6075 31.9666 93.38C39.8066 106.709 52.3483 116.398 69.9825 123.62C87.6341 116.398 100.187 106.709 108.027 93.38C116.136 79.6133 119.548 61.3783 117.582 36.7266C117.454 35.3791 116.935 34.0984 116.088 33.0423C115.241 31.9862 114.104 31.2007 112.817 30.7825L73.255 17.395ZM63.9041 9.11165C67.8459 7.77533 72.1178 7.77328 76.0608 9.10582L115.622 22.4933C118.528 23.4611 121.088 25.2582 122.985 27.663C124.881 30.0678 126.033 32.9752 126.297 36.0266C128.357 61.7516 124.897 81.97 115.57 97.8191C106.213 113.715 91.2975 124.641 71.5866 132.405C70.5558 132.811 69.4092 132.811 68.3783 132.405C48.685 124.641 33.775 113.715 24.4241 97.8191C15.1025 81.97 11.6433 61.7458 13.6966 36.0266C13.961 32.9752 15.1126 30.0678 17.0095 27.663C18.9064 25.2582 21.4657 23.4611 24.3716 22.4933L63.9041 9.11165Z" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.6)" 
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg 
            className="welcome-icon welcome-icon-camera" 
            width="140" 
            height="140" 
            viewBox="0 0 140 140" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M81.6492 23.3333C83.7539 23.3333 85.8193 23.9026 87.6267 24.9809C89.4341 26.0591 90.9162 27.6063 91.9159 29.4583L94.7509 34.7083C95.7506 36.5604 97.2327 38.1075 99.0401 39.1858C100.848 40.2641 102.913 40.8333 105.018 40.8333H116.667C119.761 40.8333 122.728 42.0625 124.916 44.2504C127.104 46.4383 128.333 49.4058 128.333 52.5V105C128.333 108.094 127.104 111.062 124.916 113.25C122.728 115.437 119.761 116.667 116.667 116.667H23.3334C20.2392 116.667 17.2718 115.437 15.0838 113.25C12.8959 111.062 11.6667 108.094 11.6667 105V52.5C11.6667 49.4058 12.8959 46.4383 15.0838 44.2504C17.2718 42.0625 20.2392 40.8333 23.3334 40.8333H34.9826C37.085 40.8334 39.1485 40.2654 40.9546 39.1893C42.7608 38.1132 44.2426 36.569 45.2434 34.72L48.0959 29.4466C49.0967 27.5977 50.5785 26.0535 52.3847 24.9773C54.1909 23.9012 56.2543 23.3332 58.3567 23.3333H81.6492Z" stroke="#06AFC6" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <circle className="camera-lens" cx="70" cy="76" r="17.5" stroke="#06AFC6" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {step === 0 && (
          <>
            <p className="welcome-heading">Ваше лицо — зеркало здоровья</p>
            <p className="text-secondary">
              Мгновенный анализ пульса, уровня стресса и рисков. Просто посмотрите в камеру.
            </p>
          </>
        )}
        {step === 1 && (
          <>
            <p className="welcome-heading">Ваша приватность — наш приоритет</p>
            <p className="text-secondary">
              Мы не собираем биометрические данные и не распознаем лица. Видеопоток анализируется
              локально и мгновенно удаляется после завершения.
            </p>
          </>
        )}
        {step === 2 && (
          <>
            <p className="welcome-heading">Нужен доступ к камере</p>
            <p className="text-secondary">
              Мы не записываем и не сохраняем видео. Камера нужна только для измерения пульса по
              изменению цвета лица.
            </p>
            {cameraError && (
              <p className="error-text" style={{ marginTop: '8px' }}>
                {cameraError}
              </p>
            )}
          </>
        )}
      </div>
      <div className="welcome-footer">
        <div className="welcome-dots">
          <span className={`dot ${step === 0 ? 'dot-active' : ''}`} />
          <span className={`dot ${step === 1 ? 'dot-active' : ''}`} />
          <span className={`dot ${step === 2 ? 'dot-active' : ''}`} />
        </div>
        <PrimaryButton
          onClick={() => {
            if (step === 0) setStep(1)
            else if (step === 1) setStep(2)
            else requestCameraAccess()
          }}
          disabled={isRequestingCamera}
        >
          {isRequestingCamera
            ? 'Запрос доступа...'
            : step === 0
              ? 'Далее'
              : step === 1
                ? 'Начать'
                : 'Разрешить доступ'}
        </PrimaryButton>
        {step < 2 ? (
          <p className="legal-text">
            Нажимая «Начать», вы соглашаетесь с Политикой конфиденциальности и Условиями
            использования
          </p>
        ) : (
          <p className="legal-text">Обработка происходит на вашем устройстве</p>
        )}
      </div>
    </Page>
  )
}

export default Welcome


