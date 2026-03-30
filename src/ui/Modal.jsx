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
  /** Только одна кнопка (по умолчанию закрывает модалку через onClose) */
  singleButton = false,
}) {
  if (!isOpen) return null

  const handleCancel = onCancel || onClose
  const titleClasses = ['modal-title', titleClassName].filter(Boolean).join(' ')
  const descriptionClasses = ['modal-description', descriptionClassName].filter(Boolean).join(' ')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title ? <h2 className={titleClasses}>{title}</h2> : null}
        {description ? <p className={descriptionClasses}>{description}</p> : null}
        <div className={`modal-buttons${singleButton ? ' modal-buttons--single' : ''}`}>
          {singleButton ? (
            <button className="modal-button modal-button-confirm modal-button--full" onClick={onClose} type="button">
              {confirmText}
            </button>
          ) : (
            <>
              <button className="modal-button modal-button-cancel" onClick={handleCancel} type="button">
                {cancelText}
              </button>
              <button className="modal-button modal-button-confirm" onClick={onConfirm} type="button">
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
