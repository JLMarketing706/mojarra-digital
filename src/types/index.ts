// ============================================================
// MOJARRA DIGITAL — Tipos TypeScript
// Schema base + Fase 1 UIF (Res. 242/2023, 56/2024, 78/2025)
// ============================================================

// ─── ROLES ───────────────────────────────────────────────
export type Rol =
  // Roles UIF (Res. 242/2023)
  | 'escribano_titular'
  | 'oficial_cumplimiento'
  | 'escribano_adscripto'
  | 'empleado_admin'
  | 'auditor_externo'
  | 'cliente'
  // Roles legacy (compatibilidad)
  | 'secretaria'
  | 'protocolista'
  | 'escribano'

export const ROLES_STAFF: Rol[] = [
  'escribano_titular', 'oficial_cumplimiento', 'escribano_adscripto', 'empleado_admin',
  'secretaria', 'protocolista', 'escribano',
]

export const ROLES_APROBADORES: Rol[] = [
  'escribano_titular', 'oficial_cumplimiento', 'escribano', 'protocolista',
]

export interface Profile {
  id: string
  nombre: string
  apellido: string
  rol: Rol
  email: string
  telefono?: string
  avatar_url?: string
  activo: boolean
  created_at: string
}

// ─── CLIENTES ────────────────────────────────────────────
export type TipoPersona = 'humana' | 'juridica' | 'fideicomiso'
export type TipoDocumento = 'DNI' | 'CI' | 'Pasaporte'
export type Sexo = 'F' | 'M' | 'X'
export type NivelRiesgo = 'bajo' | 'medio' | 'alto'
export type TipoPEP = 'funcionario' | 'familiar' | 'allegado'
export type EstadoCivil = 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'union_convivencial'

export interface Cliente {
  id: string
  user_id?: string

  // Discriminador
  tipo_persona: TipoPersona

  // Identificación
  nombre: string
  apellido: string
  tipo_documento?: TipoDocumento
  dni?: string
  cuil?: string
  sexo?: Sexo
  fecha_nacimiento?: string
  lugar_nacimiento?: string
  nacionalidad?: string
  estado_civil?: EstadoCivil | string

  // Domicilio estructurado
  dom_calle?: string
  dom_numero?: string
  dom_piso?: string
  dom_localidad?: string
  dom_provincia?: string
  dom_codigo_postal?: string
  dom_pais?: string
  // Legacy
  domicilio?: string

  // Cónyuge
  conyuge_nombre?: string
  conyuge_dni?: string
  conyuge_es_pep?: boolean

  // Contacto
  email?: string
  telefono?: string

  // Perfil económico
  profesion?: string
  empleador?: string
  ingreso_mensual?: number
  patrimonio_aprox?: number

  // PEP
  es_pep: boolean
  tipo_pep?: TipoPEP
  cargo_pep?: string
  jurisdiccion_pep?: string
  periodo_pep_desde?: string
  periodo_pep_hasta?: string

  // Sujeto Obligado UIF
  es_sujeto_obligado: boolean
  uif_inscripcion_numero?: string
  uif_inscripcion_fecha?: string

  // Documentos KYC
  foto_dni_frente_url?: string
  foto_dni_dorso_url?: string
  selfie_kyc_url?: string

  // Riesgo y legajo
  nivel_riesgo?: NivelRiesgo
  fecha_alta_legajo?: string
  fecha_ultima_actualizacion?: string
  proxima_actualizacion?: string

  // Otros
  notas?: string
  created_at: string
}

// ─── CLIENTES JURÍDICOS ──────────────────────────────────
export type FormaJuridica =
  | 'SA' | 'SRL' | 'SAS' | 'SCS' | 'SCA'
  | 'Asoc.Civil' | 'Fundacion' | 'Cooperativa' | 'Mutual'
  | 'Fideicomiso' | 'Otra'

export interface ClienteJuridico {
  id: string
  cliente_id: string

  // Identificación
  razon_social: string
  nombre_fantasia?: string
  forma_juridica: FormaJuridica
  cuit: string
  fecha_constitucion?: string

  // Inscripción
  registro_publico?: string
  inscripcion_numero?: string
  inscripcion_fecha?: string

  // Capital y actividad
  capital_social?: number
  objeto_social?: string
  actividad_real?: string
  codigo_actividad?: string
  cantidad_empleados?: number
  facturacion_anual?: number
  patrimonio_neto?: number

  // Domicilios
  dom_legal_calle?: string
  dom_legal_numero?: string
  dom_legal_piso?: string
  dom_legal_localidad?: string
  dom_legal_provincia?: string
  dom_legal_pais?: string

