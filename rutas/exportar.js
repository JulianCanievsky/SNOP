import express from 'express'
import ExcelJS from 'exceljs'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'

const router = express.Router()

// Solo admins
function soloAdmin(req, res, next) {
  if (req.userTipo !== 3) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' })
  }
  next()
}

router.use(autenticar, soloAdmin)

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseFiltros(query) {
  const { desde, hasta, sede_id } = query
  const ahora = new Date()

  const fechaDesde = desde
    ? new Date(`${desde}T00:00:00`)
    : new Date(ahora.getFullYear(), ahora.getMonth(), 1) // primer día del mes

  const fechaHasta = hasta
    ? new Date(`${hasta}T23:59:59`)
    : new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59) // fin del mes

  return { fechaDesde, fechaHasta, sede_id: sede_id || null }
}

function estiloCabecera(worksheet) {
  const fila = worksheet.getRow(1)
  fila.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  fila.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
  fila.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  fila.height    = 28
}

function autoAncho(worksheet) {
  worksheet.columns.forEach(col => {
    let maxLen = col.header ? col.header.length : 10
    col.eachCell({ includeEmpty: false }, cell => {
      const val = cell.value ? String(cell.value) : ''
      if (val.length > maxLen) maxLen = val.length
    })
    col.width = Math.min(maxLen + 4, 50)
  })
}

function formatFecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

