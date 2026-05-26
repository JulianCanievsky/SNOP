import "./TurnoCard.css";

function TurnoCard({ turno }) {

  function formatFecha(fechaStr) {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function formatHora(fechaStr) {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const t = turno?.turnos; // minúsculas = como devuelve Supabase

  return (
    <div className="turno-card">
      <div className="turno-card__top">
        <h3>{formatFecha(t?.fecha_inicio)}</h3>
        <span className={turno.estado ? "estado activo" : "estado cancelado"}>
          {turno.estado ? "Confirmado" : "Cancelado"}
        </span>
      </div>
      <div className="turno-card__body">
        <p>🕐 {formatHora(t?.fecha_inicio)} - {formatHora(t?.fecha_fin)}</p>
        <p>👤 {t?.users?.nombre}</p>
        <p>📍 {t?.sedes?.nombre}</p>
        <p>🏓 Mesa {t?.mesas?.numero}</p>
      </div>
    </div>
  );
}

export default TurnoCard;