  dom_real_calle?: string
  dom_real_numero?: string
  dom_real_piso?: string
  dom_real_localidad?: string
  dom_real_provincia?: string
  dom_real_pais?: string

  // Contacto
  telefono?: string
  email?: string
  sitio_web?: string
  cotiza_mercado?: boolean

  // Documentos
  estatuto_url?: string
  acta_designacion_url?: string
  certificado_vigencia_url?: string
  ultimo_balance_url?: string

  // Riesgo
  nivel_riesgo?: NivelRiesgo
  fecha_alta_legajo?: string
  fecha_ultima_actualizacion?: string
  proxima_actualizacion?: string

  created_at: string

  // Relaciones
  cliente?: Cliente
}

// ─── BENEFICIARIOS FINALES ───────────────────────────────
export type TipoControlBF = 'capital' | 'voto' | 'contrato' | 'otro'

export interface BeneficiarioFinal {
  id: string
  cliente_juridico_id?: string
  cliente_humano_id?: string
  pct_directa: number
  pct_indirecta: number
  pct_voto: number
  tipo_control?: TipoControlBF
  cadena_titularidad?: string
  organigrama_url?: string
  bf_es_pep: boolean
  ddjj_bf_url?: string
  ddjj_bf_fecha?: string
  sin_bf_administrador: boolean
  observaciones?: string
  created_at: string

  cliente_humano?: Cliente
  cliente_juridico?: ClienteJuridico
}

// ─── INMUEBLES ───────────────────────────────────────────
export type TipoInmueble =
  | 'Casa' | 'Departamento' | 'Lote' | 'LocalComercial' | 'Galpon' | 'Campo' | 'Otro'

export interface Inmueble {
  id: string
  tipo_inmueble?: TipoInmueble

  // Dirección
  calle?: string
  numero?: string
  piso_unidad?: string
  localidad?: string
  provincia?: string
  codigo_postal?: string

  // Catastro
  nomenclatura_catastral?: string
  matricula_registral?: string
  superficie_terreno?: number
  superficie_cubierta?: number

  // Valuaciones
  valuacion_fiscal?: number
  valuacion_catastral?: number

  // UIF
  zona_frontera: boolean
  zona_seguridad: boolean

  // Antecedentes
  antecedentes_dominiales?: string
  tiene_gravamenes: boolean
  detalle_gravamenes?: string

  // Documentos
  informe_dominio_url?: string
  cedula_catastral_url?: string

  created_at: string
}

// ─── TRÁMITES / OPERACIONES ──────────────────────────────
export type EstadoTramite = 'iniciado' | 'en_proceso' | 'en_registro' | 'listo' | 'entregado'

export type TipoActo =
  | 'compraventa_inmueble' | 'constitucion_sociedad' | 'cesion_cuotas'
  | 'fideicomiso' | 'hipoteca' | 'donacion' | 'mutuo' | 'otro'

export type FormaPago =
  | 'efectivo' | 'transferencia' | 'cheque' | 'mixto'
  | 'permuta' | 'credito_hipotecario' | 'otra'

export type EstadoUIF = 'no' | 'inusual' | 'en_analisis' | 'sospechosa' | 'reportada'
export type CumplimientoDD = 'si' | 'no' | 'pendiente'

export interface Tramite {
  id: string
  numero_referencia?: string
  tipo: string
  estado: EstadoTramite
  cliente_id: string
  escribano_id?: string
  descripcion?: string
  monto?: number
  notas_internas?: string

  // Datos de escritura
  numero_escritura?: string
  folio_protocolo?: string
  registro_notarial?: string
  fecha_escritura?: string

  // Acto y UIF
  tipo_acto?: TipoActo
  dispara_uif: boolean
  requiere_uif: boolean // legacy, en sync con dispara_uif

  // Pagos
  monto_efectivo: number
  monto_moneda_extranjera?: number
  moneda_extranjera?: string
  tipo_cambio?: number
  forma_pago?: FormaPago
  origen_fondos?: string

  // Relaciones
  inmueble_id?: string
  cliente_juridico_id?: string

  // Estado UIF
  estado_uif: EstadoUIF
  ros_constancia_numero?: string
  ros_fecha?: string
  cumplimiento_dd: CumplimientoDD
  aprobacion_oc?: 'si' | 'no' | 'pendiente'

  created_at: string
  updated_at: string

  // Relaciones cargadas
  cliente?: Cliente
  cliente_juridico?: ClienteJuridico
  inmueble?: Inmueble
  escribano?: Profile
  pagos?: OperacionPago[]
}

export interface TramiteHito {
  id: string
  tramite_id: string
  descripcion: string
  fecha: string
  creado_por?: string
}

