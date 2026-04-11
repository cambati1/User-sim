import { Routes, Route } from 'react-router-dom'
import UploadPage from './pages/UploadPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/review/:id" element={<ReviewPage />} />
    </Routes>
  )
}
