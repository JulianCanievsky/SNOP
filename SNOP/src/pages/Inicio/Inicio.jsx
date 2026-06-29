import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Inicio.css'

export default function Inicio() {
  const { user } = useAuth()
  const [proximosTurnos, setProximosTurnos] = useState([])
  const navigate = useNavigate()

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = user?.nombre?.split(' ')[0] || 'Socio'

  useEffect(() => {
    async function fetchProximosTurnos() {
      if (!user?.id) return

      // Inicio del día de hoy en ISO para capturar turnos de hoy aunque sean más tarde
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const desdehoy = hoy.toISOString()

      const { data, error } = await supabase
        .from('socio_turno')
        .select('id, estado, turnos(id, fecha_inicio, fecha_fin)')
        .eq('user_id', user.id)

      if (error) { console.error(error); return }
      if (!data) return

      const futuros = data
        .filter(t => t.turnos && t.turnos.fecha_inicio >= desdehoy)
        .sort((a, b) => new Date(a.turnos.fecha_inicio) - new Date(b.turnos.fecha_inicio))
        .slice(0, 2)

      setProximosTurnos(futuros)
    }
    fetchProximosTurnos()
  }, [user])

  const accesos = [
    { label: 'Mis turnos',  sub: 'Ver horario',     emoji: '📅', path: '/mis-turnos' },
    { label: 'Juego libre', sub: 'Anotarme',         emoji: '🏓', path: '/juego-libre' },
    { label: 'Clases',      sub: 'Con entrenador',   emoji: '👥', path: '/clases-particulares' },
    { label: 'Mi perfil',   sub: 'Cuenta y turnos',  emoji: '👤', path: '/perfil' },
  ]

  const novedades = [
    { titulo: 'Bienvenido al Club', sub: 'Tu cuenta fue creada correctamente' },
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
          <button className="btn-campana" aria-label="Notificaciones">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
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

      {/* NOVEDADES */}
      <section className="seccion">
        <p className="seccion-titulo">NOVEDADES</p>
        <div className="novedades-lista">
          {novedades.map((n, i) => (
            <div key={i} className="novedad-item">
              <p className="novedad-titulo">{n.titulo}</p>
              <p className="novedad-sub">{n.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
