import BackButton from '../ui/BackButton.jsx'
import GlassCard from '../ui/GlassCard.jsx'
import './Header.css'

function Header({ title, showBack = true }) {
  return (
    <header className="page-header">
      {showBack && <BackButton />}
      <GlassCard className="header-glass-card">
        <h1 className="header-title">{title}</h1>
      </GlassCard>
    </header>
  )
}

export default Header

