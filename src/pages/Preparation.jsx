import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import './Preparation.css'

function Preparation() {
  const navigate = useNavigate()
  const [isAcknowledged, setIsAcknowledged] = useState(false)

  const handleStartScan = () => {
    navigate('/camera')
  }

  return (
    <Page className="preparation-page">
      <Header title="Подготовка" />

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

        <div className="preparation-info-cards">
          <div className="preparation-info-card">
            <img src="/coonfen.svg" alt="Конфиденциально" className="preparation-info-icon" />
            <div className="preparation-info-text">Приватно</div>
          </div>
          <div className="preparation-info-card">
            <img src="/speed.svg" alt="60 секунд" className="preparation-info-icon" />
            <div className="preparation-info-text">60 секунд</div>
          </div>
          <div className="preparation-info-card">
            <img src="/doc.svg" alt="Не диагноз" className="preparation-info-icon" />
            <div className="preparation-info-text">Не диагноз</div>
          </div>
        </div>

        <h2 className="preparation-important-title">Важные рекомендации</h2>

        <div className="preparation-requirements">
          <div className="requirement-item">
            <div className="requirement-icon">
              <img src="/material-symbols_medical-information-outline.svg" alt="Хорошее освещение" />
            </div>
            <div className="requirement-content">
              <h3 className="requirement-title">Хорошее освещение</h3>
              <p className="requirement-description">
                Встаньте лицом к источнику света. Избегайте теней на лице.
              </p>
            </div>
          </div>

          <div className="requirement-item">
            <div className="requirement-icon">
              <img src="/material-symbols_medical-information-outline (1).svg" alt="Телефон на уровне глаз" />
            </div>
            <div className="requirement-content">
              <h3 className="requirement-title">Телефон на уровне глаз</h3>
              <p className="requirement-description">
                Зафиксируйте устройство на расстоянии 30–40 см от лица.
              </p>
            </div>
          </div>

          <div className="requirement-item">
            <div className="requirement-icon">
              <img src="/material-symbols_medical-information-outline (2).svg" alt="Не двигайтесь" />
            </div>
            <div className="requirement-content">
              <h3 className="requirement-title">Не двигайтесь</h3>
              <p className="requirement-description">
                Расслабьте лицо, не говорите и не двигайтесь во время измерения.
              </p>
            </div>
          </div>

          <div className="requirement-item">
            <div className="requirement-icon">
              <img src="/material-symbols_medical-information-outline (3).svg" alt="Без кофе и сигарет" />
            </div>
            <div className="requirement-content">
              <h3 className="requirement-title">Без кофе и сигарет</h3>
              <p className="requirement-description">
                Воздержитесь минимум 20 минут до сканирования.
              </p>
            </div>
          </div>
        </div>

        <label className="preparation-confirm">
          <input
            type="checkbox"
            checked={isAcknowledged}
            onChange={(e) => setIsAcknowledged(e.target.checked)}
          />
          <span className="preparation-confirm-text">
            Понятно, я готов(а) к сканированию
          </span>
        </label>
      </div>

      <div className="preparation-footer">
        <PrimaryButton onClick={handleStartScan} disabled={!isAcknowledged}>
          Запустить сканирование
        </PrimaryButton>
      </div>
    </Page>
  )
}

export default Preparation

