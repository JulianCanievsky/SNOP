import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMisAlumnos, useNiveles } from '../../../hooks/useEntrenador'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import CategoriaBadge from '../../../components/ui/CategoriaBadge/CategoriaBadge'
import './MisAlumnosEntrenador.css'

function iniciales(nombre = '') {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

const TZ = 'America/Argentina/Buenos_Aires'

function formatTurnoCorto(turnos = []) {
  if (!turnos.length) return ''
  const t = turnos[0]
  const d = new Date(t.fecha_inicio)
  const dia  = d.toLocaleDateString('es-AR', { weekday: 'short', timeZone: TZ })
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${hora}`
}

export default function MisAlumnosEntrenador() {
  const navigate = useNavigate()
  const { alumnos, cargando }   = useMisAlumnos()
  const { niveles }             = useNiveles()
  // filtroId: null = "Todos"; number = nivel_id específico
  const [filtroId, setFiltroId] = useState(null)

  const alumnosFiltrados = alumnos.filter((a) => {
    if (filtroId === null) return true
    return a.nivel?.id === filtroId
  })

  return (
    <div className="mis-alumnos-e">
      <header className="mis-alumnos-e-header">
        <h1>Mis alumnos</h1>
        <p className="subtitulo">
          {cargando ? '...' : `${alumnos.length} asignado${alumnos.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      {/* Filtros dinámicos por categoría */}
      <div className="filtros-nivel">
        <button
          className={`filtro-btn ${filtroId === null ? 'activo' : ''}`}
          onClick={() => setFiltroId(null)}
        >
          Todos
        </button>
        {niveles.map((n) => (
          <button
            key={n.id}
            className={`filtro-btn ${filtroId === n.id ? 'activo' : ''}`}
            onClick={() => setFiltroId(n.id)}
          >
            {n.nombre}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="sin-alumnos">Cargando...</div>
      ) : alumnosFiltrados.length === 0 ? (
        <div className="sin-alumnos">
          {filtroId === null
            ? 'No tenés alumnos asignados.'
            : `No hay alumnos en ${niveles.find(n => n.id === filtroId)?.nombre ?? 'esa categoría'}.`}
        </div>
      ) : (
        <div className="alumnos-lista">
          {alumnosFiltrados.map((alumno) => (
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
                <CategoriaBadge nivelId={alumno.nivel?.id ?? null} />
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNavEntrenador />
    </div>
  )
}
