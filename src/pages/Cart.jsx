import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import html2pdf from 'html2pdf.js'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import NutritionReport from '../components/NutritionReport.jsx'
import { getRationById } from '../api/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { mapRationToNutritionReport } from '../utils/rationReportMapper.js'
import './Cart.css'

function Cart() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const reportRef = useRef(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [report, setReport] = useState(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const toastTimerRef = useRef(null)
  const surveyTimerRef = useRef(null)
  const rationId = location.state?.rationId ?? null
  const resolvedRationId = useMemo(() => {
    if (rationId) return rationId
    try {
      return window.localStorage.getItem('lastRationId')
    } catch {
      return null
    }
  }, [rationId])

  useEffect(() => {
    if (!resolvedRationId) return
    let cancelled = false
    setIsLoadingReport(true)
    getRationById(token, resolvedRationId)
      .then((data) => {
        if (cancelled) return
        setReport(mapRationToNutritionReport(data))
      })
      .catch(() => {
        if (cancelled) return
        setReport(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReport(false)
      })
    return () => {
      cancelled = true
    }
  }, [resolvedRationId, token])

  const showToast = (message, { goSurveyAfter = false } = {}) => {
    setToastMessage(message)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    if (surveyTimerRef.current) window.clearTimeout(surveyTimerRef.current)

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage('')
      toastTimerRef.current = null
    }, 2200)

    if (goSurveyAfter) {
      surveyTimerRef.current = window.setTimeout(() => {
        surveyTimerRef.current = null
        navigate('/survey')
      }, 2300)
    }
  }

  const handleDownload = () => {
    if (!reportRef.current || isGenerating) return
    if (resolvedRationId && !report) {
      showToast('Рацион еще загружается')
      return
    }

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
      .then(() => {
        showToast('Ваш PDF рациона сохранён', { goSurveyAfter: true })
      })
      .catch(() => {
        showToast('Не удалось скачать PDF')
      })
      .finally(() => {
        setIsGenerating(false)
      })
  }

  const handleCopyLink = async () => {
    const q = new URLSearchParams()
    q.set('public', '1')
    if (resolvedRationId) q.set('rationId', String(resolvedRationId))
    const url = `${window.location.origin}/nutrition-report?${q.toString()}`

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
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
      showToast('Не удалось скопировать ссылку')
      return
    }

    showToast('Ссылка скопирована', { goSurveyAfter: true })
  }

  return (
    <Page className="cart-page">
      <Header title="Корзина" showBack />

      {toastMessage && typeof document !== 'undefined'
        ? createPortal(
            <div className="cart-toast" role="status" aria-live="polite">
              <span className="cart-toast-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="#5DAF2E"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="cart-toast-text">{toastMessage}</span>
            </div>,
            document.body,
          )
        : null}

      <div className="cart-content">
        <div className="cart-icon" aria-hidden="true">
          <img src="/basket.svg" alt="" width={62} height={62} />
        </div>
        <h2 className="cart-title">Доставка скоро появится</h2>
        <p className="cart-description">
          Мы скоро подключим доставку продуктов. Пока вы можете сохранить рацион.
        </p>
        <div className="cart-actions">
          <button type="button" className="cart-btn cart-btn--primary" onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? 'Сохраняем...' : 'Скачать рацион'}
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
        {isLoadingReport ? (
          <p className="cart-loading-note">Загружаем рацион для PDF...</p>
        ) : null}
      </div>

      {/* Скрытый блок с отчётом для генерации PDF */}
      <div style={{ position: 'absolute', left: '-99999px', top: 0, height: 0, overflow: 'hidden' }}>
        <NutritionReport ref={reportRef} report={report || undefined} />
      </div>
    </Page>
  )
}

export default Cart