// ── GET /api/admin/exportar/turnos ────────────────────────────────────────────
// Exporta turnos de entrenamiento (tipo_turno_id = 1) — una fila por socio inscripto
router.get('/turnos', async (req, res) => {
  const { fechaDesde, fechaHasta, sede_id } = parseFiltros(req.query)

  try {
    let query = supabase
      .from('turnos')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        capacidad_maxima,
        sedes ( nombre ),
        mesas ( numero ),
        users!turnos_user_id_fkey ( nombre ),
        socio_turno (
          id,
          estado,
          users!socio_turno_user_id_fkey ( id, nombre, email, nivel_id, niveles(nombre) )
        )
      `)
      .eq('tipo_turno_id', 1)
      .gte('fecha_inicio', fechaDesde.toISOString())
      .lte('fecha_inicio', fechaHasta.toISOString())
      .order('fecha_inicio', { ascending: true })

    if (sede_id) query = query.eq('sede_id', sede_id)

    const { data: turnos, error } = await query
    if (error) throw error

    const workbook  = new ExcelJS.Workbook()
    workbook.creator = 'SNOP'
    const ws = workbook.addWorksheet('Turnos de entrenamiento')

    ws.columns = [
      { header: 'Fecha',       key: 'fecha',       width: 18 },
      { header: 'Hora inicio', key: 'hora_inicio',  width: 12 },
      { header: 'Hora fin',    key: 'hora_fin',     width: 12 },
      { header: 'Sede',        key: 'sede',         width: 20 },
      { header: 'Mesa',        key: 'mesa',         width: 8  },
      { header: 'Entrenador',  key: 'entrenador',   width: 22 },
      { header: 'Cupo máx.',   key: 'cupo',         width: 10 },
      { header: 'Inscriptos',  key: 'inscriptos',   width: 10 },
      { header: 'Socio',       key: 'socio_nombre', width: 24 },
      { header: 'Email socio', key: 'socio_email',  width: 28 },
      { header: 'Nivel',       key: 'nivel',        width: 14 },
      { header: 'Estado',      key: 'estado',       width: 12 },
    ]

    estiloCabecera(ws)

    for (const t of turnos ?? []) {
      const inscSocios = (t.socio_turno ?? [])
      const totalInsc  = inscSocios.length

      if (inscSocios.length === 0) {
        // Turno sin anotados — igual aparece en el Excel
        ws.addRow({
          fecha:        formatFecha(t.fecha_inicio),
          hora_inicio:  formatHora(t.fecha_inicio),
          hora_fin:     formatHora(t.fecha_fin),
          sede:         t.sedes?.nombre ?? '—',
          mesa:         t.mesas?.numero ?? '—',
          entrenador:   t.users?.nombre ?? '—',
          cupo:         t.capacidad_maxima,
          inscriptos:   0,
          socio_nombre: '(sin inscriptos)',
          socio_email:  '',
          nivel:        '',
          estado:       '',
        })
      } else {
        for (const st of inscSocios) {
          ws.addRow({
            fecha:        formatFecha(t.fecha_inicio),
            hora_inicio:  formatHora(t.fecha_inicio),
            hora_fin:     formatHora(t.fecha_fin),
            sede:         t.sedes?.nombre ?? '—',
            mesa:         t.mesas?.numero ?? '—',
            entrenador:   t.users?.nombre ?? '—',
            cupo:         t.capacidad_maxima,
            inscriptos:   totalInsc,
            socio_nombre: st.users?.nombre ?? '—',
            socio_email:  st.users?.email  ?? '—',
            nivel:        st.users?.niveles?.nombre ?? 'Sin nivel',
            estado:       st.estado ? 'Confirmado' : 'Pendiente',
          })
        }
      }
    }

    // Filas alternas
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return
      if (rowNum % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      }
    })

    autoAncho(ws)
    await enviarExcel(res, workbook, `turnos_entrenamiento_${fmtNombreArchivo(fechaDesde, fechaHasta)}.xlsx`)
  } catch (err) {
    console.error('GET /admin/exportar/turnos', err)
    res.status(500).json({ error: 'Error al exportar turnos' })
  }
})

// ── GET /api/admin/exportar/juego-libre ───────────────────────────────────────
router.get('/juego-libre', async (req, res) => {
  const { fechaDesde, fechaHasta, sede_id } = parseFiltros(req.query)

  try {
    let query = supabase
      .from('juego_libre')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        capacidad_maxima,
        sedes ( nombre ),
        inscripciones_juego_libre (
          id,
          fecha_inscripcion,
          estado,
          users!inscripciones_juego_libre_socio_id_fkey ( id, nombre, email, nivel_id, niveles(nombre) )
        )
      `)
      .eq('activo', true)
      .gte('fecha_inicio', fechaDesde.toISOString())
      .lte('fecha_inicio', fechaHasta.toISOString())
      .order('fecha_inicio', { ascending: true })

    if (sede_id) query = query.eq('sede_id', sede_id)

    const { data: eventos, error } = await query
    if (error) throw error

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'SNOP'
    const ws = workbook.addWorksheet('Juego libre')

    ws.columns = [
      { header: 'Fecha',        key: 'fecha',        width: 18 },
      { header: 'Hora inicio',  key: 'hora_inicio',   width: 12 },
      { header: 'Hora fin',     key: 'hora_fin',      width: 12 },
      { header: 'Sede',         key: 'sede',          width: 20 },
      { header: 'Cap. máxima',  key: 'capacidad',     width: 12 },
      { header: 'Inscriptos',   key: 'inscriptos',    width: 10 },
      { header: 'Socio',        key: 'socio_nombre',  width: 24 },
      { header: 'Email socio',  key: 'socio_email',   width: 28 },
      { header: 'Nivel',        key: 'nivel',         width: 14 },
      { header: 'Fecha inscr.', key: 'fecha_inscr',   width: 14 },
    ]

    estiloCabecera(ws)

    for (const ev of eventos ?? []) {
      const activos   = (ev.inscripciones_juego_libre ?? []).filter(i => i.estado === 'activo')
      const totalInsc = activos.length

      if (activos.length === 0) {
        ws.addRow({
          fecha:        formatFecha(ev.fecha_inicio),
          hora_inicio:  formatHora(ev.fecha_inicio),
          hora_fin:     formatHora(ev.fecha_fin),
          sede:         ev.sedes?.nombre ?? '—',
          capacidad:    ev.capacidad_maxima,
          inscriptos:   0,
          socio_nombre: '(sin inscriptos)',
          socio_email:  '',
          nivel:        '',
          fecha_inscr:  '',
        })
      } else {
        for (const i of activos) {
          ws.addRow({
            fecha:        formatFecha(ev.fecha_inicio),
            hora_inicio:  formatHora(ev.fecha_inicio),
            hora_fin:     formatHora(ev.fecha_fin),
            sede:         ev.sedes?.nombre ?? '—',
            capacidad:    ev.capacidad_maxima,
            inscriptos:   totalInsc,
            socio_nombre: i.users?.nombre ?? '—',
            socio_email:  i.users?.email  ?? '—',
            nivel:        i.users?.niveles?.nombre ?? 'Sin nivel',
            fecha_inscr:  formatFecha(i.fecha_inscripcion),
          })
        }
      }
    }

    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return
      if (rowNum % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      }
    })

    autoAncho(ws)
    await enviarExcel(res, workbook, `juego_libre_${fmtNombreArchivo(fechaDesde, fechaHasta)}.xlsx`)
  } catch (err) {
    console.error('GET /admin/exportar/juego-libre', err)
    res.status(500).json({ error: 'Error al exportar juego libre' })
  }
})

