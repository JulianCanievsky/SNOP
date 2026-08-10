import api from '../lib/apiClient.js'

export const getNotificaciones  = ()    => api.get('/notificaciones').then(r => r.data)
export const getNoLeidas        = ()    => api.get('/notificaciones/no-leidas').then(r => r.data.count ?? 0)
export const leerTodas          = ()    => api.patch('/notificaciones/leer-todas').then(r => r.data)
export const leerUna            = (id)  => api.patch(`/notificaciones/${id}/leer`).then(r => r.data)
