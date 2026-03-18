import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import NutritionReport from '../components/NutritionReport.jsx'
import html2pdf from 'html2pdf.js'

function NutritionReportPage() {
  const location = useLocation()
  const reportRef = useRef(null)

  const params = new URLSearchParams(location.search)
  const isPublic = params.get('public') === '1'

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
    <Page className="nutrition-report-page">
      {!isPublic && <Header title="Ваш рацион" showBack />}
      <NutritionReport ref={reportRef} isPublic={isPublic} />
    </Page>
  )
}

export default NutritionReportPage


