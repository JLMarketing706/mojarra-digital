import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Crown, Building2, Users, FileText, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { formatFecha } from '@/lib/utils'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { Escribania, EstadoEscribania, PlanEscribania } from '@/types'
import { LABEL_ESTADO_ESCRIBANIA, LABEL_PLAN } from '@/types'

export const metadata: Metadata = { title: 'Super Admin · Mojarra Digital' }

const ESTADO_COLORS: Record<EstadoEscribania, string> = {
  trial: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  activa: 'bg-green-500/15 text-green-300 border-green-500/30',
  suspendida: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  cancelada: 'bg-red-500/15 text-red-300 border-red-500/30',
}

const PLAN_COLORS: Record<PlanEscribania, string> = {
  trial: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  basico: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  profesional: 'bg-lime-400/15 text-lime-300 border-lime-400/30',
  estudio: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
}

interface EscribaniaConStats extends Escribania {
  cantidad_usuarios?: number
  cantidad_clientes?: number
  cantidad_tramites?: number
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Auth + super admin check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!superAdmin) redirect('/crm/dashboard')

  // Cargar todas las escribanías
  const { data: escribanias } = await supabase
    .from('escribanias')
    .select('*')
    .order('created_at', { ascending: false })

  const lista = (escribanias ?? []) as Escribania[]

  // Métricas globales
  const [
    { count: totalEscribanias },
    { count: totalActivas },
    { count: totalTrials },
    { count: totalUsuarios },
  ] = await Promise.all([
    supabase.from('escribanias').select('*', { count: 'exact', head: true }),
    supabase.from('escribanias').select('*', { count: 'exact', head: true }).eq('estado', 'activa'),
    supabase.from('escribanias').select('*', { count: 'exact', head: true }).eq('estado', 'trial'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('activo', true),
  ])

  // Stats por escribanía
  const escribaniasConStats: EscribaniaConStats[] = await Promise.all(
    lista.map(async e => {
      const [{ count: u }, { count: c }, { count: t }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('escribania_id', e.id),
        supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('escribania_id', e.id),
        supabase.from('tramites').select('*', { count: 'exact', head: true }).eq('escribania_id', e.id),
      ])
      return {
        ...e,
        cantidad_usuarios: u ?? 0,
        cantidad_clientes: c ?? 0,
        cantidad_tramites: t ?? 0,
      }
    }),
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown size={24} className="text-lime-400" />
            Mojarra Digital · Admin
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Panel de gestión de la plataforma — solo super administradores.
          </p>
        </div>
        <Link href="/crm/dashboard">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Ir al CRM →
          </Button>
        </Link>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Total escribanías</p>
              <p className="text-3xl font-bold text-white">{totalEscribanias ?? 0}</p>
            </div>
            <Building2 size={22} className="text-lime-400" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Activas</p>
              <p className="text-3xl font-bold text-green-400">{totalActivas ?? 0}</p>
            </div>
            <ShieldCheck size={22} className="text-green-400" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-xs mb-1">En trial</p>
              <p className="text-3xl font-bold text-yellow-400">{totalTrials ?? 0}</p>
            </div>
            <AlertTriangle size={22} className="text-yellow-400" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Usuarios totales</p>
              <p className="text-3xl font-bold text-white">{totalUsuarios ?? 0}</p>
            </div>
            <Users size={22} className="text-lime-400" />
          </CardContent>
        </Card>
      </div>

      {/* Lista de escribanías */}
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
        Escribanías ({lista.length})
      </h2>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">Escribanía</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">Plan</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">Estado</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium text-xs">Usuarios</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium text-xs">Clientes</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium text-xs">Trámites</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">Trial hasta</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">Soporte</th>
              </tr>
            </thead>
            <tbody>
              {escribaniasConStats.map(e => {
                const soporteActivo = e.soporte_habilitado_until && new Date(e.soporte_habilitado_until) > new Date()
                return (
                  <tr key={e.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <p className="text-zinc-200 font-medium">{e.razon_social}</p>
                      {e.nombre_fantasia && (
                        <p className="text-zinc-500 text-xs">{e.nombre_fantasia}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs border ${PLAN_COLORS[e.plan]}`}>
                        {LABEL_PLAN[e.plan]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs border ${ESTADO_COLORS[e.estado]}`}>
                        {LABEL_ESTADO_ESCRIBANIA[e.estado]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      {e.cantidad_usuarios}
                      <span className="text-zinc-600">/{e.max_usuarios}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">{e.cantidad_clientes}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">{e.cantidad_tramites}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {e.trial_until ? formatFecha(e.trial_until) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {soporteActivo ? (
                        <Badge className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          Activo
                        </Badge>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-8 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-500">
        <p className="flex items-start gap-2">
          <FileText size={14} className="text-zinc-500 shrink-0 mt-0.5" />
          <span>
            <strong className="text-zinc-300">Privacidad:</strong> como super admin podés ver
            métricas agregadas y gestionar suscripciones. Para acceder a los datos de PII de
            clientes finales (DNIs, sentencias, etc.) la escribanía debe activar el "modo soporte"
            desde su panel de configuración. Todos los accesos quedan auditados.
          </span>
        </p>
      </div>
    </div>
  )
}
