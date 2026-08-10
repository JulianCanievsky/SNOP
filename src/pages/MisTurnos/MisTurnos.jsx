import { useEffect, useState } from 'react'
import './MisTurnos.css'
import TurnoCard from '../../components/TurnoCard/TurnoCard'
import { getAgenda, cancelarTurno, cancelarJuegoLibre, cancelarTorneo } from '../../services/turnosApi'
import BottomNav from '../../components/BottomNav/BottomNav'
import RatingEntrenador from '../../components/RatingEntrenador/RatingEntrenador'
import { useRating } from '../../hooks/useRating'

const TZ = 'America/Argentina/Buenos_Aires'

// Convierte una fecha ISO (UTC) a YYYY-MM-DD en ART, independientemente del TZ del browser
function toLocalDateStr(isoString) {
  return new Date(isoString).toLocaleDateString('en-CA', { timeZone: TZ })
}

// Convierte un objeto Date local a YYYY-MM-DD en ART (para construir el selector de días)
function toDateStr(fecha) {
  return fecha.toLocaleDateString('en-CA', { timeZone: TZ })
}

export default function MisTurnos() {
  const [agenda,          setAgenda]          = useState([])
  const [loading,         setLoading]         = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState(0)

  const { turnoActual, enviando, cargarPendientes, enviarRating, omitirRating } = useRating()

  useEffect(() => {
    async function cargar() {
      try {
        const data = await getAgenda()
        const lista = data || []
        setAgenda(lista)

        // Si hoy no tiene eventos, avanzar al primer día con evento (próximos 7 días)
        if (lista.length > 0) {
          const hoyStr = toDateStr(new Date())
          const tieneHoy = lista.some(e => toLocalDateStr(e.fecha_inicio) === hoyStr)
          if (!tieneHoy) {
            for (let i = 1; i < 7; i++) {
              const d = new Date()
              d.setDate(d.getDate() + i)
              if (lista.some(e => toLocalDateStr(e.fecha_inicio) === toDateStr(d))) {
                setDiaSeleccionado(i)
                break
              }
            }
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    cargar()
    // Chequear si hay turnos para calificar cada vez que se abre la agenda
    cargarPendientes()
  }, [])

  // Próximos 7 días
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date()
    fecha.setDate(fecha.getDate() + i)
    const iso = toDateStr(fecha)
    return {
      fecha,
      letra:       fecha.toLocaleDateString('es-AR', { weekday: 'short' }).charAt(0).toUpperCase(),
      numero:      fecha.getDate(),
      iso,
      tieneEvento: agenda.some(e => toLocalDateStr(e.fecha_inicio) === iso),
    }
  })

  const fechaSeleccionada = dias[diaSeleccionado].iso

  const eventosFiltrados = agenda.filter(e =>
    toLocalDateStr(e.fecha_inicio) === fechaSeleccionada
  )

  async function onCancelar(evento) {
    try {
      if (evento.tipo === 'juego_libre') {
        await cancelarJuegoLibre(evento.juego_libre_id)
      } else if (evento.tipo === 'torneo') {
        await cancelarTorneo(evento.torneo_id)
      } else {
        await cancelarTurno(evento.turno_id)
      }
      setAgenda(prev => prev.filter(e => e.id !== evento.id))
    } catch (err) {
      console.error(err)
      alert('No se pudo cancelar. Intentá de nuevo.')
    }
  }

  return (
    <div className="mis-turnos">
      <header className="header">
        <h1>Mi Agenda</h1>
        <p className="subtitulo">Turnos, clases y juego libre</p>
        <div className="dias">
          {dias.map((dia, index) => (
            <div
              key={index}
              className={index === diaSeleccionado ? 'dia activa' : 'dia'}
              onClick={() => setDiaSeleccionado(index)}
            >
              <span>{dia.letra}</span>
              <strong>{dia.numero}</strong>
              {dia.tieneEvento && (
                <span className={`dia-punto${index === diaSeleccionado ? ' dia-punto-activo' : ''}`} />
              )}
            </div>
          ))}
        </div>
      </header>

      <main className="contenido">
        {loading ? (
          <div className="estado-carga">
            <div className="spinner-agenda" />
            <p>Cargando agenda...</p>
          </div>
        ) : eventosFiltrados.length > 0 ? (
          eventosFiltrados.map(evento => (
            <TurnoCard
              key={evento.id}
              evento={evento}
              onCancelar={() => onCancelar(evento)}
            />
          ))
        ) : (
          <p className="sin-turnos">No tenés actividades para este día.</p>
        )}
      </main>

      <BottomNav />

      {/* Rating post-turno — aparece como bottom sheet si hay algo para calificar */}
      {turnoActual && (
        <RatingEntrenador
          turno={turnoActual}
          onEnviar={enviarRating}
          onOmitir={omitirRating}
          enviando={enviando}
        />
      )}
    </div>
  )
}
