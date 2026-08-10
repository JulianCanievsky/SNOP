/**
 * rutas/notificaciones.js
 *
 * GET  /api/notificaciones          — últimas 30 del usuario logueado
 * GET  /api/notificaciones/no-leidas — solo count de no leídas
 * PATCH /api/notificaciones/leer-todas — marca todas como leídas
 * PATCH /api/notificaciones/:id/leer  — marca una como leída
 */
import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'

const router = express.Router()
router.use(autenticar)

// GET /api/notificaciones
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('id, titulo, mensaje, tipo, leida, fecha, link')
      .eq('user_id', req.userId)
      .order('fecha', { ascending: false })
      .limit(30)

    if (error) {
      if (error.code === '42P01') return res.json({ data: [], no_leidas: 0 })
      throw error
    }

    const noLeidas = (data ?? []).filter(n => !n.leida).length
    res.json({ data: data ?? [], no_leidas: noLeidas })
  } catch (err) {
    console.error('GET /notificaciones', err)
    res.status(500).json({ error: 'Error al obtener notificaciones' })
  }
})

// GET /api/notificaciones/no-leidas
router.get('/no-leidas', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('leida', false)

    if (error) {
      if (error.code === '42P01') return res.json({ count: 0 })
      throw error
    }
    res.json({ count: count ?? 0 })
  } catch (err) {
    console.error('GET /notificaciones/no-leidas', err)
    res.status(500).json({ error: 'Error al obtener count' })
  }
})

// PATCH /api/notificaciones/leer-todas
router.patch('/leer-todas', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('user_id', req.userId)
      .eq('leida', false)

    if (error && error.code !== '42P01') throw error
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /notificaciones/leer-todas', err)
    res.status(500).json({ error: 'Error al marcar notificaciones' })
  }
})

// PATCH /api/notificaciones/:id/leer
router.patch('/:id/leer', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /notificaciones/:id/leer', err)
    res.status(500).json({ error: 'Error al marcar notificación' })
  }
})

export default router
