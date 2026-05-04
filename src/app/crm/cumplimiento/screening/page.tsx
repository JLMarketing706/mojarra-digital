'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClienteCombobox } from '@/components/crm/cliente-combobox'
import { toast } from 'sonner'
import {
  Loader2, ArrowLeft, Search, ShieldCheck, AlertTriangle,
  ShieldOff, Globe, User,
} from 'lucide-react'
import Link from 'next/link'
import type { OrigenLista } from '@/types'
import { LABEL_LISTA } from '@/types'

interface ListaItem {
  id: string
  origen: OrigenLista
  nombre_completo: string
  cargo: string | null
  pais: string | null
  motivo: string | null
  fecha_inclusion: string | null
}

interface ClienteOption {
  id: string
  nombre: string
  apellido: string
  dni: string | null
}

interface ScreeningResultadoRow {
  lista_id: string
  origen: string
  nombre_lista: string
  similitud: number
}

const ORIGEN_COLORS: Record<OrigenLista, string> = {
  PEP_AR: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  OFAC: 'bg-red-500/15 text-red-300 border-red-500/30',
  ONU: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  UE: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  GAFI: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  INTERPOL: 'bg-red-500/15 text-red-300 border-red-500/30',
  OTRO: 'bg-zinc-700 text-zinc-300 border-zinc-700',
}

