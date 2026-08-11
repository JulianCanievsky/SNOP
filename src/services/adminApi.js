import api from '../lib/apiClient.js'

// Stats
export const getStats         = ()       => api.get('/admin/stats').then(r => r.data.data)

// Socios
export const getSocios        = (params) => api.get('/admin/socios', { params }).then(r => r.data.data)
export const getSocio         = (id)     => api.get(`/admin/socios/${id}`).then(r => r.data.data)
export const crearSocio       = (body)   => api.post('/admin/socios', body).then(r => r.data)
export const editarSocio      = (id, b)  => api.patch(`/admin/socios/${id}`, b).then(r => r.data)

// Entrenadores
export const getEntrenadores  = ()       => api.get('/admin/entrenadores').then(r => r.data.data)

// Sedes
export const getSedes         = ()       => api.get('/admin/sedes').then(r => r.data.data)
export const getSedesPublicas = ()       => api.get('/sedes').then(r => r.data.data)

// Niveles
export const getNiveles       = ()       => api.get('/admin/niveles').then(r => r.data.data)
export const getNivelesStats  = ()       => api.get('/admin/niveles/stats').then(r => r.data.data)

// Comunicados
export const getComunicados   = ()       => api.get('/admin/comunicados').then(r => r.data.data)
export const enviarComunicado = (body)   => api.post('/admin/comunicados', body).then(r => r.data)

// Config
export const getConfig        = ()       => api.get('/admin/config').then(r => r.data.data)

// Turnos (asignación admin)
export const getTurnosDisponibles    = ()                       => api.get('/admin/turnos').then(r => r.data.data)
export const asignarTurnoSocio       = (socioId, body)          => api.post(`/admin/socios/${socioId}/turnos`, body).then(r => r.data)
export const quitarTurnoSocio        = (socioId, socioTurnoId)  => api.delete(`/admin/socios/${socioId}/turnos/${socioTurnoId}`).then(r => r.data)

// Solicitudes de ingreso
export const getSolicitudes          = ()    => api.get('/admin/solicitudes').then(r => r.data.data)
export const aceptarSolicitud        = (id)  => api.patch(`/admin/solicitudes/${id}/aceptar`).then(r => r.data)
export const rechazarSolicitud       = (id)  => api.patch(`/admin/solicitudes/${id}/rechazar`).then(r => r.data)

// Juego libre
export const getJuegosLibres         = ()       => api.get('/admin/juego-libre').then(r => r.data.data)
export const crearJuegoLibre         = (body)   => api.post('/admin/juego-libre', body).then(r => r.data)
export const borrarJuegoLibre        = (id)     => api.delete(`/admin/juego-libre/${id}`).then(r => r.data)
export const getInscriptosJuegoLibre = (id)     => api.get(`/admin/juego-libre/${id}/inscriptos`).then(r => r.data)

// Exportación Excel — devuelve un Blob para descarga directa
export async function exportarExcel(tipo, params = {}) {
  const query = new URLSearchParams()
  if (params.desde)   query.set('desde',   params.desde)
  if (params.hasta)   query.set('hasta',   params.hasta)
  if (params.sede_id) query.set('sede_id', params.sede_id)

  const response = await api.get(`/admin/exportar/${tipo}?${query}`, {
    responseType: 'blob',
  })
  return response.data // Blob
}

// ── Gestión de turnos de entrenamiento (plantillas recurrentes) ───────────────
export const getMesas               = ()         => api.get('/admin/turnos/mesas').then(r => r.data.data)
export const getPlantillasTurnos    = ()         => api.get('/admin/turnos/plantillas').then(r => r.data.data)
export const getDetalleTurnoAdmin   = (id)       => api.get(`/admin/turnos/${id}`).then(r => r.data.data)
export const crearTurnoAdmin        = (body)     => api.post('/admin/turnos', body).then(r => r.data)
export const editarTurnoAdmin       = (id, body) => api.put(`/admin/turnos/${id}`, body).then(r => r.data)
export const bajaTurnoDefinitiva    = (id)       => api.delete(`/admin/turnos/${id}`).then(r => r.data)
export const cancelarSemana         = (id, body) => api.post(`/admin/turnos/${id}/cancelar-semana`, body).then(r => r.data)
export const asignarSocioTurno      = (id, body) => api.post(`/admin/turnos/${id}/socios`, body).then(r => r.data)
export const quitarSocioTurno       = (id, socioId) => api.delete(`/admin/turnos/${id}/socios/${socioId}`).then(r => r.data)
export const reasignarEntrenador    = (id, body) => api.patch(`/admin/turnos/${id}/entrenador`, body).then(r => r.data)
export const getListaEsperaAdmin    = (id)       => api.get(`/admin/turnos/${id}/lista-espera`).then(r => r.data)
