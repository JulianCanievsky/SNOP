import { useState } from 'react'
import { useJuegoLibre } from './useJuegoLibre'
import DetalleJuegoLibre from './DetalleJuegoLibre'
import './JuegoLibre.css'

const formatearFecha = (fechaISO) => {
  const fecha = new Date(fechaISO)
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${dias[fecha.getDay()]} ${fecha.getDate()} ${meses[fecha.getMonth()]}`
}

const formatearHora = (inicio, fin) => {
  const h = (d) => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${h(inicio)} — ${h(fin)} hs`
}

const calcularDuracion = (inicio, fin) => {
  const minutos = Math.round((new Date(fin) - new Date(inicio)) / 60000)
  return `${minutos} minutos`
}

const AvatarParticipante = ({ participante }) => {
  const iniciales = participante.nombre
    ? participante.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  return (
    <div className="avatar-participante" title={participante.nombre}>
      {participante.foto_url
        ? <img src={participante.foto_url} alt={participante.nombre} />
        : <span>{iniciales}</span>}
    </div>
  )
}

const BarraCapacidad = ({ inscriptos, capacidad }) => {
  const porcentaje = Math.min((inscriptos / capacidad) * 100, 100)
  const completo = inscriptos >= capacidad
  return (
    <div className="barra-capacidad-wrapper">
      <div className="barra-capacidad">
        <div
          className={`barra-relleno ${completo ? 'completo' : ''}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  )
}

const TarjetaEvento = ({ evento, onAnotarme, onCancelar }) => {
  const completo = evento.estado === 'completo'
  const yaInscripto = evento.ya_inscripto

  return (
    <div className={`tarjeta-evento ${completo ? 'tarjeta-completa' : ''}`}>
      <div className="tarjeta-header">
        <div className="tarjeta-fecha">{formatearFecha(evento.fecha_inicio)}</div>
        <span className={`badge-estado ${completo ? 'badge-completo' : 'badge-abierto'}`}>
          {completo ? 'Completo' : 'Abierto'}
        </span>
      </div>

      <div className="tarjeta-info">
        <div className="info-fila">
          <span className="icono">⏰</span>
          <span>{formatearHora(evento.fecha_inicio, evento.fecha_fin)} · Sede {evento.nombre_sede}</span>
        </div>
        <div className="info-fila">
          <span>{evento.inscriptos}/{evento.capacidad_maxima} lugares</span>
        </div>
      </div>

      <BarraCapacidad inscriptos={evento.inscriptos} capacidad={evento.capacidad_maxima} />

      <div className="tarjeta-footer">
        <div className="participantes-lista">
          {(evento.participantes || []).slice(0, 6).map((p, i) => (
            <AvatarParticipante key={i} participante={p} />
          ))}
        </div>
        {yaInscripto
          ? <button className="btn-cancelar-inscripcion" onClick={() => onCancelar(evento)}>Cancelar</button>
          : completo
            ? <button className="btn-lleno" disabled>Lleno</button>
            : <button className="btn-anotarme" onClick={() => onAnotarme(evento)}>Anotarme</button>
        }
      </div>
    </div>
  )
}

const JuegoLibre = () => {
  const { eventos, cargando, error, cargarEventos, inscribirse, cancelarInscripcion } = useJuegoLibre()
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null)
  const [filtroSede, setFiltroSede] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')

  const handleAnotarme = (evento) => {
    setEventoSeleccionado(evento)
  }

  const handleConfirmar = async () => {
    try {
      await inscribirse(eventoSeleccionado.id)
      setEventoSeleccionado(null)
      await cargarEventos({ sede_id: filtroSede, fecha: filtroFecha })
    } catch (err) {
      alert(err.response?.data?.error || 'Error al inscribirse')
    }
  }

  const handleCancelarDesdeDetalle = async (eventoId) => {
    try {
      await cancelarInscripcion(eventoId)
      setEventoSeleccionado(null)
      await cargarEventos({ sede_id: filtroSede, fecha: filtroFecha })
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cancelar')
    }
  }

  const handleFiltrar = () => {
    cargarEventos({ sede_id: filtroSede, fecha: filtroFecha })
  }

  if (eventoSeleccionado) {
    return (
      <DetalleJuegoLibre
        evento={eventoSeleccionado}
        calcularDuracion={calcularDuracion}
        formatearHora={formatearHora}
        onVolver={() => setEventoSeleccionado(null)}
        onConfirmar={handleConfirmar}
        onCancelar={handleCancelarDesdeDetalle}
      />
    )
  }

  return (
    <div className="juego-libre-container">
      <div className="jl-header">
        <div className="jl-header-contenido">
          <h1 className="jl-titulo">Juego libre</h1>
          <p className="jl-subtitulo">Anotate a los próximos espacios</p>
        </div>
      </div>

      <div className="jl-filtros">
        <div className="filtro-grupo">
          <select
            className="filtro-select"
            value={filtroSede}
            onChange={e => setFiltroSede(e.target.value)}
          >
            <option value="">Todas las sedes</option>
            <option value="1">Sede Palermo</option>
            <option value="2">Sede Armenia</option>
          </select>
          <input
            type="date"
            className="filtro-fecha"
            value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
          />
        </div>
        <button className="btn-filtrar" onClick={handleFiltrar}>Buscar</button>
      </div>

      <div className="jl-contenido">
        <p className="seccion-titulo">PRÓXIMOS ESPACIOS</p>

        {cargando && (
          <div className="estado-carga">
            <div className="spinner" />
            <span>Cargando eventos...</span>
          </div>
        )}

        {error && (
          <div className="estado-error">
            <p>{error}</p>
            <button onClick={() => cargarEventos()} className="btn-reintentar">Reintentar</button>
          </div>
        )}

        {!cargando && !error && eventos.map(evento => (
          <TarjetaEvento
            key={evento.id}
            evento={evento}
            onAnotarme={handleAnotarme}
            onCancelar={(ev) => setEventoSeleccionado(ev)}
          />
        ))}
      </div>
    </div>
  )
}

export default JuegoLibre
