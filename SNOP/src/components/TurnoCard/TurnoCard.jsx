import "./TurnoCard.css";

function TurnoCard({ turno }) {

  function formatFecha(fechaStr) {

    const fecha =
      new Date(fechaStr);

    return fecha.toLocaleDateString(
      "es-AR",
      {
        weekday: "long",
        day: "numeric",
        month: "long"
      }
    );
  }

  function formatHora(fechaStr) {

    const fecha =
      new Date(fechaStr);

    return fecha.toLocaleTimeString(
      "es-AR",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }

  return (

    <div className="turno-card">

      <div className="turno-card__top">

        <h3>
          {formatFecha(
            turno?.TURNOS?.fecha_inicio
          )}
        </h3>

        <span
          className={
            turno.estado
              ? "estado activo"
              : "estado cancelado"
          }
        >
          {turno.estado
            ? "Confirmado"
            : "Cancelado"}
        </span>

      </div>

      <div className="turno-card__body">

        <p>
          ⏰
          {" "}
          {formatHora(
            turno?.TURNOS?.fecha_inicio
          )}

          {" - "}

          {formatHora(
            turno?.TURNOS?.fecha_fin
          )}
        </p>

        <p>
          🎾
          {" "}
          {turno?.TURNOS?.USERS?.nombre}
        </p>

        <p>
          📍
          {" "}
          {turno?.TURNOS?.SEDES?.nombre}
        </p>

        <p>
          🏓 Mesa
          {" "}
          {turno?.TURNOS?.MESAS?.numero}
        </p>

      </div>

    </div>
  );
}

export default TurnoCard;