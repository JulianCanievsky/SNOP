/**
 * rutas/creditos.js
 * Créditos de recupero del socio autenticado.
 *
 * GET /api/creditos — resumen y lista de créditos del socio.
 *
 * Semántica de campos:
 *   usado   = crédito fue aplicado a un turno de recupero
 *   vencido = crédito no fue usado Y ya superó su fecha_vencimiento
 *
 * Ambos son conceptos distintos: NO se marca usado=true cuando vence.
 */
import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'

const router = express.Router()
router.use(autenticar)

// ── GET /api/creditos ─────────────────────────────────────────────────────────
// Devuelve resumen de créditos del socio autenticado.
router.get('/', async (req, res) => {
  const socioId = req.userId
  const ahora   = new Date()

  try {
    const { data, error } = await supabase
      .from('creditos_clase')
      .select('id, mes_periodo, usado, turno_origen_id, turno_usado_id, fecha_generado, fecha_vencimiento')
      .eq('user_id', socioId)
      .order('fecha_vencimiento', { ascending: true })

    if (error) {
      // Tabla aún no creada en Supabase → devolvemos 0 créditos sin romper
      if (error.code === '42P01') {
        return res.json({ ok: true, data: { disponibles: 0, usados: 0, vencidos: 0, creditos: [] } })
      }
      throw error
    }

    // Calcular vencido en runtime — SIN modificar el campo `usado` en la BD.
    // Separación semántica clara: usado ≠ vencido.
    const creditos = (data ?? []).map(c => ({
      ...c,
      // vencido: no fue usado Y ya pasó la fecha de vencimiento
      vencido: !c.usado && new Date(c.fecha_vencimiento) < ahora,
    }))

    const disponibles = creditos.filter(c => !c.usado && !c.vencido).length
    const usados      = creditos.filter(c =>  c.usado).length
    const vencidos    = creditos.filter(c =>  c.vencido).length

    res.json({ ok: true, data: { disponibles, usados, vencidos, creditos } })
  } catch (err) {
    console.error('GET /api/creditos', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener créditos' })
  }
})

export default router
