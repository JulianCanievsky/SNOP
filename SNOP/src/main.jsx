const token = localStorage.getItem('snop_token')
if (!token) {
  fetch('http://localhost:3000/auth/login-dev', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      localStorage.setItem('snop_token', data.token)
      window.location.reload()
    })
}
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import JuegoLibre from './JuegoLibre.jsx'
import MisTurnos from 'pages\MisTurnos\MisTurnos.jsx'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MisTurnos />
  </StrictMode>,
)