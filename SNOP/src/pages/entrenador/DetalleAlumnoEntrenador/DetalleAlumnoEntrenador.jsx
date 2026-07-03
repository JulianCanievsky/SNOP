import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDetalleAlumno } from '../../../hooks/useEntrenador'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import './DetalleAlumnoEntrenador.css'

function iniciales(nombre = '') {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function formatTurno(fechaISO, sede) {
  const d = new Date(fechaISO)
  const dia = d.toLocaleDateString('es-AR', { weekday: 'long' })
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const diaCapital = dia.charAt(0).toUpperCase() + dia.slice(1)
  return `${diaCapital} — ${hora} hs · Sede ${sede || '—'}`
}

// Mapeo nombre nivel → clase CSS del botón seleccionado
function selClass(nivelNombre = '', opcion) {
  const n = nivelNombre.toLowerCase()
  const o = opcion.toLowerCase()
  if (o.includes('rojo') && n.includes('rojo')) return 'rojo-sel'
  if (o.includes('inter') && n.includes('inter')) return 'inter-sel'
  if (o.includes('azul') && n.includes('azul')) return 'azul-sel'
  return ''
}

export default function DetalleAlumnoEntrenador() {
  const { alumnoId } = useParams()
  const navigate = useNavigate()
  const { alumno, cargando, cambiarNivel } = useDetalleAlumno(alumnoId)
  const [guardando, setGuardando] = useState(false)
  const [niveles, setNiveles] = useState([])

  // Cargar lista de niveles desde Supabase directamente
  useEffect(() => {
    async function fetchNiveles() {
      try {
        const { supabase } = await import('../../../lib/supabase')
        const { data } = await supabase
          .from('niveles')
          .select('id, nombre, orden')
          .order('orden')
        setNiveles(data || [])
      } catch (err) {
        console.error(err)
      }
    }
    fetchNiveles()
  }, [])

  const handleCambiarNivel = async (nivelId) => {
    try {
      setGuardando(true)
      await cambiarNivel(nivelId)
    } catch (err) {
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="detalle-alumno-e">
        <header className="detalle-alumno-e-header">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Alumnos
          </button>
          <h1>Cargando...</h1>
        </header>
        <BottomNavEntrenador />
      </div>
    )
  }

  if (!alumno) {
    return (
      <div className="detalle-alumno-e">
        <header className="detalle-alumno-e-header">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Alumnos
          </button>
          <h1>Alumno no encontrado</h1>
        </header>
        <BottomNavEntrenador />
      </div>
    )
  }

  const nivelActual = alumno.niveles?.nombre || ''

  return (
    <div className="detalle-alumno-e">
      <header className="detalle-alumno-e-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Alumnos
        </button>
        <h1>{alumno.nombre}</h1>
        <p className="subtitulo">Editar alumno</p>
      </header>

      <div className="detalle-alumno-e-contenido">
        {/* Perfil */}
        <div className="alumno-perfil-card">
          <div className="alumno-avatar-grande">{iniciales(alumno.nombre)}</div>
          <h2>{alumno.nombre}</h2>
          <p className="email">{alumno.email}</p>
        </div>

        {/* Turnos asignados */}
        <div className="turnos-asignados-card">
          <p className="card-seccion-titulo">Turnos asignados</p>
          {(alumno.turnos || []).length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 14 }}>Sin turnos asignados</p>
          ) : (
            alumno.turnos.map((t) => (
              <div key={t.turno_id} className="turno-asignado-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="turno-asignado-texto">{formatTurno(t.fecha_inicio, t.sede)}</p>
              </div>
            ))
          )}
        </div>

        {/* Cambiar nivel */}
        <div className="cambiar-nivel-card">
          <p className="card-seccion-titulo">Cambiar nivel</p>
          <p className="nivel-descripcion">El nivel es asignado por el entrenador</p>
          <div className="nivel-opciones">
            {niveles.length > 0
              ? niveles.map((n) => {
                  const sc = selClass(nivelActual, n.nombre)
                  return (
                    <button
                      key={n.id}
                      className={`nivel-opcion-btn ${sc}`}
                      disabled={guardando}
                      onClick={() => handleCambiarNivel(n.id)}
                    >
                      {n.nombre}
                      {alumno.nivel_id === n.id && ' ✓'}
                    </button>
                  )
                })
              : /* Fallback si no cargaron niveles */
                ['Rojo', 'Intermedio', 'Azul'].map((nombre) => (
                  <button
                    key={nombre}
                    className={`nivel-opcion-btn ${selClass(nivelActual, nombre)}`}
                    disabled={guardando}
                  >
                    {nombre}
                  </button>
                ))}
          </div>
        </div>
      </div>

      <BottomNavEntrenador />
    </div>
  )
}
