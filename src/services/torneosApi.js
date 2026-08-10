import api from '../lib/apiClient.js'

// Socio
export const getTorneos          = ()    => api.get('/torneos').then(r => r.data)
export const inscribirTorneo     = (id)  => api.post(`/torneos/${id}/inscribir`, {}).then(r => r.data)
export const cancelarTorneo      = (id)  => api.delete(`/torneos/${id}/cancelar`).then(r => r.data)

// Admin
export const getTorneosAdmin     = ()     => api.get('/admin/torneos').then(r => r.data.data)
export const crearTorneo         = (body) => api.post('/admin/torneos', body).then(r => r.data)
export const borrarTorneo        = (id)   => api.delete(`/admin/torneos/${id}`).then(r => r.data)
export const getInscriptosTorneo = (id)   => api.get(`/admin/torneos/${id}/inscriptos`).then(r => r.data)
