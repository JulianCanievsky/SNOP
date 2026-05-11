import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DetalleJuegoLibre from './JuegoLibre.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DetalleJuegoLibre />
  </StrictMode>,
)
