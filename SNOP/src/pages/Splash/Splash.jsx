import { useNavigate } from 'react-router-dom'
import './Splash.css'
import logo from '/icons.svg'

export default function Splash() {
  const navigate = useNavigate()

  return (
    <div className="splash-container">
      <div className="splash-top">
        <img src={logo} alt="SNOP Logo" className="splash-logo" />
        <h1 className="splash-title">SNOP</h1>
        <p className="splash-subtitle">"Todo tu club en un solo lugar"</p>
      </div>

      <div className="splash-buttons">
        <button
          className="btn-splash-primary"
          onClick={() => navigate('/login')}
        >
          Iniciar sesión
        </button>
        <button
          className="btn-splash-secondary"
          onClick={() => navigate('/registro')}
        >
          Registrarse
        </button>
      </div>
    </div>
  )
}