export default function ScreeningPage() {
  const supabase = createClient()
  const [listas, setListas] = useState<ListaItem[]>([])
  const [filtro, setFiltro] = useState('')
  const [origenFiltro, setOrigenFiltro] = useState<OrigenLista | ''>('')

  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [clienteSel, setClienteSel] = useState('')
  const [screening, setScreening] = useState<ScreeningResultadoRow[] | null>(null)
  const [scanning, setScanning] = useState(false)

  const cargarListas = useCallback(async () => {
    let q = supabase.from('listas_sancion').select('*').eq('vigente', true).order('origen').order('nombre_completo')
    if (origenFiltro) q = q.eq('origen', origenFiltro)
    const { data } = await q.limit(500)
    if (data) setListas(data as ListaItem[])
  }, [supabase, origenFiltro])

  useEffect(() => { cargarListas() }, [cargarListas])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('clientes').select('id, nombre, apellido, dni')
        .order('apellido').limit(200)
      if (data) setClientes(data as ClienteOption[])
    }
    load()
  }, [supabase])

  async function correrScreening() {
    if (!clienteSel) { toast.error('Seleccioná un cliente'); return }
    setScanning(true)
    setScreening(null)
    const { data, error } = await supabase.rpc('screen_cliente', { p_cliente_id: clienteSel })
    setScanning(false)
    if (error) {
      console.error(error)
      toast.error('Error al hacer screening')
      return
    }
    const results = (data ?? []) as ScreeningResultadoRow[]
    setScreening(results)
    if (results.length === 0) {
      toast.success('Sin coincidencias en listas vigentes ✓')
    } else {
      toast.warning(`${results.length} coincidencia(s) detectadas`)
    }
  }

  const listasFiltradas = filtro
    ? listas.filter(l =>
        l.nombre_completo.toLowerCase().includes(filtro.toLowerCase()) ||
        l.cargo?.toLowerCase().includes(filtro.toLowerCase())
      )
    : listas

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/cumplimiento">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Cumplimiento
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
          <ShieldCheck size={20} className="text-lime-400" />Screening de Listas
        </h1>
        <p className="text-zinc-500 text-sm">
          Verificá clientes contra listas PEP, OFAC, ONU y otras sanciones internacionales.
          Búsqueda fuzzy por nombre + match exacto por documento.
        </p>
      </div>

      {/* SCAN CLIENTE */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <Search size={14} className="text-lime-400" />Verificar cliente contra todas las listas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <ClienteCombobox
                value={clienteSel}
                onChange={setClienteSel}
                clientes={clientes}
              />
            </div>
            <Button onClick={correrScreening} disabled={!clienteSel || scanning}
              className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Ejecutar screening
            </Button>
          </div>

          {screening !== null && (
            <div className="mt-5">
              {screening.length === 0 ? (
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/30 flex items-center gap-3">
                  <ShieldCheck size={20} className="text-green-400 shrink-0" />
                  <div>
                    <p className="text-green-300 text-sm font-medium">Sin coincidencias en listas vigentes</p>
                    <p className="text-green-400/70 text-xs">El cliente no aparece en ninguna lista de sanción o PEP cargada.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-300 mb-2">
                    {screening.length} coincidencia(s):
                  </p>
                  {screening.map((r, i) => (
                    <div key={i} className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                      r.similitud >= 80 ? 'bg-red-500/5 border-red-500/30' :
                      r.similitud >= 60 ? 'bg-yellow-500/5 border-yellow-500/30' :
                      'bg-zinc-800/40 border-zinc-700'
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs border ${ORIGEN_COLORS[r.origen as OrigenLista] ?? ''}`}>
                            {LABEL_LISTA[r.origen as OrigenLista] ?? r.origen}
                          </Badge>
                          {r.similitud >= 80 && <AlertTriangle size={14} className="text-red-400" />}
                        </div>
                        <p className="text-zinc-200 text-sm font-medium">{r.nombre_lista}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${
                          r.similitud >= 80 ? 'text-red-400' :
                          r.similitud >= 60 ? 'text-yellow-400' :
                          'text-zinc-400'
                        }`}>
                          {r.similitud.toFixed(0)}%
                        </p>
                        <p className="text-xs text-zinc-500">similitud</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* LISTAS DISPONIBLES */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Globe size={14} className="text-lime-400" />
              Listas vigentes ({listasFiltradas.length})
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={origenFiltro} onChange={e => setOrigenFiltro(e.target.value as OrigenLista | '')}
                className="bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-1.5 text-xs focus:outline-none">
                <option value="">Todas las listas</option>
                {(Object.keys(LABEL_LISTA) as OrigenLista[]).map(o => (
                  <option key={o} value={o}>{LABEL_LISTA[o]}</option>
                ))}
              </select>
              <Input value={filtro} onChange={e => setFiltro(e.target.value)}
                placeholder="Buscar por nombre o cargo..."
                className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 w-56" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {listasFiltradas.length === 0 ? (
            <p className="text-center py-8 text-zinc-500 text-sm">Sin entradas.</p>
          ) : (
            <div className="rounded-lg border border-zinc-800 overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium text-xs">Lista</th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium text-xs">Nombre</th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium text-xs hidden md:table-cell">Cargo / motivo</th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium text-xs hidden lg:table-cell">País</th>
                  </tr>
                </thead>
                <tbody>
                  {listasFiltradas.slice(0, 100).map(l => (
                    <tr key={l.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-3 py-2">
                        <Badge className={`text-xs border ${ORIGEN_COLORS[l.origen]}`}>
                          {LABEL_LISTA[l.origen]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-zinc-200 flex items-center gap-1.5">
                        <User size={11} className="text-zinc-500" />
                        {l.nombre_completo}
                      </td>
                      <td className="px-3 py-2 text-zinc-400 text-xs hidden md:table-cell">
                        {l.cargo || l.motivo || '—'}
                      </td>
                      <td className="px-3 py-2 text-zinc-500 text-xs hidden lg:table-cell">{l.pais || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {listasFiltradas.length > 100 && (
                <div className="bg-zinc-900 px-3 py-2 text-xs text-zinc-500 text-center border-t border-zinc-800">
                  Mostrando primeros 100 de {listasFiltradas.length}. Refiná tu búsqueda.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-500 flex items-start gap-2">
        <ShieldOff size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>
          <strong className="text-zinc-300">Aviso:</strong> esta base es ilustrativa y debe complementarse
          con consultas a las listas oficiales actualizadas (UIF, OFAC SDN, ONU, etc.).
          Para producción se recomienda integración con un servicio de datos como Dow Jones, Refinitiv o Acuris.
        </p>
      </div>
    </div>
  )
}
