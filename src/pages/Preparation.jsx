import { useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import './Preparation.css'

function Preparation() {
  const navigate = useNavigate()

  const handleStartScan = () => {
    navigate('/camera')
  }

  return (
    <Page className="preparation-page">
      <Header title="Подготовка" />
      <ProgressBar currentStep={5} totalSteps={5} />
      
      <div className="preparation-content">
        <h2 className="preparation-title">Подготовьтесь к сканированию</h2>
        <p className="preparation-description">
          Следуйте рекомендациям для точного результата.
        </p>

        <div className="preparation-video-container">
          <img 
            src="/imgvideo.png" 
            alt="Инструкция по сканированию" 
            className="preparation-video-image"
          />
          <button className="preparation-play-button" type="button">
            <img 
              src="/octicon_play-16.svg" 
              alt="Play" 
              className="play-icon"
            />
          </button>
        </div>

        <div className="preparation-requirements">
          <div className="requirement-item">
            <div className="requirement-icon">
              <img src="/Conditions.svg" alt="Лицо должно быть открыто" />
            </div>
            <div className="requirement-content">
              <h3 className="requirement-title">Лицо должно быть открыто</h3>
              <p className="requirement-description">Снимите очки и уберите волосы со лба</p>
            </div>
          </div>

          <div className="requirement-item">
            <div className="requirement-icon">
              <img src="/Conditions1.svg" alt="Равномерное освещение" />
            </div>
            <div className="requirement-content">
              <h3 className="requirement-title">Равномерное освещение</h3>
              <p className="requirement-description">Встаньте напротив окна или источника света</p>
            </div>
          </div>

          <div className="requirement-item">
            <div className="requirement-icon">
              <img src="/Conditions2.svg" alt="Полная приватность" />
            </div>
            <div className="requirement-content">
              <h3 className="requirement-title">Полная приватность</h3>
              <p className="requirement-description">Видео обрабатывается на устройстве и не сохраняется</p>
            </div>
          </div>
        </div>
      </div>

      <div className="preparation-footer">
        <PrimaryButton onClick={handleStartScan}>
          Запустить сканирование
        </PrimaryButton>
      </div>
    </Page>
  )
}

export default Preparation

