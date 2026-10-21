import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import PwaInstallPrompt from './components/PwaInstallPrompt.jsx'
import PwaUpdatePrompt from './components/PwaUpdatePrompt.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <OfflineBanner />
      <App />
      <PwaInstallPrompt />
      <PwaUpdatePrompt />
    </BrowserRouter>
  </React.StrictMode>
)
