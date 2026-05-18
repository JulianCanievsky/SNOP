import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const router = express.Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requerido' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.socio_id = decoded.id
    next()
  } catch {
    return res.status(403).json({ error: 'Token inválido' })
  }
}

router.get('/', verificarToken, async (req, res) => {
  try {
    const { sede_id, fecha } = req.query
    const socioId = req.socio_id

    let query = supabase
      .from('juego_libre')
      .select('*')
      .eq('activo', true)
      .order('fecha_inicio', { ascending: true })

    if (sede_id) query = query.eq('sede_id', sede_id)
    if (fecha) {
      const desde = new Date(fecha)
      const hasta = new Date(fecha)
      hasta.setDate(hasta.getDate() + 1)
      query = query.gte('fecha_inicio', desde.toISOString()).lt('fecha_inicio', hasta.toISOString())
    }

    const { data: eventos, error } = await query
    if (error) throw error

    // Traer inscripciones
    const { data: inscripciones, error: errorInsc } = await supabase
      .from('inscripciones_juego_libre')
      .select('evento_id, socio_id')
      .eq('estado', 'activo')

    if (errorInsc) throw errorInsc

    // Traer usuarios de los inscriptos
    const socioIds = [...new Set(inscripciones.map(i => i.socio_id))]
    let usuarios = []
    if (socioIds.length > 0) {
      const { data: usersData, error: errorUsers } = await supabase
        .from('users')
        .select('id, nombre, foto_url')
        .in('id', socioIds)
      if (errorUsers) throw errorUsers
      usuarios = usersData
    }

    const resultado = eventos.map(evento => {
      const anotados = inscripciones.filter(i => i.evento_id === evento.id)
      const yaInscripto = anotados.some(i => i.socio_id === socioId)

      return {
        ...evento,
        inscriptos: anotados.length,
        nombre_sede: evento.sede_id === 1 ? 'Palermo' : 'Armenia',
        estado: anotados.length >= evento.capacidad_maxima ? 'completo' : 'abierto',
        ya_inscripto: yaInscripto,
        participantes: anotados.map(i => {
          const user = usuarios.find(u => u.id === i.socio_id)
          return {
            nombre: user?.nombre || '?',
            foto_url: user?.foto_url || null
          }
        })
      }
    })

    res.json(resultado)

  } catch (error) {
    console.error('ERROR GET:', JSON.stringify(error, null, 2))
    res.status(500).json({ error: 'Error al obtener juego libre' })
  }
})

router.post('/:id/inscribir', verificarToken, async (req, res) => {
  try {
    const eventoId = parseInt(req.params.id)
    const socioId = req.socio_id

    const { data: evento, error: errorEvento } = await supabase
      .from('juego_libre')
      .select('*')
      .eq('id', eventoId)
      .single()

    if (errorEvento || !evento) return res.status(404).json({ error: 'Evento no encontrado' })

    const { data: yaInscripto } = await supabase
      .from('inscripciones_juego_libre')
      .select('id')
      .eq('evento_id', eventoId)
      .eq('socio_id', socioId)
      .eq('estado', 'activo')
      .single()

    if (yaInscripto) return res.status(400).json({ error: 'Ya estás inscripto' })

    const { count } = await supabase
      .from('inscripciones_juego_libre')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', eventoId)
      .eq('estado', 'activo')

    if (count >= evento.capacidad_maxima) return res.status(400).json({ error: 'El evento está completo' })

    const { error: errorInsc } = await supabase
      .from('inscripciones_juego_libre')
      .insert({ evento_id: eventoId, socio_id: socioId, estado: 'activo' })

    if (errorInsc) throw errorInsc

    res.json({ mensaje: 'Inscripción confirmada' })

  } catch (error) {
    console.error('ERROR POST:', JSON.stringify(error, null, 2))
    res.status(500).json({ error: 'Error al inscribirse' })
  }
})

router.delete('/:id/cancelar', verificarToken, async (req, res) => {
  try {
    const eventoId = parseInt(req.params.id)
    const socioId = req.socio_id

    const { error } = await supabase
      .from('inscripciones_juego_libre')
      .update({ estado: 'cancelado' })
      .eq('evento_id', eventoId)
      .eq('socio_id', socioId)
      .eq('estado', 'activo')

    if (error) throw error

    res.json({ mensaje: 'Inscripción cancelada' })

  } catch (error) {
    console.error('ERROR DELETE:', JSON.stringify(error, null, 2))
    res.status(500).json({ error: 'Error al cancelar' })
  }
})

export default router