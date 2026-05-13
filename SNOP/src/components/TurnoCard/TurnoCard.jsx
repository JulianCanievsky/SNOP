import React from "react";
import "./TurnoCard.css";

// Mapeo de colores según el nivel
const coloresNivel = {
  Azul: "#2563eb",
  Rojo: "#dc2626",
  Intermedio: "#d97706",
  Avanzado: "#7c3aed",
  Principiante: "#16a34a",
};

// Mapeo de colores según el estado
const coloresEstado = {
  confirmado: { bg: "#dcfce7", texto: "#16a34a", etiqueta: "Confirmado" },
  pendiente:  { bg: "#fef9c3", texto: "#ca8a04", etiqueta: "Pendiente"  },
  cancelado:  { bg: "#fee2e2", texto: "#dc2626", etiqueta: "Cancelado"  },
  vacio:      { bg: "#fee2e2", texto: "#dc2626", etiqueta: "Vacío"      },
};

function TurnoCard({ turno, onCancelar }) {
  const estado = coloresEstado[turno.estado] || coloresEstado.pendiente;
  const colorNivel = coloresNivel[turno.nivel] || "#6b7280";
  const esFuturo = turno.estado === "confirmado" || turno.estado === "pendiente";
  const esVacio = turno.estado === "vacio";

  return (
    <div className="turno-card">
      {/* Header de la card: fecha y estado */}
      <div className="turno-card__header">
        <span className="turno-card__fecha">
          {turno.diaNombre} {formatearFecha(turno.fecha)}
        </span>
        <span
          className="turno-card__estado"
          style={{ backgroundColor: estado.bg, color: estado.texto }}
        >
          {estado.etiqueta}
        </span>
      </div>

      {/* Si el turno está vacío, solo mostrar mensaje */}
      {esVacio ? (
        <p className="turno-card__vacio-msg">
          Los turnos son fijos. Para cambiar de día hablá con tu entrenador.
        </p>
      ) : (
        <>
          {/* Horario y nivel */}
          <div className="turno-card__horario-row">
            <div className="turno-card__horario">
              <span className="turno-card__reloj">⏰</span>
              <span className="turno-card__horas">
                {turno.horaInicio} — {turno.horaFin} hs
              </span>
              <span className="turno-card__tipo">
                {turno.tipo} · {turno.duracion} min
              </span>
            </div>
            <span
              className="turno-card__nivel"
              style={{ backgroundColor: colorNivel }}
            >
              {turno.nivel}
            </span>
          </div>

          {/* Info del profesor */}
          <div className="turno-card__profesor">
            <span className="turno-card__profesor-icono">🎾</span>
            <span>
              {turno.profesor} · {turno.sede} · {turno.mesa}
            </span>
          </div>

          {/* Botón cancelar solo en turnos futuros */}
          {esFuturo && (
            <button
              className="turno-card__btn-cancelar"
              onClick={() => onCancelar(turno.id)}
            >
              Cancelar turno
            </button>
          )}

          {/* Mensaje informativo */}
          <p className="turno-card__info-msg">
            Los turnos son fijos. Para cambiar de día hablá con tu entrenador.
          </p>
        </>
      )}
    </div>
  );
}

// Formatea "2025-04-14" → "14 de abril"
function formatearFecha(fechaStr) {
  if (!fechaStr) return "";
  const meses = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","septiembre","octubre","noviembre","diciembre",
  ];
  const [, mes, dia] = fechaStr.split("-");
  return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]}`;
}

export default TurnoCard;