import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { HomePage } from './pages/HomePage'
import { SearchPage } from './pages/SearchPage'

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-white">
        <Sidebar />
        <main className="relative flex flex-1 flex-col overflow-hidden bg-white">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
