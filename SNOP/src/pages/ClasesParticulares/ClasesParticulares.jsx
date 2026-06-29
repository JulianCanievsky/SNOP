import { useState } from 'react'
import { useClasesParticulares } from '../../hooks/useClasesParticulares'
import ConfirmarClase from '../../components/TurnoCard/ConfirmarClase'
import BottomNav from '../../components/BottomNav/BottomNav'
import './ClasesParticulares.css'

const formatearDiaHora = (fechaISO) => {
  const fecha = new Date(fechaISO)
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${dias[fecha.getDay()]} ${fecha.getDate()} - ${hora}`
}

const AvatarEntrenador = ({ nombre, foto_url, tamanio = 'md' }) => {
  const iniciales = nombre
    ? nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  return (
    <div className={`avatar-entrenador avatar-${tamanio}`}>
      {foto_url
        ? <img src={foto_url} alt={nombre} />
        : <span>{iniciales}</span>}
    </div>
  )
}

const Estrellas = ({ rating }) => {
  const valor = parseFloat(rating) || 0
  return <span className="estrellas">⭐ {valor.toFixed(1)}</span>
}

const TarjetaEntrenador = ({ entrenador, solicitudes, onReservar }) => {
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)

  const yaReservado =
    turnoSeleccionado &&
    (solicitudes || []).some(s => s.turnos?.id === turnoSeleccionado.id)

  const handleReservar = () => {
    if (!turnoSeleccionado || yaReservado) return
    onReservar(entrenador, turnoSeleccionado)
  }

  return (
    <div className="tarjeta-entrenador">
      <div className="entrenador-info">
        <AvatarEntrenador nombre={entrenador.nombre} foto_url={entrenador.foto_url} />
        <div className="entrenador-datos">
          <p className="entrenador-nombre">{entrenador.nombre}</p>
          <div className="entrenador-meta">
            <Estrellas rating={entrenador.rating} />
            <span className="entrenador-tipo">· {entrenador.tipo_usuario || 'Entrenador'}</span>
          </div>
        </div>
      </div>

      <div className="turnos-seccion">
        <p className="turnos-label">Horarios disponibles:</p>
        {entrenador.turnos_disponibles.slice(0, 4).map(turno => {
          const solicitado = solicitudes.some(s => s.turnos.id === turno.id)
          return (
            <button
              key={turno.id}
              className={`chip-turno ${solicitado ? 'chip-solicitado' : 'chip-disponible'} ${turnoSeleccionado?.id === turno.id ? 'chip-seleccionado' : ''}`}
              onClick={() => setTurnoSeleccionado(turno)}
            >
              {formatearDiaHora(turno.fecha_inicio)}
              <span className="chip-duracion">{turno.duracion_min} Min</span>
            </button>
          )
        })}
      </div>

      <button
        className="btn-reservar"
        onClick={handleReservar}
        disabled={!turnoSeleccionado || yaReservado}
      >
        {yaReservado ? 'Ya solicitado' : 'Reservar clase'}
      </button>
    </div>
  )
}

const ClasesParticulares = () => {
  const {
    entrenadores,
    solicitudes,
    cargando,
    error,
    cargarEntrenadores,
    enviarSolicitud,
    obtenerSolicitudes,
    liberarSolicitud,
  } = useClasesParticulares()

  const [reserva, setReserva] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [fechaFiltro, setFechaFiltro] = useState('')

  const handleReservar = (entrenador, turno) => {
    setReserva({ entrenador, turno })
    setExito(false)
  }

  const handleConfirmar = async () => {
    if (!reserva) return
    try {
      setEnviando(true)
      await enviarSolicitud({
        entrenador_id: reserva.entrenador.id,
        turno_id: reserva.turno.id,
      })
      setExito(true)
      setReserva(null)
      await cargarEntrenadores()
      await obtenerSolicitudes()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al enviar la solicitud')
    } finally {
      setEnviando(false)
    }
  }

  const entrenadoresFiltrados = entrenadores
    .map(entrenador => ({
      ...entrenador,
      turnos_disponibles: entrenador.turnos_disponibles.filter(turno => {
        if (!fechaFiltro) return true
        const fechaTurno = new Date(turno.fecha_inicio)
        const año = fechaTurno.getFullYear()
        const mes = String(fechaTurno.getMonth() + 1).padStart(2, '0')
        const dia = String(fechaTurno.getDate()).padStart(2, '0')
        return `${año}-${mes}-${dia}` === fechaFiltro
      }),
    }))
    .filter(e => e.turnos_disponibles.length > 0)

  if (reserva) {
    return (
      <ConfirmarClase
        entrenador={reserva.entrenador}
        turno={reserva.turno}
        onVolver={() => setReserva(null)}
        onConfirmar={handleConfirmar}
        enviando={enviando}
      />
    )
  }

  return (
    <div className="clases-container">
      <div className="clases-header">
        <div className="clases-header-contenido">
          <h1 className="clases-titulo">Clases particulares</h1>
          <p className="clases-subtitulo">Reservá con un entrenador — pago aparte</p>
        </div>
      </div>

      <div className="clases-body">
        {exito && (
          <div className="alerta-exito">
            ✓ Solicitud enviada. El entrenador la revisará pronto.
          </div>
        )}

        <div className="filtro-fecha">
          <label>Buscar por día</label>
          <input
            type="date"
            value={fechaFiltro}
            onChange={e => setFechaFiltro(e.target.value)}
          />
        </div>

        <div className="leyenda-turnos">
          <div className="leyenda-item">
            <span className="leyenda-color disponible" />
            <span>Disponible</span>
          </div>
          <div className="leyenda-item">
            <span className="leyenda-color solicitado" />
            <span>Ya solicitado</span>
          </div>
        </div>

        <p className="seccion-label">ENTRENADORES DISPONIBLES</p>

        {cargando && (
          <div className="estado-carga">
            <div className="spinner" />
            <span>Cargando entrenadores...</span>
          </div>
        )}

        {error && (
          <div className="estado-error">
            <p>{error}</p>
            <button onClick={cargarEntrenadores} className="btn-reintentar">Reintentar</button>
          </div>
        )}

        {!cargando && !error && entrenadoresFiltrados.length === 0 && (
          <div className="estado-vacio">
            <div className="estado-vacio-icono">🏓</div>
            <p className="estado-vacio-titulo">No hay entrenadores para esa fecha</p>
            <p className="estado-vacio-sub">Probá seleccionando otro día</p>
          </div>
        )}

        {!cargando && !error && entrenadoresFiltrados.map(entrenador => (
          <TarjetaEntrenador
            key={entrenador.id}
            entrenador={entrenador}
            solicitudes={solicitudes}
            onReservar={handleReservar}
          />
        ))}

        {solicitudes.length > 0 && (
          <>
            <p className="seccion-label">MIS SOLICITUDES</p>
            <div className="mis-solicitudes">
              {solicitudes.map(s => (
                <div key={s.id} className="solicitud-card">
                  <div className="solicitud-fecha">
                    {new Date(s.turnos.fecha_inicio).toLocaleDateString('es-AR')}
                  </div>
                  <div className="solicitud-hora">
                    {new Date(s.turnos.fecha_inicio).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className={`estado-solicitud ${s.estado ? 'confirmado' : 'pendiente'}`}>
                    <span className="estado-icono">{s.estado ? '✅' : '⏳'}</span>
                    <span>{s.estado ? 'Confirmado' : 'Pendiente'}</span>
                  </div>
                  <button
                    className="btn-liberar"
                    onClick={async () => {
                      await liberarSolicitud(s.id)
                      await cargarEntrenadores()
                      await obtenerSolicitudes()
                    }}
                  >
                    Liberar turno
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default ClasesParticulares
