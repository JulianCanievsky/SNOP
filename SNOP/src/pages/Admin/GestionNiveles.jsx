import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getSocios, editarSocio, getNivelesStats, getNiveles } from '../../services/adminApi'
import './Admin.css'

function NivelBadge({ nombre }) {
  const map = {
    'Rojo':         'rojo',
    'Intermedio':   'intermedio',
    'Azul':         'azul',
    'Principiante': 'sin-nivel',
    'Avanzado':     'azul',
  }
  const cls = map[nombre] ?? 'sin-nivel'
  return <span className={`badge-nivel ${cls}`}>{nombre ?? '—'}</span>
}

export default function GestionNiveles() {
  const navigate = useNavigate()
  const [socios,   setSocios]   = useState([])
  const [niveles,  setNiveles]  = useState([])
  const [stats,    setStats]    = useState({})
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null) // id del socio con selector abierto

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [s, st, niv] = await Promise.all([
        getSocios({ filtro: 'activos' }),
        getNivelesStats(),
        getNiveles(),
      ])
      setSocios(s)
      setStats(st)
      setNiveles(niv)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function cambiarNivel(socioId, nuevoNivelId, nuevoNivelNombre) {
    try {
      await editarSocio(socioId, { nivel_id: nuevoNivelId || null })
      setSocios(prev => prev.map(s =>
        s.id === socioId
          ? { ...s, nivel_id: nuevoNivelId, niveles: nuevoNivelId ? { id: nuevoNivelId, nombre: nuevoNivelNombre } : null }
          : s
      ))
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
        {/* Stats por nivel */}
        <div className="stats-grid">
          {Object.entries(stats).map(([nombre, count]) => (
            <div key={nombre} className="stat-card">
              <div className="stat-num">{count}</div>
              <div className="stat-lbl">{nombre}</div>
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
                const nivelNombre = s.niveles?.nombre

                return (
                  <div key={s.id} className="nivel-row">
                    <div className="socio-avatar">{iniciales}</div>
                    <div className="socio-info">
                      <p className="socio-nombre">{s.nombre}</p>
                    </div>

                    {abierto ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {niveles.map(n => (
                          <button
                            key={n.id}
                            className={`nivel-btn ${n.nombre.toLowerCase()} ${s.nivel_id === n.id ? 'sel' : ''}`}
                            style={{ minWidth: 56, padding: '6px 8px', fontSize: 11 }}
                            onClick={() => cambiarNivel(s.id, n.id, n.nombre)}
                          >
                            {n.nombre}
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
                        <NivelBadge nombre={nivelNombre} />
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
