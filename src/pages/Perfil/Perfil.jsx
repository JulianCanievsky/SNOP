import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { usePerfil } from '../../hooks/usePerfil'
import { useHistorialPerfil } from '../../hooks/useHistorialPerfil'
import { getMiBono } from '../../services/bonosApi'
import AppNav from '../../components/AppNav/AppNav'
import CategoriaBadge from '../../components/ui/CategoriaBadge/CategoriaBadge'
import { Clock, MapPin, User, Sun, Moon, RefreshCw } from 'lucide-react'
import './Perfil.css'
import ErrorState from '../../components/ui/ErrorState/ErrorState'
import Spinner from '../../components/ui/Spinner/Spinner'

const TZ = 'America/Argentina/Buenos_Aires'

const formatHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ })

const formatFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })

// Etiquetas legibles para estado_texto
const LABEL_ESTADO = {
  activo:             { texto: 'Asistió',          clase: 'estado-activo'    },
  cancelado_a_tiempo: { texto: 'Canceló a tiempo', clase: 'estado-cancelado' },
  cancelado_tarde:    { texto: 'Canceló tarde',    clase: 'deuda'            },
  baja_entrenador:    { texto: 'Baja',             clase: 'deuda'            },
  pendiente:          { texto: 'Pendiente',         clase: 'estado-pendiente' },
}

const LABEL_TIPO = {
  turno:       'Entrenamiento',
  particular:  'Clase particular',
  juego_libre: 'Juego libre',
  torneo:      'Torneo',
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
        <Clock size={15} strokeWidth={1.8} className="turno-card-perfil-icono" />
        <div>
          <strong>{horaInicio}{horaFin ? ` — ${horaFin} hs` : ' hs'}</strong>
          {turno.duracion_min && <p>{turno.duracion_min} min</p>}
        </div>
      </div>
      {(turno.sedes?.nombre || turno.mesas?.numero || turno.users?.nombre) && (
        <div className="turno-card-perfil-info">
          {turno.users?.nombre && (
            <span><User size={12} strokeWidth={1.8} /> {turno.users.nombre}</span>
          )}
          {turno.sedes?.nombre && (
            <span><MapPin size={12} strokeWidth={1.8} /> {turno.sedes.nombre}</span>
          )}
          {turno.mesas?.numero && (
            <span>Mesa {turno.mesas.numero}</span>
          )}
        </div>
      )}
    </div>
  )
}

// Card para items del historial paginado (formato plano del endpoint)
function HistorialItemCard({ item }) {
  const fecha    = item.fecha ? formatFecha(item.fecha) : '—'
  const hora     = item.fecha ? formatHora(item.fecha)  : ''
  const estado   = LABEL_ESTADO[item.estado_texto] ?? { texto: item.estado_texto, clase: '' }
  const tipoText = LABEL_TIPO[item.tipo] ?? item.tipo

  return (
    <div className="turno-card-perfil turno-card-perfil-pasado">
      <div className="turno-card-perfil-header">
        <h3 className="turno-card-perfil-fecha">{fecha}</h3>
        <span className={estado.clase}>{estado.texto}</span>
      </div>
      <div className="turno-card-perfil-horario">
        <Clock size={15} strokeWidth={1.8} className="turno-card-perfil-icono" />
        <div>
          <strong>{hora} hs</strong>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{tipoText}</p>
        </div>
      </div>
      {(item.sede || item.contraparte || item.nombre) && (
        <div className="turno-card-perfil-info">
          {item.contraparte && <span><User size={12} strokeWidth={1.8} /> {item.contraparte}</span>}
          {item.sede        && <span><MapPin size={12} strokeWidth={1.8} /> {item.sede}</span>}
          {item.nombre      && <span>{item.nombre}</span>}
        </div>
      )}
    </div>
  )
}

// Genera opciones de mes: últimos 6 meses
function generarMeses() {
  const opts = []
  const hoy  = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    opts.push({ valor, label })
  }
  return opts
}

const MESES = generarMeses()

