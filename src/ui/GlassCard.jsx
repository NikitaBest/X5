import './GlassCard.css'

function GlassCard({ children, className = '' }) {
  return (
    <div className={`glass-card ${className}`.trim()}>
      {children}
    </div>
  )
}

export default GlassCard

