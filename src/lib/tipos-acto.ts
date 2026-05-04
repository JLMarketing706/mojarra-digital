// ──────────────────────────────────────────────────────────────
// Tipos de acto + negocios causales (modelo nuevo, multi-select)
// ──────────────────────────────────────────────────────────────
// La columna `tipo_acto` en tramites guarda el value (slug)
// La columna `negocios_causales` (text[]) guarda los strings exactos
// del label de cada causal seleccionada.

export type TipoActoValue = 'inmuebles' | 'personales' | 'societarios' | 'certificaciones' | 'gestion_registral'

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
      'Compraventa',
      'Compraventa parte indivisa',
      'Compraventa por tracto abreviado',
      'Permuta',
      'Donación',
      'Donación parte indivisa',
      'Donación por tracto abreviado',
      'Donación solidaria',
      'Dación en pago',
      'Transferencia de Dominio',
      'Adjudicación',
      'Testamento protocolizado',
      'Declaratoria de herederos protocolizada',
      'Leasing',
      'Reglamento de Copropiedad',
      'Usufructo',
      'Uso',
      'Habitación',
      'Afectación protección de la vivienda',
      'Hipoteca',
      'Hipoteca por tracto abreviado',
      'Cancelación de hipoteca',
      'Desafectación protección de la vivienda',
      'Desafectación propiedad horizontal',
      'Hipoteca por saldo',
      'Cesión de derechos hereditarios',
      'Aceptación',
      'Ulterior testimonio',
      'Subasta',
      'División de condominio',
    ],
  },
  {
    value: 'personales',
    label: 'Actos personales y de familia',
    causales: [
      'Poder general',
      'Poder especial',
      'Autorización de viaje para menor',
      'Testamento',
      'Autorización para conducir vehículo',
      'Certificación de unión convivencial',
      'Venia matrimonial',
    ],
  },
  {
    value: 'societarios',
    label: 'Actos societarios y comerciales',
    causales: [
      'Constitución de sociedad (SA)',
      'Constitución de sociedad (SRL)',
      'Constitución de sociedad (SAS)',
      'Constitución de sociedad (otra)',
      'Transferencia de fondo de comercio',
      'Acta de asamblea',
      'Acta de directorio',
      'Contrato de alquiler (certificación)',
      'Cesión de cuotas sociales',
    ],
  },
  {
    value: 'certificaciones',
    label: 'Certificaciones y actas',
    causales: [
      'Certificación de firmas',
      'Certificación de fotocopias',
      'Acta de constatación',
      'Acta de notificación',
      'Protocolización de documentos',
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
