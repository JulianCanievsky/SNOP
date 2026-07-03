import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMisAlumnos } from '../../../hooks/useEntrenador'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import './MisAlumnosEntrenador.css'

const FILTROS = ['Todos', 'Rojo', 'Interm.', 'Azul']

function iniciales(nombre = '') {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function nivelBadgeClass(nombreNivel = '') {
  const n = nombreNivel.toLowerCase()
  if (n.includes('azul')) return 'nivel-azul'
  if (n.includes('rojo')) return 'nivel-rojo'
  if (n.includes('inter')) return 'nivel-intermedio'
  return 'nivel-default'
}

function formatTurnoCorto(turnos = []) {
  if (!turnos.length) return ''
  const t = turnos[0]
  const d = new Date(t.fecha_inicio)
  const dia = d.toLocaleDateString('es-AR', { weekday: 'short' })
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${hora}`
}

export default function MisAlumnosEntrenador() {
  const navigate = useNavigate()
  const { alumnos, cargando } = useMisAlumnos()
  const [filtro, setFiltro] = useState('Todos')

  const alumnosFiltrados = alumnos.filter((a) => {
    if (filtro === 'Todos') return true
    const nivel = a.nivel?.nombre?.toLowerCase() || ''
    if (filtro === 'Rojo') return nivel.includes('rojo')
    if (filtro === 'Interm.') return nivel.includes('inter')
    if (filtro === 'Azul') return nivel.includes('azul')
    return true
  })

  return (
    <div className="mis-alumnos-e">
      <header className="mis-alumnos-e-header">
        <h1>Mis alumnos</h1>
        <p className="subtitulo">
          {cargando ? '...' : `${alumnos.length} asignado${alumnos.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      <div className="filtros-nivel">
        {FILTROS.map((f) => (
          <button
            key={f}
            className={`filtro-btn ${filtro === f ? 'activo' : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="sin-alumnos">Cargando...</div>
      ) : alumnosFiltrados.length === 0 ? (
        <div className="sin-alumnos">
          {filtro === 'Todos'
            ? 'No tenés alumnos asignados.'
            : `No hay alumnos en nivel ${filtro}.`}
        </div>
      ) : (
        <div className="alumnos-lista">
          {alumnosFiltrados.map((alumno) => {
            const nivelNombre = alumno.nivel?.nombre || ''
            return (
              <div
                key={alumno.id}
                className="alumno-item"
                onClick={() => navigate(`/entrenador/alumnos/${alumno.id}`)}
              >
                <div className="alumno-avatar">{iniciales(alumno.nombre)}</div>
                <div className="alumno-info">
                  <p className="alumno-nombre">{alumno.nombre}</p>
                  <p className="alumno-turno">{formatTurnoCorto(alumno.turnos)}</p>
                </div>
                <div className="alumno-derecha">
                  {nivelNombre && (
                    <span className={`badge-nivel-alumno ${nivelBadgeClass(nivelNombre)}`}>
                      {nivelNombre}
                    </span>
                  )}
                  {/* Punto rojo si el nivel es Rojo (alumno que necesita atención) */}
                  {nivelNombre.toLowerCase().includes('rojo') && (
                    <span className="dot-alerta" aria-label="Requiere atención" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BottomNavEntrenador />
    </div>
  )
}
