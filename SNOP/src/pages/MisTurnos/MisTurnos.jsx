import React, { useState } from "react";
import TurnoCard from "../../components/TurnoCard/TurnoCard.jsx";
import turnosMock from "../../mocks/turnosMock.js";
import "./MisTurnos.css";
// Días de la semana para el selector superior
const diasSemana = [
  { letra: "L", num: 14 },
  { letra: "M", num: 15 },
  { letra: "M", num: 16 },
  { letra: "J", num: 17 },
  { letra: "V", num: 18 },
  { letra: "S", num: 19 },
  { letra: "D", num: 20 },
];

function MisTurnos() {
  // Estado: día seleccionado (número del día)
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // Estado: lista de turnos (permite cancelar localmente)
  const [turnos, setTurnos] = useState(turnosMock);

  // Filtrar turnos según el día seleccionado
  // Si no hay día seleccionado, muestra todos
  const turnosFiltrados =
    diaSeleccionado === null
      ? turnos
      : turnos.filter((t) => {
          const dia = parseInt(t.fecha.split("-")[2]);
          return dia === diaSeleccionado;
        });

  // Cancelar un turno localmente (sin backend)
  function handleCancelar(turnoId) {
    const confirmar = window.confirm("¿Querés cancelar este turno?");
    if (!confirmar) return;

    setTurnos((prev) =>
      prev.map((t) =>
        t.id === turnoId ? { ...t, estado: "cancelado" } : t
      )
    );
  }

  return (
    <div className="mis-turnos">
      {/* Header azul */}
      <div className="mis-turnos__header">
        <h1 className="mis-turnos__titulo">Mis turnos</h1>
        <p className="mis-turnos__subtitulo">Horario fijo semanal</p>

        {/* Selector de días */}
        <div className="mis-turnos__dias">
          {diasSemana.map((dia) => (
            <button
              key={dia.num}
              className={`mis-turnos__dia-btn ${
                diaSeleccionado === dia.num ? "mis-turnos__dia-btn--activo" : ""
              }`}
              onClick={() =>
                setDiaSeleccionado(
                  diaSeleccionado === dia.num ? null : dia.num
                )
              }
            >
              <span className="mis-turnos__dia-letra">{dia.letra}</span>
              <span className="mis-turnos__dia-num">{dia.num}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de turnos */}
      <div className="mis-turnos__lista">
        {turnosFiltrados.length === 0 ? (
          <div className="mis-turnos__vacio">
            <p>No tenés turnos para este día.</p>
          </div>
        ) : (
          turnosFiltrados.map((turno) => (
            <TurnoCard
              key={turno.id}
              turno={turno}
              onCancelar={handleCancelar}
            />
          ))
        )}
      </div>

      {/* Barra de navegación inferior */}
      <nav className="mis-turnos__navbar">
        <button className="navbar__item">🏠<span>Inicio</span></button>
        <button className="navbar__item navbar__item--activo">📅<span>Turnos</span></button>
        <button className="navbar__item">🔍<span>Juego libre</span></button>
        <button className="navbar__item">👤<span>Perfil</span></button>
      </nav>
    </div>
  );
}

export default MisTurnos;