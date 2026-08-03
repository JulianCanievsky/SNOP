import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://jdmurvhfdoohocaafvnf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbXVydmhmZG9vaG9jYWFmdm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ3MjkyNywiZXhwIjoyMDk0MDQ4OTI3fQ.agC-Q9ybGlyXPPdZUoAOB9RbT7Oet8FGxXhh4CquVmI'
)

// Ver un turno existente para saber la estructura
const { data: turnos, error: errT } = await sb.from('turnos').select('*').limit(1)
console.log('Turno existente:', JSON.stringify(turnos?.[0] || errT, null, 2))

// Ver niveles
const { data: niveles, error: errN } = await sb.from('niveles').select('*').order('orden')
console.log('Niveles:', JSON.stringify(niveles || errN, null, 2))

// Intentar un insert de prueba
const { data: inserted, error: errI } = await sb
  .from('turnos')
  .insert({
    user_id: 1,  // reemplazar con ID real de entrenador
    tipo_turno_id: 2,
    sede_id: 1,
    fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
    fecha_fin: new Date(Date.now() + 86400000 + 5400000).toISOString(),
    duracion_min: 90,
    estado: true,
    capacidad_maxima: 2,
  })
  .select()
  .single()

console.log('Insert result:', JSON.stringify(inserted || errI, null, 2))
