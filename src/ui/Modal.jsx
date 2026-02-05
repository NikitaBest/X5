import './Modal.css'

function Modal({ isOpen, onClose, title, description, onConfirm, onCancel, confirmText = 'Продолжить', cancelText = 'Выйти' }) {
  if (!isOpen) return null

  const handleCancel = onCancel || onClose

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{title}</h2>
        {description && <p className="modal-description">{description}</p>}
        <div className="modal-buttons">
          <button className="modal-button modal-button-cancel" onClick={handleCancel} type="button">
            {cancelText}
          </button>
          <button className="modal-button modal-button-confirm" onClick={onConfirm} type="button">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Modal

