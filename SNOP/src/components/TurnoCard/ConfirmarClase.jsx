import './ClasesParticulares.css';

const formatearFechaCompleta = (fechaISO) => {
  const fecha = new Date(fechaISO);
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${dias[fecha.getDay()]} ${fecha.getDate()} · ${hora} hs`;
};

const formatearDiaHora = (fechaISO) => {
  const fecha = new Date(fechaISO);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${dias[fecha.getDay()]} ${fecha.getDate()} - ${hora} hs`;
};

const ConfirmarClase = ({ entrenador, turno, onVolver, onConfirmar, enviando }) => {
  const iniciales = entrenador.nombre
    ? entrenador.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="confirmar-container">
      <div className="confirmar-header">
        <button className="btn-volver-confirmar" onClick={onVolver}>
          ← Entrenadores
        </button>
        <h1 className="confirmar-nombre">{entrenador.nombre}</h1>
        <p className="confirmar-subtitulo">Clase particular</p>
      </div>

      <div className="confirmar-body">
        <div className="confirmar-perfil-card">
          <div className="confirmar-avatar-grande">
            {entrenador.foto_url
              ? <img src={entrenador.foto_url} alt={entrenador.nombre} />
              : <span>{iniciales}</span>}
          </div>
          <p className="confirmar-nombre-grande">{entrenador.nombre}</p>
          <div className="confirmar-rating">
            <span>⭐ {parseFloat(entrenador.rating || 0).toFixed(1)}</span>
            <span className="confirmar-clases">· {entrenador.clases_dadas || 0} clases dadas</span>
          </div>
        </div>

        <div className="elegir-horario-seccion">
          <p className="seccion-label">ELEGÍ UN HORARIO</p>
          <div className="turnos-chips-confirmar">
            <div className="chip-turno chip-seleccionado chip-grande">
              {formatearDiaHora(turno.fecha_inicio)}
              <span className="chip-duracion">{turno.duracion_min} Min</span>
            </div>
          </div>
        </div>

        <div className="turno-resumen-card">
          <p className="turno-resumen-titulo">Turno seleccionado</p>
          <p className="turno-resumen-detalle">
            {formatearFechaCompleta(turno.fecha_inicio)} · Sede {turno.sede || 'Palermo'}
          </p>
          <p className="turno-resumen-tipo">
            Clase particular · {turno.duracion_min} min
          </p>
          <p className="turno-resumen-pago">El pago se coordina con el entrenador</p>
        </div>

        <div className="confirmar-acciones">
          <button
            className="btn-enviar-solicitud"
            onClick={onConfirmar}
            disabled={enviando}
          >
            {enviando ? 'Enviando...' : 'Enviar solicitud'}
          </button>
          <button className="btn-cancelar-clase" onClick={onVolver}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarClase;