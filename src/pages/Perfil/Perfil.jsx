import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePerfil } from '../../hooks/usePerfil'
import { getMiBono } from '../../services/bonosApi'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Perfil.css'

const TZ = 'America/Argentina/Buenos_Aires'

const formatHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })

const formatFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })

// Mapeo nombre de nivel → clase CSS del Admin (reutilizadas)
function nivelClase(nombre) {
  if (!nombre) return 'sin-nivel'
  const n = nombre.toLowerCase()
  if (n === 'rojo')       return 'rojo'
  if (n === 'intermedio') return 'intermedio'
  if (n === 'azul')       return 'azul'
  return 'sin-nivel'
}

function NivelBadge({ nombre }) {
  const cls = nivelClase(nombre)
  return (
    <span className={`badge-nivel ${cls}`} style={{ fontSize: 12 }}>
      {nombre ?? 'Sin nivel asignado todavía'}
    </span>
  )
}

function TurnoCardPerfil({ inscripcion, pasado }) {
  const turno = inscripcion.turnos
  if (!turno) return null

  const horaInicio = formatHora(turno.fecha_inicio)
  const horaFin    = turno.fecha_fin ? formatHora(turno.fecha_fin) : null
  const fechaTexto = formatFecha(turno.fecha_inicio)

  return (
    <div className={`turno-card-perfil${pasado ? ' turno-card-perfil-pasado' : ''}`}>
      <div className="turno-card-perfil-header">
        <h3 className="turno-card-perfil-fecha">{fechaTexto}</h3>
        <span className={pasado ? 'deuda' : 'estado-activo'}>
          {pasado ? 'Finalizado' : 'Próximo'}
        </span>
      </div>
      <div className="turno-card-perfil-horario">
        <span className="turno-card-perfil-icono">⏰</span>
        <div>
          <strong>{horaInicio}{horaFin ? ` — ${horaFin} hs` : ' hs'}</strong>
          {turno.duracion_min && <p>{turno.duracion_min} min</p>}
        </div>
      </div>
      {(turno.sedes?.nombre || turno.mesas?.numero || turno.users?.nombre) && (
        <div className="turno-card-perfil-info">
          {turno.users?.nombre && <span>👨‍🏫 {turno.users.nombre}</span>}
          {turno.sedes?.nombre && <span>📍 {turno.sedes.nombre}</span>}
          {turno.mesas?.numero && <span>🏓 Mesa {turno.mesas.numero}</span>}
        </div>
      )}
    </div>
  )
}

