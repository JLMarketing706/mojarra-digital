// ──────────────────────────────────────────────────────────────
// Plazos registrales — cálculo de vencimientos
// ──────────────────────────────────────────────────────────────
// Solo se ingresa la fecha de presentación. Las prórrogas son
// booleans (activadas / no). Cada prórroga activa suma días según
// el registro:
//   PBA  → presentación +180 días, +180 por cada prórroga activa
//   CABA → presentación +180 días, +60 por cada prórroga activa
// ──────────────────────────────────────────────────────────────

export type RegistroPropiedad = 'pba' | 'caba'

export const REGISTRO_LABELS: Record<RegistroPropiedad, string> = {
  pba: 'Registro de la Propiedad Inmueble — Provincia de Buenos Aires',
  caba: 'Registro de la Propiedad Inmueble — Capital Federal',
}

export const REGISTRO_LABELS_CORTO: Record<RegistroPropiedad, string> = {
  pba: 'PBA',
  caba: 'CABA',
}

export const PLAZOS_POR_REGISTRO: Record<
  RegistroPropiedad,
  { presentacion: number; prorroga: number }
> = {
  pba: { presentacion: 180, prorroga: 180 },
  caba: { presentacion: 180, prorroga: 60 },
}

export type EtapaPlazo = 'presentacion' | 'primera_prorroga' | 'segunda_prorroga' | 'tercera_prorroga'

export const ETAPA_LABEL: Record<EtapaPlazo, string> = {
  presentacion: 'Presentación',
  primera_prorroga: '1ra prórroga',
  segunda_prorroga: '2da prórroga',
  tercera_prorroga: '3ra prórroga',
}

export interface EstadoPlazos {
  fecha_presentacion?: string | null
  primera_prorroga_activa?: boolean
  segunda_prorroga_activa?: boolean
  tercera_prorroga_activa?: boolean
}

export interface VencimientoEtapa {
  etapa: EtapaPlazo
  /** Fecha desde la que arranca esta etapa (YYYY-MM-DD) */
  fechaInicio: string
  /** Días que dura esta etapa */
  diasEtapa: number
  /** Fecha de vencimiento de esta etapa (YYYY-MM-DD) */
  fechaVencimiento: string
  /** Si esta etapa está activada (siempre true para presentación, según el bool para prórrogas) */
  activa: boolean
}

export interface PlazoCalculado {
  registro: RegistroPropiedad
  /** Línea de tiempo completa: presentación + 3 prórrogas (estén activas o no) */
  timeline: VencimientoEtapa[]
  /** Etapa actual = última activa */
  etapaActual: EtapaPlazo
  /** Fecha de vencimiento actual (de la última etapa activa) */
  fechaVencimiento: string
  /** Días restantes hasta el vencimiento actual (negativo si vencido) */
  diasRestantes: number
  /** Días totales desde la presentación hasta el vencimiento actual */
  diasAcumulados: number
  /** True si la 2da prórroga está activa → genera Nº de expediente */
  generaExpediente: boolean
}

function parseFechaLocal(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(s)
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

/**
 * Calcula la línea de tiempo completa de plazos para una escritura.
 * Devuelve null si no hay registro o no hay fecha de presentación.
 */
export function calcularPlazoRegistral(
  registro: string | null | undefined,
  estado: EstadoPlazos
): PlazoCalculado | null {
  if (registro !== 'pba' && registro !== 'caba') return null
  if (!estado.fecha_presentacion) return null

  const plazos = PLAZOS_POR_REGISTRO[registro]
  const presentacion = parseFechaLocal(estado.fecha_presentacion)

  // Calcular cada vencimiento acumulando días sobre la presentación
  const venceTras180 = addDays(presentacion, plazos.presentacion)
  const venceTrasP1 = addDays(venceTras180, plazos.prorroga)
  const venceTrasP2 = addDays(venceTrasP1, plazos.prorroga)
  const venceTrasP3 = addDays(venceTrasP2, plazos.prorroga)

  const timeline: VencimientoEtapa[] = [
    {
      etapa: 'presentacion',
      fechaInicio: toYMD(presentacion),
      diasEtapa: plazos.presentacion,
      fechaVencimiento: toYMD(venceTras180),
      activa: true,
    },
    {
      etapa: 'primera_prorroga',
      fechaInicio: toYMD(venceTras180),
      diasEtapa: plazos.prorroga,
      fechaVencimiento: toYMD(venceTrasP1),
      activa: !!estado.primera_prorroga_activa,
    },
    {
      etapa: 'segunda_prorroga',
      fechaInicio: toYMD(venceTrasP1),
      diasEtapa: plazos.prorroga,
      fechaVencimiento: toYMD(venceTrasP2),
      activa: !!estado.segunda_prorroga_activa,
    },
    {
      etapa: 'tercera_prorroga',
      fechaInicio: toYMD(venceTrasP2),
      diasEtapa: plazos.prorroga,
      fechaVencimiento: toYMD(venceTrasP3),
      activa: !!estado.tercera_prorroga_activa,
    },
  ]

  // La etapa actual es la ÚLTIMA activa
  const ultimaActiva = [...timeline].reverse().find(e => e.activa) ?? timeline[0]

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venceDate = parseFechaLocal(ultimaActiva.fechaVencimiento)
  const diasRestantes = Math.ceil((venceDate.getTime() - hoy.getTime()) / 86400000)

  // Días acumulados desde la presentación hasta el vencimiento actual
  const diasAcumulados = Math.round(
    (venceDate.getTime() - presentacion.getTime()) / 86400000
  )

  return {
    registro,
    timeline,
    etapaActual: ultimaActiva.etapa,
    fechaVencimiento: ultimaActiva.fechaVencimiento,
    diasRestantes,
    diasAcumulados,
    generaExpediente: !!estado.segunda_prorroga_activa,
  }
}

/** Color tailwind según urgencia */
export function colorPlazo(diasRestantes: number): string {
  if (diasRestantes < 0) return 'text-red-400'
  if (diasRestantes <= 15) return 'text-red-400'
  if (diasRestantes <= 30) return 'text-amber-400'
  return 'text-lime-400'
}
