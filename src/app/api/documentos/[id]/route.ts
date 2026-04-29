import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/documentos/[id]
// Genera y devuelve una URL firmada de corta duración (1 hora) para descargar
// el documento. La URL nunca se persiste en DB.
//
// Auth: el usuario debe ser staff, o cliente dueño (vía RLS de SELECT en `documentos`).

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // RLS asegura que solo veamos docs accesibles para este usuario
  const { data: doc, error } = await supabase
    .from('documentos')
    .select('id, storage_path, nombre, mime_type')
    .eq('id', id)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  }

  if (!doc.storage_path) {
    return NextResponse.json({ error: 'Documento sin path de storage' }, { status: 410 })
  }

  // Generar URL firmada de 1 hora
  const { data: signed, error: signErr } = await supabase.storage
    .from('documentos-privados')
    .createSignedUrl(doc.storage_path, 60 * 60)

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: 'No se pudo generar la URL' }, { status: 500 })
  }

  // Auditar acceso a documento
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_email: user.email,
    accion: 'DOWNLOAD',
    tabla: 'documentos',
    registro_id: doc.id,
    cambios: { storage_path: doc.storage_path, nombre: doc.nombre },
  }).then(() => null, () => null) // best effort

  // Redirigir a la URL firmada
  return NextResponse.redirect(signed.signedUrl, 302)
}
