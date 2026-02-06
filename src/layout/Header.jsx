import BackButton from '../ui/BackButton.jsx'
import './Header.css'

function Header({ title, showBack = true }) {
  return (
    <header className="page-header">
      {showBack && <BackButton />}
      <h1 className="header-title">{title}</h1>
    </header>
  )
}

export default Header

