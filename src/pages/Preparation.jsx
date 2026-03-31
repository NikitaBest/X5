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
    navigate('/camera', {
      state: {
        allowCameraEntry: true,
        cameraEntryAt: Date.now(),
      },
    })
  }

  return (
    <Page className="preparation-page">
      <Header title="Подготовка" />

      <div className="preparation-content">
        <h2 className="preparation-title">Подготовьтесь к сканированию</h2>
        <p className="preparation-description">
          Следуйте рекомендациям для точного результата.
        </p>

        <img
          src="/podgotovka.png"
          alt="Подготовка к сканированию"
          className="preparation-hero-image"
        />

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
              Убедитесь, что лицо хорошо освещено. Избегайте попадание теней на лицо.
              </p>
            </div>
          </div>

          <div className="requirement-item">
            <div className="requirement-icon">
              <img src="/material-symbols_medical-information-outline (1).svg" alt="Телефон на уровне глаз" />
            </div>
            <div className="requirement-content">
              <h3 className="requirement-title">Не двигайтесь</h3>
              <p className="requirement-description">
              Сядьте, держите устройство на расстоянии 20-30см, не говорите во время сканирования.
              </p>
            </div>
          </div>

          <div className="requirement-item">
            <div className="requirement-icon">
              <img src="/material-symbols_medical-information-outline (2).svg" alt="Доступность" />
            </div>
            <div className="requirement-content">
              <h3 className="requirement-title">Доступность</h3>
              <p className="requirement-description">
                Снимите очки и головной убор — они мешают сканированию.
              </p>
              <p className="requirement-description requirement-description--extra">
                Не проводите сканирование с зарядкой батареи менее 20%.
              </p>
            </div>
          </div>

          <div className="requirement-item">
            <div className="requirement-icon">
              <img src="/material-symbols_medical-information-outline (3).svg" alt="Без кофе и сигарет" />
            </div>
            <div className="requirement-content">
              <h3 className="requirement-title">Спокойствие</h3>
              <p className="requirement-description">
              Не занимайтесь активностью перед сканированием, не курите.
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

