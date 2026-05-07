// ──────────────────────────────────────────────────────────────
// Plazos registrales — cálculo de vencimientos
// ──────────────────────────────────────────────────────────────
// Cada registro de la propiedad maneja sus propios días:
//   PBA  → 180 desde presentación, +180 por cada prórroga
//   CABA → 180 desde presentación, +60 por cada prórroga
//
// El reloj toma la fecha MÁS RECIENTE cargada y le suma los días
// que correspondan a esa etapa.
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

/** Días que corresponden por etapa, según registro */
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

export interface FechasPlazo {
  fecha_presentacion?: string | null
  fecha_primera_prorroga?: string | null
  fecha_segunda_prorroga?: string | null
  fecha_tercera_prorroga?: string | null
}

export interface PlazoCalculado {
  registro: RegistroPropiedad
  /** Etapa actual (la última fecha cargada) */
  etapaActual: EtapaPlazo
  /** Fecha desde la que cuenta el plazo */
  fechaInicio: string // YYYY-MM-DD
  /** Días totales del plazo de esta etapa */
  diasPlazo: number
  /** Fecha de vencimiento calculada */
  fechaVencimiento: string // YYYY-MM-DD
  /** Días restantes hasta el vencimiento (negativo si vencido) */
  diasRestantes: number
  /** Si la 2da prórroga está cargada → genera Nº de expediente */
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

/**
 * Calcula el plazo registral activo para una escritura.
 * Devuelve null si no hay registro o no hay ninguna fecha cargada.
 */
export function calcularPlazoRegistral(
  registro: string | null | undefined,
  fechas: FechasPlazo
): PlazoCalculado | null {
  if (registro !== 'pba' && registro !== 'caba') return null

  // Determinar la etapa más avanzada con fecha
  let etapa: EtapaPlazo | null = null
  let fechaInicio: string | null = null

  if (fechas.fecha_tercera_prorroga) {
    etapa = 'tercera_prorroga'
    fechaInicio = fechas.fecha_tercera_prorroga
  } else if (fechas.fecha_segunda_prorroga) {
    etapa = 'segunda_prorroga'
    fechaInicio = fechas.fecha_segunda_prorroga
  } else if (fechas.fecha_primera_prorroga) {
    etapa = 'primera_prorroga'
    fechaInicio = fechas.fecha_primera_prorroga
  } else if (fechas.fecha_presentacion) {
    etapa = 'presentacion'
    fechaInicio = fechas.fecha_presentacion
  }

  if (!etapa || !fechaInicio) return null

  const plazos = PLAZOS_POR_REGISTRO[registro]
  const diasPlazo = etapa === 'presentacion' ? plazos.presentacion : plazos.prorroga

  const fechaInicioDate = parseFechaLocal(fechaInicio)
  const fechaVencDate = new Date(fechaInicioDate)
  fechaVencDate.setDate(fechaVencDate.getDate() + diasPlazo)

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const ms = fechaVencDate.getTime() - hoy.getTime()
  const diasRestantes = Math.ceil(ms / 86400000)

  return {
    registro,
    etapaActual: etapa,
    fechaInicio,
    diasPlazo,
    fechaVencimiento: toYMD(fechaVencDate),
    diasRestantes,
    generaExpediente: !!fechas.fecha_segunda_prorroga,
  }
}

/** Color tailwind según urgencia */
export function colorPlazo(diasRestantes: number): string {
  if (diasRestantes < 0) return 'text-red-400'
  if (diasRestantes <= 15) return 'text-red-400'
  if (diasRestantes <= 30) return 'text-amber-400'
  return 'text-lime-400'
}
