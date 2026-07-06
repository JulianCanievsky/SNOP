import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('snop_token')}` },
})

// Agenda unificada: turnos fijos + clases particulares confirmadas + juegos libres
export async function getAgenda() {
  const response = await axios.get(`${API_BASE}/agenda`, authHeaders())
  return response.data.data
}

export async function getTurnos() {
  const response = await axios.get(`${API_BASE}/turnos`, authHeaders())
  return response.data.data
}

export async function cancelarTurno(turnoId) {
  const response = await axios.delete(`${API_BASE}/turnos/${turnoId}`, authHeaders())
  return response.data
}

export async function reconfirmarTurno(turnoId) {
  const response = await axios.patch(`${API_BASE}/turnos/${turnoId}/reconfirmar`, {}, authHeaders())
  return response.data
}

export async function cancelarJuegoLibre(eventoId) {
  const response = await axios.delete(`${API_BASE}/juego-libre/${eventoId}/cancelar`, authHeaders())
  return response.data
}
