import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/apiClient.js'
import BottomNav from '../../components/BottomNav/BottomNav'
import { getNoLeidas } from '../../services/notificacionesApi.js'
import './Inicio.css'

const STORAGE_KEY = 'snop_comunicado_leido'

function getUltimoLeido() {
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
}

function calcularNoLeidos(comunicados) {
  const ultimoLeido = getUltimoLeido()
  return comunicados.filter(c => c.id > ultimoLeido).length
}

// Etiqueta legible según tipo de evento de la agenda
const TIPO_LABEL = {
  turno_fijo:        'Turno de entrenamiento',
  clase_particular:  'Clase particular',
  juego_libre:       'Juego libre',
  torneo:            'Torneo',
}

const TIPO_EMOJI = {
  turno_fijo:       '🏓',
  clase_particular: '👥',
  juego_libre:      '🎯',
  torneo:           '🏆',
}

// Colores del badge por tipo
const TIPO_BADGE_STYLE = {
  turno_fijo:       { background: '#e8f5e9', color: '#2e7d32' },
  clase_particular: { background: '#e8f0fe', color: '#1565c0' },
  juego_libre:      { background: '#fff8e1', color: '#e65100' },
  torneo:           { background: '#fce4ec', color: '#c62828' },
}

export default function Inicio() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [proximasActividades, setProximasActividades] = useState([])
  const [juegoLibreDisponible, setJuegoLibreDisponible] = useState(null)
  const [comunicados,          setComunicados]          = useState([])
  const [noLeidos,             setNoLeidos]             = useState(0)
  const [inscribiendose,       setInscribiendose]       = useState(false)

  const hora   = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = user?.nombre?.split(' ')[0] || 'Socio'

  const cargarDatos = useCallback(async () => {
    if (!user?.id) return
    try {
      // Agenda unificada y juego libre disponible en paralelo
      const [agendaRes, jlRes] = await Promise.allSettled([
        api.get('/agenda'),
        api.get('/juego-libre'),
      ])

      // ── Agenda ────────────────────────────────────────────────
      if (agendaRes.status === 'fulfilled') {
        const eventos = agendaRes.value.data?.data ?? []
        setProximasActividades(eventos.slice(0, 2))
      }

      // ── Juego libre disponible (aún no inscripto) ─────────────
      if (jlRes.status === 'fulfilled') {
        const todosJl = jlRes.value.data ?? []
        // El primero que esté abierto y el socio NO esté inscripto
        const disponible = todosJl.find(e => !e.ya_inscripto && e.estado !== 'completo')
        setJuegoLibreDisponible(disponible ?? null)
      }
    } catch (err) {
      console.error('Inicio — cargarDatos:', err)
    }
  }, [user])

  useEffect(() => {
    cargarDatos()

    async function fetchComunicados() {
      try {
        const [comRes, notifCount] = await Promise.allSettled([
          api.get('/comunicados'),
          getNoLeidas(),
        ])
        const lista = comRes.status === 'fulfilled' ? (comRes.value.data?.data ?? []) : []
        const notifNoLeidas = notifCount.status === 'fulfilled' ? notifCount.value : 0
        setComunicados(lista)
        // Badge combina comunicados no leídos + notificaciones in-app no leídas
        setNoLeidos(calcularNoLeidos(lista) + notifNoLeidas)
      } catch {
        // si falla no rompemos la pantalla
      }
    }

    fetchComunicados()

    function onLeidos() { setNoLeidos(0) }
    window.addEventListener('comunicados-leidos', onLeidos)
    window.addEventListener('notificaciones-leidas', onLeidos)
    return () => {
      window.removeEventListener('comunicados-leidos', onLeidos)
      window.removeEventListener('notificaciones-leidas', onLeidos)
    }
  }, [cargarDatos])

  async function handleAnotarme(e, evento) {
    e.stopPropagation()
    if (inscribiendose) return
    setInscribiendose(true)
    try {
      await api.post(`/juego-libre/${evento.id}/inscribir`, {})
      // Refrescar para que aparezca en agenda
      await cargarDatos()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo inscribir. Intentá de nuevo.')
    } finally {
      setInscribiendose(false)
    }
  }

  const accesos = [
    { label: 'Mis turnos',  sub: 'Ver horario',     emoji: '📅', path: '/mis-turnos' },
    { label: 'Juego libre', sub: 'Anotarme',         emoji: '🏓', path: '/juego-libre' },
    { label: 'Clases',      sub: 'Con entrenador',   emoji: '👥', path: '/clases-particulares' },
    { label: 'Mis clases',  sub: 'Bono y créditos',  emoji: '🎫', path: '/mis-clases' },
    { label: 'Torneos',     sub: 'Inscribirme',       emoji: '🏆', path: '/torneos' },
    { label: 'Mi perfil',   sub: 'Cuenta y turnos',  emoji: '👤', path: '/perfil' },
  ]

  const TZ = 'America/Argentina/Buenos_Aires'

  function formatFecha(fechaISO) {
    const d = new Date(fechaISO)
    const fecha = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
    return fecha.charAt(0).toUpperCase() + fecha.slice(1)
  }

  function formatHora(inicio, fin) {
    const h = (d) => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
    return fin ? `${h(inicio)} — ${h(fin)} hs` : `${h(inicio)} hs`
  }

  // Decide a dónde navegar al clickear una tarjeta según tipo
  function navegarEvento(tipo) {
    if (tipo === 'juego_libre') return navigate('/mis-turnos')
    if (tipo === 'clase_particular') return navigate('/mis-turnos')
    if (tipo === 'torneo') return navigate('/torneos')
    navigate('/mis-turnos')
  }

  // Determina si mostrar la tarjeta de juego libre disponible:
  // solo si el próximo evento de la agenda no es ya un juego libre inscripto
  const mostrarTarjetaJL =
    juegoLibreDisponible !== null &&
    !proximasActividades.some(e => e.tipo === 'juego_libre')

  return (
    <div className="inicio">
      {/* HEADER */}
      <header className="inicio-header">
        <div className="inicio-header-top">
          <div>
            <p className="saludo-sub">{saludo},</p>
            <h1 className="saludo-nombre">{nombre}</h1>
            {user?.nivel_nombre && (
              <span className="inicio-nivel-badge">{user.nivel_nombre}</span>
            )}
          </div>

          {/* Campana */}
          <button
            className="btn-campana"
            aria-label={`Notificaciones${noLeidos > 0 ? ` — ${noLeidos} sin leer` : ''}`}
            onClick={() => navigate('/notificaciones')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {noLeidos > 0 && (
              <span className="campana-badge" aria-hidden="true">
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </button>
        </div>

        {/* BLOQUE PRÓXIMAS ACTIVIDADES */}
        <div className="proximos-turnos-bloque">
          {proximasActividades.length === 0 && !mostrarTarjetaJL ? (
            <div className="proximo-turno sin-turno">
              <span className="proximo-turno-texto">Sin próximas actividades</span>
            </div>
          ) : (
            <>
              {proximasActividades.map((ev, i) => {
                const tipo  = ev.tipo
                const label = TIPO_LABEL[tipo] ?? 'Actividad'
                const emoji = TIPO_EMOJI[tipo] ?? '📌'
                const badgeStyle = TIPO_BADGE_STYLE[tipo] ?? { background: '#e8f5e9', color: '#2e7d32' }

                return (
                  <div
                    key={ev.id}
                    className={`proximo-turno ${i === 0 ? 'turno-principal' : 'turno-siguiente'}`}
                    onClick={() => navegarEvento(tipo)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navegarEvento(tipo)}
                  >
                    <div className="proximo-turno-info">
                      <span className="proximo-turno-label">
                        {i === 0 ? 'Próxima actividad' : 'Siguiente'} · {emoji} {label}
                      </span>
                      <span className="proximo-turno-fecha">{formatFecha(ev.fecha_inicio)}</span>
                      <span className="proximo-turno-hora">
                        {formatHora(ev.fecha_inicio, ev.fecha_fin)}
                        {ev.sede ? ` · ${ev.sede}` : ''}
                      </span>
                    </div>
                    <span className="badge-confirmado" style={badgeStyle}>
                      {ev.estado === 'inscripto' ? 'Inscripto' : 'Confirmado'}
                    </span>
                  </div>
                )
              })}

              {/* Tarjeta de juego libre disponible para anotarse */}
              {mostrarTarjetaJL && (
                <div className="proximo-turno turno-jl-disponible">
                  <div className="proximo-turno-info">
                    <span className="proximo-turno-label">🎯 Juego libre disponible</span>
                    <span className="proximo-turno-fecha">{formatFecha(juegoLibreDisponible.fecha_inicio)}</span>
                    <span className="proximo-turno-hora">
                      {formatHora(juegoLibreDisponible.fecha_inicio, juegoLibreDisponible.fecha_fin)}
                      {juegoLibreDisponible.nombre_sede ? ` · ${juegoLibreDisponible.nombre_sede}` : ''}
                    </span>
                    <span className="jl-cupo-texto">
                      {juegoLibreDisponible.inscriptos}/{juegoLibreDisponible.capacidad_maxima} lugares
                    </span>
                  </div>
                  <button
                    className="btn-anotarme-home"
                    onClick={(e) => handleAnotarme(e, juegoLibreDisponible)}
                    disabled={inscribiendose}
                    aria-label="Anotarme al juego libre"
                  >
                    {inscribiendose ? '...' : 'Anotarme'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* ACCESOS RÁPIDOS */}
      <section className="seccion">
        <p className="seccion-titulo">ACCESOS RÁPIDOS</p>
        <div className="grid-accesos">
          {accesos.map((a) => (
            <button key={a.label} className="acceso-card" onClick={() => navigate(a.path)}>
              <span className="acceso-emoji">{a.emoji}</span>
              <span className="acceso-label">{a.label}</span>
              <span className="acceso-sub">{a.sub}</span>
            </button>
          ))}
        </div>
      </section>

      {/* COMUNICADOS */}
      <section className="seccion">
        <div className="seccion-header-row">
          <p className="seccion-titulo">COMUNICADOS</p>
          <button className="btn-ver-todos" onClick={() => navigate('/comunicados')}>
            Ver todos
          </button>
        </div>
        <div className="novedades-lista">
          {comunicados.length === 0 ? (
            <div className="novedad-item">
              <p className="novedad-titulo">Sin comunicados recientes</p>
              <p className="novedad-sub">Acá van a aparecer los comunicados del club</p>
            </div>
          ) : (
            comunicados.map((c) => {
              const esNuevo = c.id > getUltimoLeido()
              return (
                <div key={c.id} className={`novedad-item ${esNuevo ? 'novedad-item--nuevo' : ''}`}>
                  <div className="novedad-item-top">
                    <p className="novedad-titulo">{c.titulo}</p>
                    {esNuevo && <span className="novedad-badge-nuevo">Nuevo</span>}
                  </div>
                  <p className="novedad-sub">{c.mensaje}</p>
                </div>
              )
            })
          )}
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
