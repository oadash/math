import { NavLink } from 'react-router-dom'
import { useLang, useT } from '../i18n/useT.js'

export default function BottomNav() {
  const { lang, setLang } = useLang()
  const t = useT()

  return (
    <nav className="bottom-nav" aria-label={t('nav_aria')}>
      <NavLink to="/play" className={({ isActive }) => (isActive ? 'bottom-nav__link is-active' : 'bottom-nav__link')}>
        {t('nav_play')}
      </NavLink>
      <NavLink
        to="/progress"
        className={({ isActive }) => (isActive ? 'bottom-nav__link is-active' : 'bottom-nav__link')}
      >
        {t('nav_progress')}
      </NavLink>
      <button
        type="button"
        className="lang-toggle"
        onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
        aria-label="Switch language"
      >
        {lang === 'ru' ? 'EN' : 'RU'}
      </button>
    </nav>
  )
}
