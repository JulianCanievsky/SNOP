import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/apiClient.js'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Inicio.css'

const STORAGE_KEY = 'snop_comunicado_leido'

function getUltimoLeido() {
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
}

function calcularNoLeidos(comunicados) {
  const ultimoLeido = getUltimoLeido()
  return comunicados.filter(c => c.id > ultimoLeido).length
}

export default function Inicio() {
  const { user } = useAuth()
  const [proximosTurnos, setProximosTurnos] = useState([])
  const [comunicados, setComunicados] = useState([])
  const [noLeidos, setNoLeidos] = useState(0)
  const navigate = useNavigate()

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = user?.nombre?.split(' ')[0] || 'Socio'

  useEffect(() => {
    async function fetchProximosTurnos() {
      if (!user?.id) return
      try {
        const { data } = await api.get('/perfil')
        const turnos = data?.data?.turnos ?? []
        const ahora = new Date()
        const futuros = turnos
          .filter(t => t.turnos?.fecha_inicio && new Date(t.turnos.fecha_inicio) >= ahora)
          .sort((a, b) => new Date(a.turnos.fecha_inicio) - new Date(b.turnos.fecha_inicio))
          .slice(0, 2)
        setProximosTurnos(futuros)
      } catch (err) {
        console.error(err)
      }
    }

    async function fetchComunicados() {
      try {
        const { data } = await api.get('/comunicados')
        const lista = data?.data ?? []
        setComunicados(lista)
        setNoLeidos(calcularNoLeidos(lista))
      } catch {
        // si falla no rompemos la pantalla
      }
    }

    fetchProximosTurnos()
    fetchComunicados()

    // Cuando el usuario vuelve de la pantalla de comunicados, resetea el badge
    function onLeidos() { setNoLeidos(0) }
    window.addEventListener('comunicados-leidos', onLeidos)
    return () => window.removeEventListener('comunicados-leidos', onLeidos)
  }, [user])

  const accesos = [
    { label: 'Mis turnos',  sub: 'Ver horario',     emoji: '📅', path: '/mis-turnos' },
    { label: 'Juego libre', sub: 'Anotarme',         emoji: '🏓', path: '/juego-libre' },
    { label: 'Clases',      sub: 'Con entrenador',   emoji: '👥', path: '/clases-particulares' },
    { label: 'Mi perfil',   sub: 'Cuenta y turnos',  emoji: '👤', path: '/perfil' },
  ]

  function formatFecha(fechaISO) {
    const d = new Date(fechaISO)
    const fecha = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    return fecha.charAt(0).toUpperCase() + fecha.slice(1)
  }

  function formatHora(inicio, fin) {
    const h = (d) => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${h(inicio)} — ${h(fin)} hs`
  }

  return (
    <div className="inicio">
      {/* HEADER */}
      <header className="inicio-header">
        <div className="inicio-header-top">
          <div>
            <p className="saludo-sub">{saludo},</p>
            <h1 className="saludo-nombre">{nombre}</h1>
          </div>

          {/* Botón campana con badge de no leídos */}
          <button
            className="btn-campana"
            aria-label={`Comunicados${noLeidos > 0 ? ` — ${noLeidos} sin leer` : ''}`}
            onClick={() => navigate('/comunicados')}
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

        {/* BLOQUE PRÓXIMOS TURNOS */}
        <div className="proximos-turnos-bloque">
          {proximosTurnos.length === 0 ? (
            <div className="proximo-turno sin-turno">
              <span className="proximo-turno-texto">Sin próximos turnos</span>
            </div>
          ) : (
            proximosTurnos.map((t, i) => (
              <div
                key={t.id}
                className={`proximo-turno ${i === 0 ? 'turno-principal' : 'turno-siguiente'}`}
                onClick={() => navigate('/mis-turnos')}
              >
                <div className="proximo-turno-info">
                  <span className="proximo-turno-label">{i === 0 ? 'Próximo turno' : 'Siguiente'}</span>
                  <span className="proximo-turno-fecha">{formatFecha(t.turnos.fecha_inicio)}</span>
                  <span className="proximo-turno-hora">{formatHora(t.turnos.fecha_inicio, t.turnos.fecha_fin)}</span>
                </div>
                <span className="badge-confirmado">Confirmado</span>
              </div>
            ))
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
