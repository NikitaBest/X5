import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import { getExcludeProducts, postExcludeProducts } from '../api/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import './Allergies.css'

function getItemsFromResponse(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.value?.data)) return data.value.data
  if (Array.isArray(data?.value?.items)) return data.value.items
  if (Array.isArray(data?.value?.content)) return data.value.content
  if (Array.isArray(data?.result)) return data.result
  return []
}

function normalizeProduct(item, idx) {
  const name = item?.name ?? item?.title ?? item?.productName ?? item?.label ?? ''
  const category = item?.category ?? item?.categoryName ?? null
  const id = item?.id ?? `${name}-${idx}`
  return {
    id,
    name: String(name).trim(),
    category: category ? String(category).trim() : null,
  }
}

function Allergies() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('Все')
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState(new Set())
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        setIsLoading(true)
        setLoadError('')
        const allRows = []
        let pageNumber = 1
        let hasNext = true

        while (hasNext) {
          const data = await getExcludeProducts(token, {
            search: query,
            pageNumber,
            pageSize: 100,
          })
          if (cancelled) return

          allRows.push(...getItemsFromResponse(data))

          const nextByEnvelope = Boolean(data?.value?.hasNext)
          const nextByFlat = Boolean(data?.hasNext)
          const totalPages = Number(data?.value?.totalPages ?? data?.totalPages ?? 1)
          hasNext = nextByEnvelope || nextByFlat || pageNumber < totalPages
          pageNumber += 1

          // fail-safe на случай некорректных метаданных
          if (pageNumber > 50) break
        }

        if (cancelled) return
        const normalized = allRows
          .map(normalizeProduct)
          .filter((x) => x.name)
        setProducts(normalized)
      } catch (e) {
        if (cancelled) return
        setProducts([])
        setLoadError('Не удалось загрузить список. Попробуйте ещё раз.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [token, query])

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const handleAddCustomTag = (rawValue) => {
    const value = rawValue.trim()
    if (!value) return
    setSelectedTags((prev) => {
      const next = new Set(prev)
      next.add(value)
      return next
    })
    setQuery('')
  }

  const categoryTabs = useMemo(() => {
    const set = new Set()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['Все', ...Array.from(set)]
  }, [products])

  useEffect(() => {
    if (!categoryTabs.includes(activeTab)) {
      setActiveTab('Все')
    }
  }, [categoryTabs, activeTab])

  const filteredProducts = useMemo(() => {
    if (activeTab === 'Все') return products
    return products.filter((p) => p.category === activeTab)
  }, [products, activeTab])

  const handleNext = async () => {
    try {
      setIsSaving(true)
      setSaveError('')
      const payload = Array.from(selectedTags)
        .map((x) => String(x).trim())
        .filter(Boolean)

      await postExcludeProducts(token, payload)
      navigate('/preparation')
    } catch (e) {
      setSaveError('Не удалось сохранить исключения. Попробуйте ещё раз.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Page className="allergies-page">
      <Header title="Исключения" showBack />
      <ProgressBar currentStep={4} totalSteps={5} />

      <div className="allergies-content">
        <div className="allergies-title-block">
          <h2 className="allergies-title">Аллергии и исключения</h2>
          <p className="allergies-subtitle">
            Отметьте продукты, которые не должны попасть в ваш рацион.
          </p>
        </div>

        <div className="allergies-search-wrapper">
          <span className="allergies-search-icon" aria-hidden="true">
            <img src="/po.svg" alt="" />
          </span>
          <input
            className="allergies-search-input"
            type="text"
            placeholder="Найти продукт или аллерген..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {selectedTags.size > 0 && (
          <div className="allergies-selected">
            <div className="allergies-selected-title">
              Исключено ({selectedTags.size})
            </div>
            <div className="allergies-selected-tags">
              {Array.from(selectedTags).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="allergies-selected-tag"
                  onClick={() => handleToggleTag(tag)}
                >
                  <span className="allergies-selected-tag-label">{tag}</span>
                  <span className="allergies-selected-tag-close" aria-hidden="true">
                    ×
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="allergies-tabs">
          {categoryTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`allergies-tab${tab === activeTab ? ' allergies-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="allergies-tags">
          {loadError ? (
            <div className="allergies-empty">
              <div className="allergies-empty-title">{loadError}</div>
            </div>
          ) : isLoading ? (
            <div className="allergies-empty">
              <div className="allergies-empty-title">Загрузка...</div>
            </div>
          ) : filteredProducts.length === 0 && query.trim() ? (
            <div className="allergies-empty">
              <div className="allergies-empty-icon" aria-hidden="true">
                <img src="/po2.svg" alt="" />
              </div>
              <div className="allergies-empty-title">
                Ничего не найдено по запросу “{query.trim()}”
              </div>
              <div className="allergies-empty-subtitle">Попробуйте другой поиск</div>
              <button
                type="button"
                className="allergies-empty-add"
                onClick={() => handleAddCustomTag(query)}
              >
                + Добавить “{query.trim()}”
              </button>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const tag = product.name
              const selected = selectedTags.has(tag)
              return (
                <button
                  key={product.id}
                  type="button"
                  className={`allergies-tag${selected ? ' allergies-tag--selected' : ''}`}
                  onClick={() => handleToggleTag(tag)}
                >
                  {tag}
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="allergies-footer">
        {saveError ? <div className="allergies-save-error">{saveError}</div> : null}
        <button
          type="button"
          className="allergies-next-button"
          onClick={handleNext}
          disabled={isSaving}
        >
          {isSaving
            ? 'Сохраняем...'
            : selectedTags.size > 0
              ? 'Продолжить'
              : 'Продолжить без исключений'}
        </button>
      </div>
    </Page>
  )
}

export default Allergies