// ─── PAGOS DE OPERACIÓN ──────────────────────────────────
export type MedioPago = 'efectivo' | 'transferencia' | 'cheque' | 'permuta' | 'credito'

export interface OperacionPago {
  id: string
  tramite_id: string
  importe: number
  medio: MedioPago
  banco?: string
  cbu?: string
  cuenta_titular?: string
  fecha_pago?: string
  observaciones?: string
  created_at: string
}

// ─── ÍNDICE NOTARIAL ─────────────────────────────────────
export interface IndiceNotarial {
  id: string
  numero_escritura: number
  folio?: string
  fecha: string
  tipo_acto: string
  partes: string
  inmueble?: string
  escribano_id?: string
  tramite_id?: string
  observaciones?: string
  created_at: string
  escribano?: Profile
}

// ─── DOCUMENTOS ──────────────────────────────────────────
export interface Documento {
  id: string
  tramite_id?: string
  cliente_id?: string
  nombre: string
  tipo?: string
  url: string
  subido_por?: string
  visible_cliente: boolean
  created_at: string
}

// ─── ALERTAS UIF ─────────────────────────────────────────
export type TipoAlertaUIF = 'monto_excedido' | 'pep_detectado' | 'sujeto_obligado' | string
export type EstadoAlerta = 'pendiente' | 'reportado' | 'archivado'

export interface AlertaUIF {
  id: string
  tramite_id: string
  tipo_alerta?: TipoAlertaUIF
  tipo?: string
  descripcion?: string
  estado: EstadoAlerta
  created_at: string
  tramite?: Tramite
}

// ─── SMVM Y UMBRALES ─────────────────────────────────────
export interface SMVMHistorico {
  id: string
  vigencia_desde: string
  valor: number
  norma_origen?: string
  created_at: string
}

export interface UmbralUIF {
  id: string
  codigo: string
  descripcion: string
  valor: number
  unidad: 'SMVM' | '%' | 'AÑOS' | 'HORAS' | 'DIAS' | string
  norma_origen?: string
  vigencia_desde: string
  vigencia_hasta?: string
  activo: boolean
}

// ─── TURNOS ──────────────────────────────────────────────
export type EstadoTurno = 'pendiente' | 'confirmado' | 'cancelado' | 'realizado'

export interface Turno {
  id: string
  cliente_id?: string
  responsable_id?: string
  fecha: string
  tipo?: string
  estado: EstadoTurno
  notas?: string
  created_at: string
  cliente?: Cliente
  responsable?: Profile
}

// ─── NOTIFICACIONES ──────────────────────────────────────
export interface Notificacion {
  id: string
  destinatario_id: string
  tramite_id?: string
  titulo: string
  mensaje: string
  leida: boolean
  created_at: string
}

// ─── ENTREGAS ────────────────────────────────────────────
export interface Entrega {
  id: string
  tramite_id: string
  fecha: string
  receptor_nombre: string
  receptor_dni: string
  observaciones?: string
  recibo_url?: string
  created_at: string
}

// ─── PRESUPUESTOS ────────────────────────────────────────
export interface Presupuesto {
  id: string
  nombre: string
  email: string
  telefono?: string
  tipo_tramite?: string
  descripcion?: string
  estado: 'nuevo' | 'en_revision' | 'enviado' | 'convertido'
  created_at: string
}

// ─── CONFIGURACIÓN ──────────────────────────────────────
export interface Configuracion {
  id: string
  clave: string
  valor: string
  descripcion?: string
}

// ─── HELPERS DE LABEL ────────────────────────────────────
export const LABEL_NIVEL_RIESGO: Record<NivelRiesgo, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
}

export const LABEL_TIPO_ACTO: Record<TipoActo, string> = {
  compraventa_inmueble: 'Compraventa de inmueble',
  constitucion_sociedad: 'Constitución de sociedad',
  cesion_cuotas: 'Cesión de cuotas',
  fideicomiso: 'Fideicomiso',
  hipoteca: 'Hipoteca',
  donacion: 'Donación',
  mutuo: 'Mutuo',
  otro: 'Otro',
}

export const LABEL_FORMA_PAGO: Record<FormaPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  mixto: 'Mixto',
  permuta: 'Permuta',
  credito_hipotecario: 'Crédito hipotecario',
  otra: 'Otra',
}

export const LABEL_ROL: Record<Rol, string> = {
  escribano_titular: 'Escribano titular',
  oficial_cumplimiento: 'Oficial de Cumplimiento',
  escribano_adscripto: 'Escribano adscripto',
  empleado_admin: 'Empleado administrativo',
  auditor_externo: 'Auditor externo',
  cliente: 'Cliente',
  secretaria: 'Secretaría',
  protocolista: 'Protocolista',
  escribano: 'Escribano',
}
