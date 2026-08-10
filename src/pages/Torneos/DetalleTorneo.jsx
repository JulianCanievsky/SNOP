import './Torneos.css'

const AvatarGrande = ({ p }) => {
  const ini = p.nombre ? p.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
  return (
    <div className="tor-avatar-grande-wrap" title={p.nombre}>
      <div className="tor-avatar-grande">
        {p.foto_url ? <img src={p.foto_url} alt={p.nombre} /> : <span>{ini}</span>}
      </div>
      <span className="tor-avatar-nombre">{p.nombre?.split(' ')[0]}</span>
    </div>
  )
}

const TZ = 'America/Argentina/Buenos_Aires'

const formatFecha = (iso) => {
  const d = new Date(iso)
  const fecha = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
  return fecha.charAt(0).toUpperCase() + fecha.slice(1)
}

const formatHora = (ini, fin) => {
  const h = d => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return fin ? `${h(ini)} — ${h(fin)} hs` : `${h(ini)} hs`
}

export default function DetalleTorneo({ torneo, onVolver, onInscribir, onCancelar, procesando }) {
  return (
    <div className="tor-detalle-container">
      <div className="tor-detalle-header">
        <button className="tor-btn-volver" onClick={onVolver}>← Torneos</button>
        <h1 className="tor-detalle-nombre">{torneo.nombre}</h1>
        <p className="tor-detalle-sub">
          {torneo.modalidad === 'dobles' ? '👥 Dobles' : '🧍 Singles'}
        </p>
      </div>

      <div className="tor-detalle-body">
        <div className="tor-detalle-card">
          <div className="tor-detalle-fila">
            <span className="tor-detalle-ico">📅</span>
            <div>
              <p className="tor-detalle-val">{formatFecha(torneo.fecha_inicio)}</p>
              <p className="tor-detalle-meta">{formatHora(torneo.fecha_inicio, torneo.fecha_fin)}</p>
            </div>
          </div>
          <div className="tor-detalle-sep" />
          <div className="tor-detalle-fila">
            <span className="tor-detalle-ico">📍</span>
            <div>
              <p className="tor-detalle-val">{torneo.nombre_sede}</p>
            </div>
          </div>
          <div className="tor-detalle-sep" />
          <div className="tor-detalle-fila">
            <span className="tor-detalle-ico">👥</span>
            <div>
              <p className="tor-detalle-val">{torneo.inscriptos} / {torneo.capacidad_maxima} inscriptos</p>
              {torneo.niveles_habilitados?.length > 0 && (
                <p className="tor-detalle-meta">Niveles: {torneo.niveles_habilitados.join(', ')}</p>
              )}
            </div>
          </div>

          {torneo.modalidad === 'dobles' && (
            <>
              <div className="tor-detalle-sep" />
              <div className="tor-detalle-aviso">
                <p>🗓️ Las parejas serán asignadas por el organizador el día del torneo.</p>
              </div>
            </>
          )}
        </div>

        {torneo.participantes?.length > 0 && (
          <div className="tor-anotados">
            <p className="tor-anotados-titulo">INSCRIPTOS ({torneo.inscriptos}/{torneo.capacidad_maxima})</p>
            <div className="tor-anotados-grid">
              {torneo.participantes.map((p, i) => <AvatarGrande key={i} p={p} />)}
            </div>
          </div>
        )}

        <div className="tor-detalle-acciones">
          {torneo.ya_inscripto ? (
            <button
              className="tor-btn-cancelar-det"
              onClick={() => onCancelar(torneo)}
              disabled={procesando}
            >
              {procesando ? 'Cancelando...' : 'Cancelar inscripción'}
            </button>
          ) : torneo.estado === 'completo' ? (
            <button className="tor-btn-lleno" disabled>Torneo completo</button>
          ) : (
            <button
              className="tor-btn-confirmar"
              onClick={() => onInscribir(torneo)}
              disabled={procesando}
            >
              {procesando ? 'Procesando...' : 'Confirmar inscripción'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
