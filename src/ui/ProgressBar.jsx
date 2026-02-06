import './ProgressBar.css'

function ProgressBar({ currentStep, totalSteps = 3 }) {
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-text">
        Шаг {currentStep} из {totalSteps}
      </div>
      <div className="progress-bar-line">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          
          return (
            <div key={stepNumber} className="progress-bar-segment">
              <div
                className={`progress-bar-circle ${
                  isCompleted
                    ? 'progress-bar-circle-completed'
                    : isCurrent
                      ? 'progress-bar-circle-current'
                      : 'progress-bar-circle-upcoming'
                }`}
              />
              {index < totalSteps - 1 && (
                <div
                  className={`progress-bar-connector ${
                    isCompleted
                      ? 'progress-bar-connector-completed'
                      : 'progress-bar-connector-upcoming'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressBar

