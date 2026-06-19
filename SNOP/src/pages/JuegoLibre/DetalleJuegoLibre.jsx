import './JuegoLibre.css'

const AvatarParticipanteGrande = ({ participante }) => {
  const iniciales = participante.nombre
    ? participante.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  return (
    <div className="avatar-grande-wrapper" title={participante.nombre}>
      <div className="avatar-grande">
        {participante.foto_url
          ? <img src={participante.foto_url} alt={participante.nombre} />
          : <span>{iniciales}</span>}
      </div>
      <span className="avatar-nombre">{participante.nombre?.split(' ')[0]}</span>
    </div>
  )
}

const DetalleJuegoLibre = ({
  evento,
  calcularDuracion,
  formatearHora,
  onVolver,
  onConfirmar,
  onCancelar,
}) => {
  const duracion = calcularDuracion(evento.fecha_inicio, evento.fecha_fin)
  const horario = formatearHora(evento.fecha_inicio, evento.fecha_fin)

  const fechaFormateada = new Date(evento.fecha_inicio).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const fechaCapitalizada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)

  return (
    <div className="detalle-container">
      <div className="detalle-header">
        <button className="btn-volver" onClick={onVolver}>
          ← Juego libre
        </button>
        <h1 className="detalle-fecha">{fechaCapitalizada}</h1>
        <p className="detalle-subtitulo">Juego libre</p>
      </div>

      <div className="detalle-contenido">
        <div className="detalle-card">
          <div className="detalle-fila">
            <span className="detalle-icono">⏰</span>
            <div>
              <p className="detalle-valor">{horario}</p>
              <p className="detalle-meta">{duracion}</p>
            </div>
          </div>

          <div className="detalle-separador" />

          <div className="detalle-fila">
            <span className="detalle-icono">📍</span>
            <div>
              <p className="detalle-valor">Sede {evento.nombre_sede}</p>
              <p className="detalle-meta">{evento.capacidad_maxima - evento.inscriptos} mesas disponibles</p>
            </div>
          </div>

          <div className="detalle-separador" />

          <div className="detalle-fila">
            <span className="detalle-icono">👥</span>
            <div>
              <p className="detalle-valor">{evento.inscriptos} / {evento.capacidad_maxima} lugares</p>
              <p className="detalle-meta">Abierto para todos los niveles</p>
            </div>
          </div>

          <div className="barra-detalle-wrapper">
            <div className="barra-capacidad">
              <div
                className="barra-relleno"
                style={{ width: `${Math.min((evento.inscriptos / evento.capacidad_maxima) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="anotados-seccion">
          <p className="anotados-titulo">ANOTADOS ({evento.inscriptos}/{evento.capacidad_maxima})</p>
          <div className="anotados-grid">
            {evento.participantes.map((p, i) => (
              <AvatarParticipanteGrande key={i} participante={p} />
            ))}
          </div>
        </div>

        <div className="info-club-card">
          <p className="info-club-titulo">El club provee todo el material</p>
          <p className="info-club-items">Paletas · Pelotas · Mesas — no traés nada</p>
        </div>

        <div className="detalle-acciones">
          {evento.ya_inscripto
            ? <button className="btn-cancelar-inscripcion" onClick={() => onCancelar(evento.id)}>
                Cancelar inscripción
              </button>
            : <button className="btn-confirmar" onClick={onConfirmar}>
                Confirmar inscripción
              </button>
          }
        </div>
      </div>
    </div>
  )
}

export default DetalleJuegoLibre
