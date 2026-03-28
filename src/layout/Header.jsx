import BackButton from '../ui/BackButton.jsx'
import './Header.css'

function Header({ title, showBack = true, onBack, endSlot = null }) {
  return (
    <header className={`page-header${endSlot ? ' page-header--end-slot' : ''}`}>
      {showBack && <BackButton onClick={onBack} />}
      <h1 className="header-title">{title}</h1>
      {endSlot ? <div className="page-header-end">{endSlot}</div> : null}
    </header>
  )
}

export default Header