// ── GET /api/admin/exportar/torneos ───────────────────────────────────────────
// Disponible una vez creada la tabla torneos (tarea 1.7)
router.get('/torneos', async (req, res) => {
  const { fechaDesde, fechaHasta, sede_id } = parseFiltros(req.query)

  try {
    let query = supabase
      .from('torneos')
      .select(`
        id,
        nombre,
        fecha_inicio,
        fecha_fin,
        modalidad,
        capacidad_maxima,
        sedes ( nombre ),
        inscripciones_torneo (
          id,
          fecha_inscripcion,
          estado,
          users!inscripciones_torneo_socio_id_fkey ( id, nombre, email, nivel_id, niveles(nombre) )
        )
      `)
      .eq('activo', true)
      .gte('fecha_inicio', fechaDesde.toISOString())
      .lte('fecha_inicio', fechaHasta.toISOString())
      .order('fecha_inicio', { ascending: true })

    if (sede_id) query = query.eq('sede_id', sede_id)

    const { data: torneos, error } = await query
    if (error) {
      // Si la tabla todavía no existe, devolvemos Excel vacío en vez de error
      if (error.code === '42P01') {
        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet('Torneos')
        ws.addRow(['No hay torneos registrados aún'])
        return await enviarExcel(res, wb, 'torneos_vacio.xlsx')
      }
      throw error
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'SNOP'
    const ws = workbook.addWorksheet('Torneos')

    ws.columns = [
      { header: 'Torneo',       key: 'torneo',       width: 24 },
      { header: 'Fecha',        key: 'fecha',        width: 18 },
      { header: 'Sede',         key: 'sede',         width: 20 },
      { header: 'Modalidad',    key: 'modalidad',    width: 12 },
      { header: 'Cap. máxima',  key: 'capacidad',    width: 12 },
      { header: 'Inscriptos',   key: 'inscriptos',   width: 10 },
      { header: 'Socio',        key: 'socio_nombre', width: 24 },
      { header: 'Email socio',  key: 'socio_email',  width: 28 },
      { header: 'Nivel',        key: 'nivel',        width: 14 },
      { header: 'Fecha inscr.', key: 'fecha_inscr',  width: 14 },
    ]

    estiloCabecera(ws)

    for (const t of torneos ?? []) {
      const activos   = (t.inscripciones_torneo ?? []).filter(i => i.estado === 'activo')
      const totalInsc = activos.length

      if (activos.length === 0) {
        ws.addRow({
          torneo:       t.nombre,
          fecha:        formatFecha(t.fecha_inicio),
          sede:         t.sedes?.nombre ?? '—',
          modalidad:    t.modalidad,
          capacidad:    t.capacidad_maxima,
          inscriptos:   0,
          socio_nombre: '(sin inscriptos)',
          socio_email:  '',
          nivel:        '',
          fecha_inscr:  '',
        })
      } else {
        for (const i of activos) {
          ws.addRow({
            torneo:       t.nombre,
            fecha:        formatFecha(t.fecha_inicio),
            sede:         t.sedes?.nombre ?? '—',
            modalidad:    t.modalidad,
            capacidad:    t.capacidad_maxima,
            inscriptos:   totalInsc,
            socio_nombre: i.users?.nombre ?? '—',
            socio_email:  i.users?.email  ?? '—',
            nivel:        i.users?.niveles?.nombre ?? 'Sin nivel',
            fecha_inscr:  formatFecha(i.fecha_inscripcion),
          })
        }
      }
    }

    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return
      if (rowNum % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      }
    })

    autoAncho(ws)
    await enviarExcel(res, workbook, `torneos_${fmtNombreArchivo(fechaDesde, fechaHasta)}.xlsx`)
  } catch (err) {
    console.error('GET /admin/exportar/torneos', err)
    res.status(500).json({ error: 'Error al exportar torneos' })
  }
})

// ── Helpers internos ──────────────────────────────────────────────────────────

async function enviarExcel(res, workbook, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  await workbook.xlsx.write(res)
  res.end()
}

function fmtNombreArchivo(desde, hasta) {
  const fmt = (d) => d.toISOString().slice(0, 10)
  return `${fmt(desde)}_${fmt(hasta)}`
}

export default router
