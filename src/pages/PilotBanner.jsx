import { useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import './PilotBanner.css'

function PilotBanner() {
  const navigate = useNavigate()

  return (
    <Page className="pilot-banner-page">
      <div className="pilot-banner-body">
        <div className="pilot-banner-hero-wrap">
          <img src="/banner.png" alt="" className="pilot-banner-hero" width={280} height={164} decoding="async" />
        </div>

        <div className="pilot-banner-lead">
          <div className="pilot-banner-title-wrap">
            <h1 className="pilot-banner-title">Пилотная версия NutriScan</h1>
          </div>
          <p className="pilot-banner-subtitle">
            Сейчас сервис подбирает готовые блюда с учётом ваших целей и результатов сканирования.
          </p>
        </div>

        <div className="pilot-banner-card">
          <p className="pilot-banner-card-heading">Что появится дальше</p>
          <ul className="pilot-banner-list">
            <li className="pilot-banner-list-item">
              <img
                src="/material-symbols_grocery.svg"
                alt=""
                className="pilot-banner-list-icon"
                width={32}
                height={32}
                decoding="async"
              />
              <span className="pilot-banner-list-text">Подбор продуктов для самостоятельного приготовления</span>
            </li>
            <li className="pilot-banner-list-item">
              <img
                src="/ri_shopping-basket-line.svg"
                alt=""
                className="pilot-banner-list-icon"
                width={32}
                height={32}
                decoding="async"
              />
              <span className="pilot-banner-list-text">Добавление в корзину и список покупок</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="pilot-banner-footer">
        <PrimaryButton type="button" onClick={() => navigate('/algorithm-settings')}>
          Продолжить
        </PrimaryButton>
      </div>
    </Page>
  )
}

export default PilotBanner
