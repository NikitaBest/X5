import './Modal.css'

function Modal({
  isOpen,
  onClose,
  title,
  titleClassName = '',
  description,
  descriptionClassName = '',
  onConfirm,
  onCancel,
  confirmText = 'Продолжить',
  cancelText = 'Выйти',
  /** Доп. класс для кнопки подтверждения (например outline) */
  confirmClassName = '',
  /** Над основной кнопкой в режиме singleButton (например «Повторить сканирование») */
  topButtonText,
  onTopButtonClick,
  /** Только одна кнопка (по умолчанию закрывает модалку через onClose) */
  singleButton = false,
}) {
  if (!isOpen) return null

  const handleCancel = onCancel || onClose
  const titleClasses = ['modal-title', titleClassName].filter(Boolean).join(' ')
  const descriptionClasses = ['modal-description', descriptionClassName].filter(Boolean).join(' ')
  const confirmBtnClass = ['modal-button', 'modal-button-confirm', confirmClassName].filter(Boolean).join(' ')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title ? <h2 className={titleClasses}>{title}</h2> : null}
        {description ? <p className={descriptionClasses}>{description}</p> : null}
        <div className={`modal-buttons${singleButton ? ' modal-buttons--single' : ''}`}>
          {singleButton ? (
            <>
              {topButtonText && typeof onTopButtonClick === 'function' ? (
                <button
                  className="modal-button modal-button-confirm modal-button--full"
                  onClick={onTopButtonClick}
                  type="button"
                >
                  {topButtonText}
                </button>
              ) : null}
              <button className={`${confirmBtnClass} modal-button--full`.trim()} onClick={onClose} type="button">
                {confirmText}
              </button>
            </>
          ) : (
            <>
              <button className="modal-button modal-button-cancel" onClick={handleCancel} type="button">
                {cancelText}
              </button>
              <button className={confirmBtnClass} onClick={onConfirm} type="button">
                {confirmText}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Modal
