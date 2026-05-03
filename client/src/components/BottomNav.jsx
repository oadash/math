import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Основное меню">
      <NavLink to="/play" className={({ isActive }) => (isActive ? 'bottom-nav__link is-active' : 'bottom-nav__link')}>
        Играть
      </NavLink>
      <NavLink
        to="/progress"
        className={({ isActive }) => (isActive ? 'bottom-nav__link is-active' : 'bottom-nav__link')}
      >
        Успехи
      </NavLink>
    </nav>
  )
}
