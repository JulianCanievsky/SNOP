import axios from "axios";

const API_URL = "http://localhost:3001/api/turnos";

const SOCIO_ID = 999;

export async function getTurnos() {

  const response = await axios.get(
    `${API_URL}/${SOCIO_ID}`
  );

  return response.data;
}