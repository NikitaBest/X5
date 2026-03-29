import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import { postUserFeedback } from '../api/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import logger from '../utils/logger.js'
import './Survey.css'

const QUESTIONS = [
  {
    id: 'q1',
    title: 'Вы бы воспользовались этим сервисом снова?',
    options: ['Да', 'Возможно', 'Скорее нет', 'Нет'],
  },
  {
    id: 'q2',
    title: 'Порекомендовали бы вы наш сервис?',
    options: ['Да', 'Нет'],
  },
  {
    id: 'q3',
    title: 'Сколько рекомендаций оказались полезными?',
    options: ['Все', 'Большинство', 'Несколько', 'Ни один'],
  },
  {
    id: 'q4',
    title: 'Насколько рекомендации соответствовали вашим ожиданиям?',
    options: ['Полностью', 'В основном', 'Частично', 'Не соответствовали'],
  },
]

/** После тоста (как на корзине) — чуть дольше из‑за длинного текста. */
const THANKS_NAVIGATE_MS = 3000

function Survey() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [answers, setAnswers] = useState({})
  const [comment, setComment] = useState('')
  const [showThanks, setShowThanks] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isComplete = useMemo(() => QUESTIONS.every((q) => Boolean(answers[q.id])), [answers])

  const handlePick = (qid, option) => {
    setAnswers((prev) => ({ ...prev, [qid]: option }))
  }

  const handleSubmit = async () => {
    if (!isComplete || showThanks || isSubmitting) return
    const trimmedComment = comment.trim()
    const feedback = {
      source: 'survey',
      submittedAt: new Date().toISOString(),
      answers: QUESTIONS.map((q) => ({
        id: q.id,
        question: q.title,
        answer: answers[q.id],
      })),
      ...(trimmedComment ? { comment: trimmedComment } : {}),
    }
    setIsSubmitting(true)
    try {
      await postUserFeedback(token, feedback)
    } catch (err) {
      logger.warn('survey: user/feedback failed', err)
    } finally {
      setIsSubmitting(false)
    }
    setShowThanks(true)
  }

  useEffect(() => {
    if (!showThanks) return undefined
    const id = window.setTimeout(() => {
      navigate('/results')
    }, THANKS_NAVIGATE_MS)
    return () => window.clearTimeout(id)
  }, [showThanks, navigate])

  return (
    <Page className="survey-page">
      <Header title="Опрос" showBack />

      <div className="survey-head">
        <h2 className="survey-title">Нам важно ваше мнение</h2>
        <p className="survey-subtitle">Ответьте на 4 коротких вопроса</p>
      </div>

      <div className="survey-cards">
        {QUESTIONS.map((q) => (
          <div key={q.id} className={`survey-card${answers[q.id] ? ' is-answered' : ''}`}>
            <div className="survey-card-row">
              {answers[q.id] ? (
                <div className="survey-check" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="#5DAF2E"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ) : null}
              <div className="survey-card-title">{q.title}</div>
            </div>

            <div className="survey-options">
              {q.options.map((opt) => {
                const active = answers[q.id] === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`survey-chip${active ? ' is-active' : ''}`}
                    onClick={() => handlePick(q.id, opt)}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="survey-card survey-card--comment">
          <div className="survey-card-row">
            <div className="survey-comment-icon" aria-hidden="true">
              <span />
            </div>
            <div className="survey-card-title">Предложите, что нам улучшить в сервисе</div>
            <div className="survey-optional">необязательно</div>
          </div>

          <div className="survey-textarea-wrap">
            <textarea
              className="survey-textarea"
              placeholder="Напишите, что можно улучшить или чего не хватает..."
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              rows={3}
            />
            <div className="survey-counter">{comment.length}/200</div>
          </div>
        </div>
      </div>

      <div className="survey-footer">
        <button
          type="button"
          className="survey-submit"
          onClick={handleSubmit}
          disabled={!isComplete || showThanks || isSubmitting}
        >
          Отправить
        </button>
      </div>

      {showThanks && typeof document !== 'undefined'
        ? createPortal(
            <div className="survey-thanks-overlay" role="status" aria-live="polite">
              <div className="survey-thanks-card">
                <p className="survey-thanks-card-text">
                  Спасибо, что воспользовались сервисом подбора рациона питания с ИИ
                </p>
                <span className="survey-thanks-card-emoji" aria-hidden="true">
                  😊
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </Page>
  )
}

export default Survey

