import { useEffect, useState } from 'react'
import './MisTurnos.css'
import TurnoCard from '../../components/TurnoCard/TurnoCard'
import { getAgenda, cancelarTurno, cancelarJuegoLibre } from '../../services/turnosApi'
import BottomNav from '../../components/BottomNav/BottomNav'

export default function MisTurnos() {
  const [agenda,          setAgenda]          = useState([])
  const [loading,         setLoading]         = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState(0)

  useEffect(() => {
    async function cargar() {
      try {
        const data = await getAgenda()
        const lista = data || []
        setAgenda(lista)

        // Si hoy no tiene eventos, avanzar automáticamente al primer día con evento
        if (lista.length > 0) {
          const hoyStr = toDateStr(new Date())
          const tieneHoy = lista.some(e => e.fecha_inicio?.slice(0, 10) === hoyStr)
          if (!tieneHoy) {
            // Buscar el día más próximo con evento dentro de los próximos 7 días
            for (let i = 1; i < 7; i++) {
              const d = new Date()
              d.setDate(d.getDate() + i)
              if (lista.some(e => e.fecha_inicio?.slice(0, 10) === toDateStr(d))) {
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
  }, [])

  // Próximos 7 días
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date()
    fecha.setDate(fecha.getDate() + i)
    const fechaStr = toDateStr(fecha)
    const tieneEvento = agenda.some(e => e.fecha_inicio?.slice(0, 10) === fechaStr)
    return {
      fecha,
      letra:  fecha.toLocaleDateString('es-AR', { weekday: 'short' }).charAt(0).toUpperCase(),
      numero: fecha.getDate(),
      tieneEvento,
    }
  })

  const fechaSeleccionada = toDateStr(dias[diaSeleccionado].fecha)

  const eventosFiltrados = agenda.filter(e =>
    e.fecha_inicio?.slice(0, 10) === fechaSeleccionada
  )

  async function onCancelar(evento) {
    try {
      if (evento.tipo === 'juego_libre') {
        await cancelarJuegoLibre(evento.juego_libre_id)
      } else {
        // turno_id es el id real del turno en la tabla turnos
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
              {dia.tieneEvento && <span className="dia-punto" />}
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
    </div>
  )
}

function toDateStr(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
