import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Inicio.css'

export default function Inicio() {
  const { user, logout } = useAuth()
  const [proximoTurno, setProximoTurno] = useState(null)
  const navigate = useNavigate()

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = user?.nombre?.split(' ')[0] || 'Socio'

  useEffect(() => {
    async function fetchProximoTurno() {
      if (!user?.id) return
      const hoy = new Date().toISOString()
      const { data } = await supabase
        .from('socio_turno')
        .select('id, estado, turnos(id, fecha_inicio, fecha_fin)')
        .eq('user_id', user.id)
        .eq('estado', true)
        .gte('turnos.fecha_inicio', hoy)
        .order('turnos(fecha_inicio)', { ascending: true })
        .limit(1)
      if (data?.length) setProximoTurno(data[0])
    }
    fetchProximoTurno()
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

  function formatTurno(turno) {
    if (!turno?.turnos) return null
    const inicio = new Date(turno.turnos.fecha_inicio)
    const fin = new Date(turno.turnos.fecha_fin)
    const fecha = inicio.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    const hi = inicio.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
    const hf = fin.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${fecha.charAt(0).toUpperCase() + fecha.slice(1)}, ${hi} — ${hf}`
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn-campana" aria-label="Notificaciones">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </div>

        {proximoTurno ? (
          <div className="proximo-turno" onClick={() => navigate('/mis-turnos')}>
            <span className="proximo-turno-texto">{formatTurno(proximoTurno)}</span>
            <span className="badge-confirmado">Confirmado</span>
          </div>
        ) : (
          <div className="proximo-turno sin-turno">
            <span className="proximo-turno-texto">Sin próximos turnos</span>
          </div>
        )}
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
