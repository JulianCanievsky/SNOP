import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTorneos, inscribirTorneo, cancelarTorneo } from '../../services/torneosApi'
import DetalleTorneo from './DetalleTorneo'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Torneos.css'

const formatFecha = (iso) => {
  const d = new Date(iso)
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`
}

const formatHora = (ini, fin) => {
  const h = d => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return fin ? `${h(ini)} — ${h(fin)} hs` : `${h(ini)} hs`
}

const AvatarP = ({ p }) => {
  const ini = p.nombre ? p.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
  return (
    <div className="tor-avatar" title={p.nombre}>
      {p.foto_url ? <img src={p.foto_url} alt={p.nombre} /> : <span>{ini}</span>}
    </div>
  )
}

const TarjetaTorneo = ({ torneo, onVer, onCancelar }) => {
  const completo    = torneo.estado === 'completo'
  const yaInscripto = torneo.ya_inscripto

  return (
    <div className={`tor-card${completo ? ' tor-card--completo' : ''}`}>
      <div className="tor-card-header">
        <div>
          <p className="tor-nombre">{torneo.nombre}</p>
          <p className="tor-fecha">{formatFecha(torneo.fecha_inicio)}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className={`tor-badge${completo ? ' tor-badge--completo' : ''}`}>
            {completo ? 'Completo' : 'Abierto'}
          </span>
          <span className="tor-modalidad">{torneo.modalidad === 'dobles' ? '👥 Dobles' : '🧍 Singles'}</span>
        </div>
      </div>

      <div className="tor-info">
        <span>⏰ {formatHora(torneo.fecha_inicio, torneo.fecha_fin)}</span>
        <span>📍 {torneo.nombre_sede}</span>
        <span>👥 {torneo.inscriptos}/{torneo.capacidad_maxima} inscriptos</span>
      </div>

      <div className="tor-footer">
        <div className="tor-avatares">
          {(torneo.participantes || []).slice(0, 5).map((p, i) => (
            <AvatarP key={i} p={p} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tor-btn-ver" onClick={() => onVer(torneo)}>Ver</button>
          {yaInscripto
            ? <button className="tor-btn-cancelar" onClick={() => onCancelar(torneo)}>Cancelar</button>
            : !completo && <button className="tor-btn-anotarme" onClick={() => onVer(torneo)}>Anotarme</button>
          }
        </div>
      </div>
    </div>
  )
}

export default function Torneos() {
  const navigate = useNavigate()
  const [torneos,    setTorneos]    = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [error,      setError]      = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await getTorneos()
      setTorneos(data ?? [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar torneos')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleInscribir(torneo) {
    if (procesando) return
    setProcesando(true)
    try {
      await inscribirTorneo(torneo.id)
      setSeleccionado(null)
      await cargar()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al inscribirse')
    } finally {
      setProcesando(false)
    }
  }

  async function handleCancelar(torneo) {
    if (procesando) return
    setProcesando(true)
    try {
      await cancelarTorneo(torneo.id)
      setSeleccionado(null)
      await cargar()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cancelar')
    } finally {
      setProcesando(false)
    }
  }

  if (seleccionado) {
    return (
      <DetalleTorneo
        torneo={seleccionado}
        onVolver={() => setSeleccionado(null)}
        onInscribir={handleInscribir}
        onCancelar={handleCancelar}
        procesando={procesando}
      />
    )
  }

  return (
    <div className="torneos-container">
      <div className="tor-header">
        <h1 className="tor-titulo">Torneos</h1>
        <p className="tor-subtitulo">Inscribite a los torneos del club</p>
      </div>

      <div className="tor-contenido">
        {cargando && (
          <div className="tor-estado">
            <div className="tor-spinner" />
            <span>Cargando torneos...</span>
          </div>
        )}

        {error && (
          <div className="tor-estado tor-estado--error">
            <p>{error}</p>
            <button onClick={cargar} className="tor-btn-reintentar">Reintentar</button>
          </div>
        )}

        {!cargando && !error && torneos.length === 0 && (
          <div className="tor-estado">
            <p>No hay torneos próximos publicados.</p>
          </div>
        )}

        {!cargando && !error && torneos.map(t => (
          <TarjetaTorneo
            key={t.id}
            torneo={t}
            onVer={setSeleccionado}
            onCancelar={handleCancelar}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