const Perfil = () => {
  const { user, logout } = useAuth()
  const { perfil, cargando, cargarPerfil } = usePerfil()
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [bono, setBono] = useState(undefined) // undefined = cargando, null = sin bono

  useEffect(() => {
    getMiBono()
      .then(data => setBono(data ?? null))
      .catch(() => setBono(null))
  }, [])

  if (cargando) {
    return (
      <div className="perfil-container">
        <div className="perfil-header"><h2>Mi perfil</h2></div>
        {user && (
          <div className="perfil-card">
            <div className="perfil-avatar">
              {user.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </div>
            <h3>{user.nombre}</h3>
            <p>{user.email}</p>
          </div>
        )}
        <div className="estado-carga">Cargando información...</div>
        <BottomNav />
      </div>
    )
  }

  const usuario = perfil?.usuario ?? user
  const turnos  = perfil?.turnos  ?? []

  if (!usuario) {
    return (
      <div className="perfil-container">
        <div className="perfil-header"><h2>Mi perfil</h2></div>
        <div className="estado-error">
          No se pudo cargar el perfil.
          <button className="btn-reintentar" onClick={cargarPerfil}>Reintentar</button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const iniciales = usuario.nombre
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  const nivelNombre = usuario.nivel_nombre ?? usuario.niveles?.nombre ?? null

  const ahora        = new Date()
  const turnosActivos = turnos.filter(i => i.turnos && new Date(i.turnos.fecha_inicio) >= ahora)
  const turnosPasados = turnos.filter(i => i.turnos && new Date(i.turnos.fecha_inicio) <  ahora)

  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <h2>Mi perfil</h2>
      </div>

      {/* Tarjeta principal */}
      <div className="perfil-card">
        <div className="perfil-avatar">{iniciales}</div>
        <h3>{usuario.nombre}</h3>
        <p>{usuario.email}</p>
        {/* Badge de nivel */}
        <div style={{ marginTop: 10 }}>
          <NivelBadge nombre={nivelNombre} />
        </div>
      </div>

      <div className="perfil-seccion-header">
        <h4 className="perfil-seccion">Próximos turnos</h4>
        {turnosPasados.length > 0 && (
          <button
            className="btn-historial"
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
          >
            {mostrarHistorial ? 'Ocultar historial' : 'Ver historial'}
          </button>
        )}
      </div>

      {turnosActivos.length === 0 ? (
        <div className="turno-card sin-turnos-perfil">No tenés turnos activos.</div>
      ) : (
        turnosActivos.map(inscripcion => (
          <TurnoCardPerfil
            key={inscripcion.turno_id ?? inscripcion.turnos?.id}
            inscripcion={inscripcion}
            pasado={false}
          />
        ))
      )}

      {mostrarHistorial && (
        <>
          <h4 className="perfil-seccion" style={{ marginTop: '20px' }}>Historial</h4>
          {turnosPasados.map(inscripcion => (
            <TurnoCardPerfil
              key={`h-${inscripcion.turno_id ?? inscripcion.turnos?.id}`}
              inscripcion={inscripcion}
              pasado
            />
          ))}
        </>
      )}

      {/* Estado de cuenta */}
      <h4 className="perfil-seccion" style={{ marginTop: '20px' }}>Estado de cuenta</h4>
      <div className="cuota-card">
        <span>Cuota social</span>
        <span className={usuario.cuota_al_dia ? 'pagado' : 'deuda'}>
          {usuario.cuota_al_dia ? 'Pagado' : 'Pendiente'}
        </span>
      </div>

      {/* Bono activo */}
      {bono !== undefined && (
        <>
          <h4 className="perfil-seccion" style={{ marginTop: '20px' }}>Bono de créditos</h4>
          {bono === null ? (
            <div className="cuota-card" style={{ color: '#9ca3af', fontSize: 14 }}>
              Sin bono activo
            </div>
          ) : (
            <div className="bono-card">
              {/* Tipo + vencimiento */}
              <div className="bono-card-header">
                <span className={`bono-tipo-badge bono-tipo-${bono.tipo}`}>
                  {{ mensual: 'Mensual', trimestral: 'Trimestral', personalizado: 'Personalizado' }[bono.tipo] ?? bono.tipo}
                </span>
                <span className="bono-vencimiento">
                  Vence {new Date(`${bono.fecha_vencimiento}T12:00:00`).toLocaleDateString('es-AR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    timeZone: 'America/Argentina/Buenos_Aires',
                  })}
                </span>
              </div>

              {/* Créditos grandes */}
              <div className="bono-creditos-bloque">
                <span className="bono-creditos-num">{bono.creditos_disponibles}</span>
                <span className="bono-creditos-label">
                  de {bono.creditos_total} crédito{bono.creditos_total !== 1 ? 's' : ''} disponibles
                </span>
              </div>

              {/* Barra de progreso */}
              <div className="bono-barra-fondo">
                <div
                  className="bono-barra-fill"
                  style={{
                    width: `${Math.min((bono.creditos_usados / bono.creditos_total) * 100, 100)}%`,
                    background: bono.creditos_disponibles === 0
                      ? '#ef4444'
                      : bono.creditos_disponibles <= 2
                        ? '#f59e0b'
                        : '#2563eb',
                  }}
                />
              </div>

              {bono.notas && (
                <p className="bono-notas">{bono.notas}</p>
              )}
            </div>
          )}
        </>
      )}

      <button className="btn-logout" onClick={logout}>
        Cerrar sesión
      </button>

      <BottomNav />
    </div>
  )
}

export default Perfil
