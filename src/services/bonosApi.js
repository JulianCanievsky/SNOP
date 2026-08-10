import api from '../lib/apiClient.js'

export const getResumenBonos       = ()           => api.get('/bonos/resumen').then(r => r.data.data)
export const cancelarConCredito    = (socioTurnoId) => api.post(`/bonos/cancelar-con-credito/${socioTurnoId}`).then(r => r.data)
export const getTurnosParaReprog   = ()           => api.get('/bonos/turnos-disponibles').then(r => r.data.data)
export const reprogramarClase      = (body)       => api.post('/bonos/reprogramar', body).then(r => r.data)

// Admin
export const getAbonosAdmin   = ()     => api.get('/bonos/admin/abonos').then(r => r.data.data)
export const asignarAbono     = (body) => api.post('/bonos/admin/abonos', body).then(r => r.data)
export const desactivarAbono  = (id)   => api.delete(`/bonos/admin/abonos/${id}`).then(r => r.data)
