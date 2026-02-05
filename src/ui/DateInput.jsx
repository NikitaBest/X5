import './DateInput.css'

function DateInput({ value, onChange, placeholder = 'ДД.ММ.ГГГГ' }) {
  const handleChange = (e) => {
    let input = e.target.value.replace(/\D/g, '') // Удаляем все нецифровые символы
    
    // Форматируем как ДД.ММ.ГГГГ
    if (input.length > 0) {
      if (input.length <= 2) {
        input = input
      } else if (input.length <= 4) {
        input = input.slice(0, 2) + '.' + input.slice(2)
      } else {
        input = input.slice(0, 2) + '.' + input.slice(2, 4) + '.' + input.slice(4, 8)
      }
    }
    
    onChange?.(input)
  }

  return (
    <div className="date-input-wrapper">
      <input
        type="text"
        className="date-input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={10}
      />
      <svg 
        className="date-input-icon" 
        width="20" 
        height="20" 
        viewBox="0 0 20 20" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M6 2V4M14 2V4M3 8H17M4 4H16C16.5523 4 17 4.44772 17 5V16C17 16.5523 16.5523 17 16 17H4C3.44772 17 3 16.5523 3 16V5C3 4.44772 3.44772 4 4 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

export default DateInput

