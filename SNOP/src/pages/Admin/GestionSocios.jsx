import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getSocios } from '../../services/adminApi'
import './Admin.css'

const FILTROS = [
  { key: '',           label: 'Todos' },
  { key: 'activos',    label: 'Activos' },
  { key: 'con_deuda',  label: 'Con deuda' },
]

function iniciales(nombre) {
  return (nombre ?? '?')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function BadgeNivel({ nivel }) {
  const map = {
    Rojo:        'rojo',
    Intermedio:  'intermedio',
    Azul:        'azul',
  }
  const cls = map[nivel] ?? 'sin-nivel'
  return <span className={`badge-nivel ${cls}`}>{nivel ?? 'Sin nivel'}</span>
}

function BadgeCuota({ alDia }) {
  return (
    <span className={`badge-cuota ${alDia ? 'al-dia' : 'deuda'}`}>
      {alDia ? 'Al día' : 'Deuda'}
    </span>
  )
}

export default function GestionSocios() {
  const navigate = useNavigate()
  const [socios,    setSocios]    = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [filtro,    setFiltro]    = useState('')
  const [buscar,    setBuscar]    = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const data = await getSocios({ filtro, buscar: buscar || undefined })
      setSocios(data)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }, [filtro, buscar])

  useEffect(() => {
    const t = setTimeout(cargar, buscar ? 350 : 0)
    return () => clearTimeout(t)
  }, [cargar, buscar])

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Socios</h1>
        <p>{cargando ? '…' : `${socios.length} activos`}</p>
      </div>

      <div className="admin-body">
        {/* Búsqueda */}
        <div className="admin-search">
          <span className="admin-search-icon">🔍</span>
          <input
            className="form-input"
            placeholder="Buscar socio..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
        </div>

        {/* Filtros */}
        <div className="filtros-row">
          {FILTROS.map(f => (
            <button
              key={f.key}
              className={`filtro-pill ${filtro === f.key ? 'activo' : ''}`}
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="admin-card">
          {cargando ? (
            <div className="estado-carga">
              <div className="spinner-admin" />
              <span>Cargando socios...</span>
            </div>
          ) : socios.length === 0 ? (
            <div className="estado-vacio">No hay socios para mostrar.</div>
          ) : (
            socios.map(s => (
              <div
                key={s.id}
                className="socio-row"
                onClick={() => navigate(`/admin/socios/${s.id}`)}
              >
                <div className="socio-avatar">{iniciales(s.nombre)}</div>
                <div className="socio-info">
                  <p className="socio-nombre">{s.nombre}</p>
                  <p className="socio-email">{s.email}</p>
                </div>
                <div className="socio-badges">
                  <BadgeNivel nivel={s.nivel} />
                  <BadgeCuota alDia={s.cuota_al_dia} />
                </div>
              </div>
            ))
          )}
        </div>

        <button className="btn-primary" onClick={() => navigate('/admin/socios/nuevo')}>
          + Agregar socio
        </button>
      </div>

      <AdminBottomNav />
    </div>
  )
}
