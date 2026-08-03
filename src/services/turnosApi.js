import api from '../lib/apiClient.js'

// Agenda unificada: turnos fijos + clases particulares confirmadas + juegos libres
export async function getAgenda() {
  const response = await api.get('/agenda')
  return response.data.data
}

export async function getTurnos() {
  const response = await api.get('/turnos')
  return response.data.data
}

export async function cancelarTurno(turnoId) {
  const response = await api.delete(`/turnos/${turnoId}`)
  return response.data
}

export async function reconfirmarTurno(turnoId) {
  const response = await api.patch(`/turnos/${turnoId}/reconfirmar`, {})
  return response.data
}

export async function cancelarJuegoLibre(eventoId) {
  const response = await api.delete(`/juego-libre/${eventoId}/cancelar`)
  return response.data
}
