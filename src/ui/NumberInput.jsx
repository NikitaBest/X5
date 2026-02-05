import './NumberInput.css'

function NumberInput({ value, onChange, placeholder, unit, maxLength = 3 }) {
  const handleChange = (e) => {
    let input = e.target.value.replace(/\D/g, '') // Удаляем все нецифровые символы
    
    // Ограничиваем длину
    if (input.length > maxLength) {
      input = input.slice(0, maxLength)
    }
    
    onChange?.(input)
  }

  return (
    <div className="number-input-wrapper">
      <input
        type="text"
        className="number-input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode="numeric"
      />
      <span className="number-input-unit">{unit}</span>
    </div>
  )
}

export default NumberInput

