import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import './Allergies.css'

const CATEGORY_TABS = ['Все', 'Молочное', 'Мясо и рыба', 'Овощи и грибы']

const ALLERGEN_TAGS = [
  'Глютен',
  'Лактоза',
  'Орехи',
  'Яйца',
  'Арахис',
  'Морепродукты',
  'Соя',
  'Мёд',
  'Цитрусовые',
  'Кунжут',
  'Свинина',
  'Говядина',
  'Курица',
  'Индейка',
  'Рыба',
]

function Allergies() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Все')
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState(new Set())

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const filteredTags = ALLERGEN_TAGS.filter((tag) =>
    tag.toLowerCase().includes(query.toLowerCase().trim()),
  )

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
          {CATEGORY_TABS.map((tab) => (
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
          {filteredTags.map((tag) => {
            const selected = selectedTags.has(tag)
            return (
              <button
                key={tag}
                type="button"
                className={`allergies-tag${selected ? ' allergies-tag--selected' : ''}`}
                onClick={() => handleToggleTag(tag)}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      <div className="allergies-footer">
        <button
          type="button"
          className="allergies-next-button"
          onClick={() => navigate('/preparation')}
        >
          {selectedTags.size > 0 ? 'Продолжить' : 'Продолжить без исключений'}
        </button>
      </div>
    </Page>
  )
}

export default Allergies