const Perfil = () => {
  const { user, logout } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const { perfil, cargando, cargarPerfil } = usePerfil()
  const historial = useHistorialPerfil()
  const [tab, setTab] = useState('resumen')
  const [bono, setBono] = useState(undefined)

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
        <Spinner center label="Cargando perfil" />
        <AppNav />
      </div>
    )
  }

  const usuario     = perfil?.usuario ?? user
  const turnosActivos = perfil?.turnos ?? []

  if (!usuario) {
    return (
      <div className="perfil-container">
        <div className="perfil-header"><h2>Mi perfil</h2></div>
        <ErrorState message="No se pudo cargar el perfil." onRetry={cargarPerfil} />
        <AppNav />
      </div>
    )
  }

  const iniciales = usuario.nombre
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

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
        <div style={{ marginTop: 10 }}>
          <CategoriaBadge nivelId={usuario.nivel_id ?? null} />
        </div>
      </div>

      {/* Tabs */}
      <div className="perfil-tabs">
        <button
          className={`perfil-tab${tab === 'resumen' ? ' perfil-tab--activo' : ''}`}
          onClick={() => setTab('resumen')}
        >Resumen</button>
        <button
          className={`perfil-tab${tab === 'historial' ? ' perfil-tab--activo' : ''}`}
          onClick={() => setTab('historial')}
        >Historial</button>
      </div>

      {/* ── TAB RESUMEN ── */}
      {tab === 'resumen' && (
        <>
          <div className="perfil-seccion-header">
            <h4 className="perfil-seccion">Próximos turnos</h4>
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

          <h4 className="perfil-seccion" style={{ marginTop: '20px' }}>Estado de cuenta</h4>
          <div className="cuota-card">
            <span>Cuota social</span>
            <span className={usuario.cuota_al_dia ? 'pagado' : 'deuda'}>
              {usuario.cuota_al_dia ? 'Pagado' : 'Pendiente'}
            </span>
          </div>

          {bono !== undefined && (
            <>
              <h4 className="perfil-seccion" style={{ marginTop: '20px' }}>Bono de créditos</h4>
              {bono === null ? (
                <div className="cuota-card" style={{ color: 'var(--color-text-subtle)', fontSize: 14 }}>Sin bono activo</div>
              ) : (
                <div className="bono-card">
                  <div className="bono-card-header">
                    <span className={`bono-tipo-badge bono-tipo-${bono.tipo}`}>
                      {{ mensual: 'Mensual', trimestral: 'Trimestral', personalizado: 'Personalizado' }[bono.tipo] ?? bono.tipo}
                    </span>
                    <span className="bono-vencimiento">
                      Vence {new Date(`${bono.fecha_vencimiento}T12:00:00`).toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ,
                      })}
                    </span>
                  </div>
                  <div className="bono-creditos-bloque">
                    <span className="bono-creditos-num">{bono.creditos_disponibles}</span>
                    <span className="bono-creditos-label">
                      de {bono.creditos_total} crédito{bono.creditos_total !== 1 ? 's' : ''} disponibles
                    </span>
                  </div>
                  <div className="bono-barra-fondo">
                    <div
                      className="bono-barra-fill"
                      style={{
                        width: `${Math.min((bono.creditos_usados / bono.creditos_total) * 100, 100)}%`,
                        background: bono.creditos_disponibles === 0
                          ? 'var(--color-danger)'
                          : bono.creditos_disponibles <= 2 ? 'var(--color-warning)' : 'var(--color-primary)',
                      }}
                    />
                  </div>
                  {bono.notas && <p className="bono-notas">{bono.notas}</p>}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── TAB HISTORIAL ── */}
      {tab === 'historial' && (
        <div className="perfil-historial">
          {/* Filtros */}
          <div className="historial-filtros">
            <select
              className="historial-select"
              value={historial.filtros.mes}
              onChange={e => historial.cambiarFiltro('mes', e.target.value)}
              aria-label="Filtrar por mes"
            >
              <option value="">Todos los meses</option>
              {MESES.map(m => (
                <option key={m.valor} value={m.valor}>{m.label}</option>
              ))}
            </select>

            <select
              className="historial-select"
              value={historial.filtros.tipo}
              onChange={e => historial.cambiarFiltro('tipo', e.target.value)}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos los tipos</option>
              <option value="turno">Entrenamiento</option>
              <option value="particular">Clase particular</option>
              <option value="juego_libre">Juego libre</option>
              <option value="torneo">Torneo</option>
            </select>

            <button
              className="btn-secundario-chico"
              onClick={historial.recargar}
              aria-label="Actualizar historial"
              disabled={historial.cargando}
            >
              <RefreshCw size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Contenido */}
          {historial.cargando ? (
            <Spinner center label="Cargando historial" />
          ) : historial.error ? (
            <ErrorState message={historial.error} onRetry={historial.recargar} />
          ) : historial.items.length === 0 ? (
            <div className="turno-card sin-turnos-perfil">
              No hay actividad en el período seleccionado.
            </div>
          ) : (
            <>
              {historial.items.map(item => (
                <HistorialItemCard key={item.id} item={item} />
              ))}

              {/* Paginación */}
              {historial.meta.paginas > 1 && (
                <div className="historial-paginacion">
                  <button
                    className="btn-pag"
                    disabled={historial.filtros.page <= 1}
                    onClick={() => historial.cambiarFiltro('page', historial.filtros.page - 1)}
                  >‹ Anterior</button>
                  <span className="historial-pag-info">
                    {historial.filtros.page} / {historial.meta.paginas}
                  </span>
                  <button
                    className="btn-pag"
                    disabled={historial.filtros.page >= historial.meta.paginas}
                    onClick={() => historial.cambiarFiltro('page', historial.filtros.page + 1)}
                  >Siguiente ›</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button
        className="btn-tema"
        onClick={toggleTheme}
        aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {dark
          ? <><Sun size={16} strokeWidth={1.8} style={{ verticalAlign: 'middle', marginRight: 6 }} />Modo claro</>
          : <><Moon size={16} strokeWidth={1.8} style={{ verticalAlign: 'middle', marginRight: 6 }} />Modo oscuro</>
        }
      </button>

      <button className="btn-logout" onClick={logout}>
        Cerrar sesión
      </button>

      <AppNav />
    </div>
  )
}

export default Perfil
