import { Routes, Route, Link } from 'react-router-dom'

function Home() {
  return (
    <main style={{ padding: '1.5rem' }}>
      <h1>Math Adventure</h1>
      <p>Клиент и сервер подключены. Дальше — экраны из TASK-008.</p>
      <nav>
        <Link to="/">Главная</Link>
      </nav>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}
