import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import html2pdf from 'html2pdf.js'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import NutritionReport from '../components/NutritionReport.jsx'
import './Cart.css'

function Cart() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const reportRef = useRef(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = () => {
    if (!reportRef.current || isGenerating) return

    const element = reportRef.current
    setIsGenerating(true)

    const opt = {
      margin: [10, 10, 10, 10],
      filename: 'nutrition-report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
    }

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .finally(() => {
        setIsGenerating(false)
      })
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/nutrition-report?public=1`

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = url
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
    } catch {
      // если не удалось скопировать — просто выходим без ошибок в UI
      return
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          {copied && (
            <p className="cart-copy-hint">Ссылка на рацион скопирована в буфер обмена</p>
          )}
        </div>
      </div>

      {/* Скрытый блок с отчётом для генерации PDF */}
      <div style={{ position: 'absolute', left: '-99999px', top: 0, height: 0, overflow: 'hidden' }}>
        <NutritionReport ref={reportRef} />
      </div>
    </Page>
  )
}

export default Cart
