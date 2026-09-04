import api from '../lib/apiClient.js'

// Admin
export const crearBono          = (body)    => api.post('/bonos', body).then(r => r.data)
export const getBonosSocio      = (socioId) => api.get(`/bonos/socio/${socioId}`).then(r => r.data.data)
export const desactivarBono     = (id)      => api.delete(`/bonos/${id}`).then(r => r.data)

// Socio
export const getMiBono          = ()        => api.get('/bonos/mio').then(r => r.data.data)
