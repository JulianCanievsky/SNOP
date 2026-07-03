import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import './Admin.css'

export default function AdminActividades() {
  const navigate = useNavigate()

  const opciones = [
    { titulo: 'Crear juego libre',  sub: 'Nuevo espacio de juego',  emoji: '🏓', path: '/admin/juego-libre' },
    { titulo: 'Enviar comunicado',  sub: 'Notificar a socios',      emoji: '📢', path: '/admin/comunicado' },
    { titulo: 'Gestión de niveles', sub: 'Asignar y actualizar',    emoji: '⭐', path: '/admin/niveles' },
  ]

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Actividades</h1>
        <p>Gestión del club</p>
      </div>

      <div className="admin-body">
        <div className="acciones-grid">
          {opciones.map(op => (
            <button key={op.path} className="accion-card" onClick={() => navigate(op.path)}>
              <div className="accion-icono">{op.emoji}</div>
              <div className="accion-info">
                <p className="accion-titulo">{op.titulo}</p>
                <p className="accion-sub">{op.sub}</p>
              </div>
              <span className="accion-arrow">›</span>
            </button>
          ))}
        </div>
      </div>

      <AdminBottomNav />
    </div>
  )
}
