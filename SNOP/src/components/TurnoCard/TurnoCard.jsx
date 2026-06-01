import { useState } from "react";
import "./TurnoCard.css";
import { cancelarTurno, reconfirmarTurno } from "../../services/turnosApi";

function TurnoCard({ turno }) {
  const datosTurno = turno.turnos;
  const [estado, setEstado] = useState(turno.estado);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const fecha = new Date(datosTurno.fecha_inicio);
  const fechaTexto = fecha.toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const horaInicio = new Date(datosTurno.fecha_inicio).toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  const horaFin = new Date(datosTurno.fecha_fin).toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  async function confirmarCancelacion() {
    setCancelando(true);
    try {
      await cancelarTurno(datosTurno.id);
      setEstado(false);
      setMostrarModal(false);
    } catch (error) {
      console.error(error);
      alert("No se pudo cancelar el turno");
    } finally {
      setCancelando(false);
    }
  }

  async function handleReconfirmar() {
    try {
      await reconfirmarTurno(datosTurno.id);
      setEstado(true);
    } catch (error) {
      console.error(error);
      alert("No se pudo reconfirmar el turno");
    }
  }

  return (
    <>
      <div className="turno-card">
        <div className="turno-header">
          <h3>{fechaTexto}</h3>
          <span className={estado ? "estado confirmado" : "estado cancelado"}>
            {estado ? "Confirmado" : "Cancelado"}
          </span>
        </div>

        <div className="horario">
          <div className="icono">⏰</div>
          <div className="horario-texto">
            <strong>{horaInicio} — {horaFin} hs</strong>
            <p>Entrenamiento · {datosTurno.duracion_min} min</p>
          </div>
          <span className="badge-color">Azul</span>
        </div>

        <div className="info">
          👨‍🏫 {datosTurno.users?.nombre}{" · "}
          {datosTurno.sedes?.nombre}{" · "}
          Mesa {datosTurno.mesas?.numero}
        </div>

        {estado ? (
          <button className="cancelar-btn" onClick={() => setMostrarModal(true)}>
            Cancelar turno
          </button>
        ) : (
          <button className="reconfirmar-btn" onClick={handleReconfirmar}>
            Reconfirmar turno
          </button>
        )}
      </div>

      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>¿Cancelar turno?</h3>
            <p>
              Estás por cancelar el turno del <strong>{fechaTexto}</strong> a las{" "}
              <strong>{horaInicio} hs</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="modal-acciones">
              <button
                className="modal-btn-secundario"
                onClick={() => setMostrarModal(false)}
                disabled={cancelando}
              >
                Volver
              </button>
              <button
                className="modal-btn-peligro"
                onClick={confirmarCancelacion}
                disabled={cancelando}
              >
                {cancelando ? "Cancelando..." : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TurnoCard;