import axios from "axios";

const BASE_URL =
  "http://localhost:3001/api";

const SOCIO_ID = 1;

export async function getTurnos() {

  const response =
    await axios.get(
      `${BASE_URL}/turnos/${SOCIO_ID}`
    );

  return response.data.data;
}

export async function cancelarTurno(
  turnoId
) {

  const response =
    await axios.delete(
      `${BASE_URL}/turnos/${turnoId}/socio/${SOCIO_ID}`
    );

  return response.data;
}