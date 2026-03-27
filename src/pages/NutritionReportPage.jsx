import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import NutritionReport from '../components/NutritionReport.jsx'
import html2pdf from 'html2pdf.js'
import { getRationById, getRationOwnerById } from '../api/client.js'
import { mapRationToNutritionReport } from '../utils/rationReportMapper.js'
import { useAuth } from '../contexts/AuthContext.jsx'

function NutritionReportPage() {
  const location = useLocation()
  const reportRef = useRef(null)
  const { token } = useAuth()
  const [report, setReport] = useState(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [loadError, setLoadError] = useState('')

  const params = new URLSearchParams(location.search)
  const isPublic = params.get('public') === '1'
  const rationId = params.get('rationId')

  useEffect(() => {
    if (!rationId) return
    let cancelled = false
    setIsLoadingReport(true)
    setLoadError('')

    const rationPromise = getRationById(token, rationId)
    const ownerPromise = getRationOwnerById(token, rationId).catch(() => null)

    Promise.all([rationPromise, ownerPromise])
      .then(([rationData, ownerData]) => {
        if (cancelled) return
        setReport(mapRationToNutritionReport(rationData, ownerData))
      })
      .catch(() => {
        if (cancelled) return
        setReport(null)
        setLoadError('Не удалось загрузить рацион по ссылке.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReport(false)
      })
    return () => {
      cancelled = true
    }
  }, [rationId, token])

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    if (searchParams.get('download') === '1' && reportRef.current) {
      const timer = setTimeout(() => {
        const element = reportRef.current
        if (!element) return

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

        html2pdf().set(opt).from(element).save()
      }, 400)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [location.search])

  return (
    <Page className={`nutrition-report-page${isPublic ? ' nutrition-report-page--public' : ''}`}>
      {!isPublic && <Header title="Ваш рацион" showBack />}
      {rationId && isLoadingReport ? (
        <div className="nutrition-plan-loading">Загружаем рацион...</div>
      ) : rationId && !report ? (
        <div className="nutrition-plan-error">{loadError || 'Рацион временно недоступен.'}</div>
      ) : (
        <NutritionReport ref={reportRef} report={rationId ? (report || undefined) : undefined} isPublic={isPublic} />
      )}
    </Page>
  )
}

export default NutritionReportPage


