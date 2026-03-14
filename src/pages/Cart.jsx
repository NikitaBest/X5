import { useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import './Cart.css'

function Cart() {
  const navigate = useNavigate()

  const handleDownload = () => {
    // TODO: интеграция скачивания рациона
  }

  const handleCopyLink = () => {
    const url = window.location.origin + window.location.pathname.replace('/cart', '/nutrition')
    navigator.clipboard?.writeText(url).catch(() => {})
  }

  return (
    <Page className="cart-page">
      <Header title="Корзина" showBack />

      <div className="cart-content">
        <div className="cart-icon" aria-hidden="true">
          <img src="/basket.svg" alt="" width={62} height={62} />
        </div>
        <h2 className="cart-title">Доставка скоро появится</h2>
        <p className="cart-description">
          Мы скоро подключим доставку продуктов. Пока вы можете сохранить рацион.
        </p>
        <div className="cart-actions">
          <button type="button" className="cart-btn cart-btn--primary" onClick={handleDownload}>
            Скачать рацион
          </button>
          <button type="button" className="cart-btn cart-btn--secondary" onClick={handleCopyLink}>
            <span className="cart-btn-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            </span>
            Скопировать ссылку
          </button>
        </div>
      </div>
    </Page>
  )
}

export default Cart
