import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import ClasesParticulares from './pages/Clasesparticulares.jsx'
import Perfil from './pages/Perfil.jsx'

const token = localStorage.getItem('snop_token')

if (!token) {
  fetch('http://localhost:3000/auth/login-dev', {
    method: 'POST'
  })
    .then(r => r.json())
    .then(data => {
      console.log('TOKEN RECIBIDO:', data)

      localStorage.setItem('snop_token', data.token)

      console.log(
        'TOKEN GUARDADO:',
        localStorage.getItem('snop_token')
      )

      window.location.reload()
    })
    .catch(err => {
      console.error('ERROR LOGIN DEV:', err)
    })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Perfil />
  </StrictMode>
)