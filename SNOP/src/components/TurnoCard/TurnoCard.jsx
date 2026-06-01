import { useState } from "react";

import "./TurnoCard.css";

import {
  cancelarTurno
} from "../../services/turnosApi";

function TurnoCard({ turno }) {

  const datosTurno =
    turno.turnos;

  const [estado, setEstado] =
    useState(turno.estado);

  const fecha =
    new Date(
      datosTurno.fecha_inicio
    );

  const fechaTexto =
    fecha.toLocaleDateString(
      "es-AR",
      {
        weekday: "long",
        day: "numeric",
        month: "long"
      }
    );

  const horaInicio =
    new Date(
      datosTurno.fecha_inicio
    ).toLocaleTimeString(
      "es-AR",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  const horaFin =
    new Date(
      datosTurno.fecha_fin
    ).toLocaleTimeString(
      "es-AR",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  async function handleCancelar() {

    try {

      await cancelarTurno(
        datosTurno.id
      );

      setEstado(false);

    } catch (error) {

      console.error(error);

      alert(
        "No se pudo cancelar el turno"
      );
    }
  }

  return (

    <div className="turno-card">

      <div className="turno-header">

        <h3>
          {fechaTexto}
        </h3>

        <span
          className={
            estado
              ? "estado confirmado"
              : "estado cancelado"
          }
        >
          {estado
            ? "Confirmado"
            : "Cancelado"}
        </span>

      </div>

      <div className="horario">

        <div className="icono">
          ⏰
        </div>

        <div>

          <strong>
            {horaInicio} — {horaFin} hs
          </strong>

          <p>
            Entrenamiento · {datosTurno.duracion_min} min
          </p>

        </div>

      </div>

      <div className="info">

        👨‍🏫 {datosTurno.users?.nombre}
        {" · "}
        {datosTurno.sedes?.nombre}
        {" · "}
        Mesa {datosTurno.mesas?.numero}

      </div>

      {estado && (

        <button
          className="cancelar-btn"
          onClick={handleCancelar}
        >
          Cancelar turno
        </button>

      )}

    </div>
  );
}

export default TurnoCard;