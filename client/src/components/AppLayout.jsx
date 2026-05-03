import BottomNav from './BottomNav.jsx'

export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <div className="app-layout__main">{children}</div>
      <BottomNav />
    </div>
  )
}
