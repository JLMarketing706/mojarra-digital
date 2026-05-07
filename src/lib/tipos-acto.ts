// ──────────────────────────────────────────────────────────────
// Tipos de acto + negocios causales (modelo nuevo, multi-select)
// ──────────────────────────────────────────────────────────────
// La columna `tipo_acto` en tramites guarda el value (slug)
// La columna `negocios_causales` (text[]) guarda los strings exactos
// del label de cada causal seleccionada.
//
// Las causales dentro de cada categoría están ordenadas alfabéticamente
// (case-insensitive, locale es-AR).

export type TipoActoValue = 'inmuebles' | 'personales' | 'societarios' | 'gestion_registral'

export interface TipoActo {
  value: TipoActoValue
  label: string
  causales: string[]
}

export const TIPOS_ACTO: TipoActo[] = [
  {
    value: 'inmuebles',
    label: 'Actos bienes inmuebles',
    causales: [
      'Aceptación',
      'Adjudicación',
      'Afectación protección de la vivienda',
      'Cancelación de hipoteca',
      'Cesión de derechos hereditarios',
      'Compraventa',
      'Compraventa parte indivisa',
      'Compraventa por tracto abreviado',
      'Dación en pago',
      'Declaratoria de herederos protocolizada',
      'Desafectación propiedad horizontal',
      'Desafectación protección de la vivienda',
      'División de condominio',
      'Donación',
      'Donación parte indivisa',
      'Donación por tracto abreviado',
      'Donación solidaria',
      'Habitación',
      'Hipoteca',
      'Hipoteca por saldo',
      'Hipoteca por tracto abreviado',
      'Leasing',
      'Permuta',
      'Reglamento de Copropiedad',
      'Subasta',
      'Testamento protocolizado',
      'Transferencia de Dominio',
      'Ulterior testimonio',
      'Uso',
      'Usufructo',
    ],
  },
  {
    value: 'personales',
    label: 'Actos personales y de familia',
    causales: [
      'Acta de constatación',
      'Acta de notificación',
      'Autorización de viaje para menor',
      'Autorización para conducir vehículo',
      'Certificación de unión convivencial',
      'Desvinculación laboral',
      'Poder especial',
      'Poder especial Administración',
      'Poder Especial Irrevocable',
      'Poder G. Jud. Y Adm.',
      'Poder general',
      'Poder General Administración y Disposición',
      'Poder General Amplio de administración y disposición',
      'Poder General Amplio Disposición Judicial',
      'Poder General Bancario',
      'Poder General judicial',
      'Poder General Judicial y Bancario',
      'Protocolización de actos Judiciales',
      'Protocolización de instrumento privado',
      'Testamento',
      'Venia matrimonial',
    ],
  },
  {
    value: 'societarios',
    label: 'Actos societarios y comerciales',
    causales: [
      'Acta de asamblea',
      'Acta de directorio',
      'Cesión de cuotas sociales',
      'Constitución de sociedad (otra)',
      'Constitución de sociedad (SA)',
      'Constitución de sociedad (SAS)',
      'Constitución de sociedad (SRL)',
      'Contrato de alquiler (certificación)',
      'Transferencia de fondo de comercio',
    ],
  },
]

// Helper: dado un value de tipo_acto, devuelve la lista de causales
export function causalesDe(tipoActo: string | null | undefined): string[] {
  if (!tipoActo) return []
  return TIPOS_ACTO.find(t => t.value === tipoActo)?.causales ?? []
}

// Helper: label legible del tipo de acto
export function labelTipoActo(value: string | null | undefined): string {
  if (!value) return ''
  return TIPOS_ACTO.find(t => t.value === value)?.label ?? value
}
