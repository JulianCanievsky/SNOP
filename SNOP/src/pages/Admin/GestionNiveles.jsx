import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getSocios, editarSocio, getNivelesStats } from '../../services/adminApi'
import './Admin.css'

const NIVELES = ['Rojo', 'Intermedio', 'Azul']

function NivelBadge({ nivel }) {
  const map = { Rojo: 'rojo', Intermedio: 'intermedio', Azul: 'azul' }
  const cls = map[nivel] ?? 'sin-nivel'
  const short = nivel === 'Intermedio' ? 'Interm.' : (nivel ?? '—')
  return <span className={`badge-nivel ${cls}`}>{short}</span>
}

export default function GestionNiveles() {
  const navigate = useNavigate()
  const [socios,   setSocios]   = useState([])
  const [stats,    setStats]    = useState({})
  const [cargando, setCargando] = useState(true)
  // id del socio cuyo selector de nivel está abierto
  const [editando, setEditando] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [s, st] = await Promise.all([getSocios({ filtro: 'activos' }), getNivelesStats()])
      setSocios(s)
      setStats(st)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function cambiarNivel(socioId, nuevoNivel) {
    try {
      await editarSocio(socioId, { nivel: nuevoNivel })
      setSocios(prev => prev.map(s => s.id === socioId ? { ...s, nivel: nuevoNivel } : s))
      setStats(prev => {
        const socio = socios.find(s => s.id === socioId)
        const viejo = socio?.nivel
        const nuevo = { ...prev }
        if (viejo && nuevo[viejo] > 0) nuevo[viejo]--
        if (nuevoNivel) nuevo[nuevoNivel] = (nuevo[nuevoNivel] ?? 0) + 1
        return nuevo
      })
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar nivel')
    } finally {
      setEditando(null)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate('/admin')}>‹ Inicio</button>
        <h1>Gestión de niveles</h1>
        <p>Asignar y actualizar</p>
      </div>

      <div className="admin-body">
        {/* Stats */}
        <div className="stats-grid">
          {NIVELES.map(n => (
            <div key={n} className="stat-card">
              <div className="stat-num">{stats[n] ?? 0}</div>
              <div className="stat-lbl">{n}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div>
          <p className="admin-label">Modificar nivel individual</p>
          <div className="admin-card">
            {cargando ? (
              <div className="estado-carga"><div className="spinner-admin" /></div>
            ) : socios.length === 0 ? (
              <div className="estado-vacio">No hay socios activos.</div>
            ) : (
              socios.map(s => {
                const iniciales = s.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
                const abierto   = editando === s.id
                return (
                  <div key={s.id} className="nivel-row">
                    <div className="socio-avatar">{iniciales}</div>
                    <div className="socio-info">
                      <p className="socio-nombre">{s.nombre}</p>
                    </div>

                    {abierto ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {NIVELES.map(n => (
                          <button
                            key={n}
                            className={`nivel-btn ${n.toLowerCase()} ${s.nivel === n ? 'sel' : ''}`}
                            style={{ minWidth: 56, padding: '6px 8px', fontSize: 11 }}
                            onClick={() => cambiarNivel(s.id, n)}
                          >
                            {n === 'Intermedio' ? 'Int.' : n}
                          </button>
                        ))}
                        <button
                          className="nivel-btn"
                          style={{ padding: '6px 8px', fontSize: 11, color: '#6b7280' }}
                          onClick={() => setEditando(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <NivelBadge nivel={s.nivel} />
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}
                          onClick={() => setEditando(s.id)}
                          aria-label="Editar nivel"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <AdminBottomNav />
    </div>
  )
}
