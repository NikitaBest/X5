import './PrimaryButton.css'

function PrimaryButton({ children, onClick, type = 'button', disabled = false }) {
  return (
    <button
      className="primary-button"
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default PrimaryButton

