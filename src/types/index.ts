// ============================================================
// MOJARRA DIGITAL — Tipos TypeScript
// Schema base + Fase 1 UIF (Res. 242/2023, 56/2024, 78/2025)
// ============================================================

// ─── ROLES ───────────────────────────────────────────────
export type Rol =
  // Roles UIF (Res. 242/2023)
  | 'escribano_titular'
  | 'escribano_adscripto'
  | 'escribano_subrogante'
  | 'escribano_interino'
  | 'oficial_cumplimiento'
  | 'empleado_admin'
  | 'auditor_externo'
  | 'cliente'
  // Roles legacy (compatibilidad)
  | 'secretaria'
  | 'protocolista'
  | 'escribano'

export const ROLES_STAFF: Rol[] = [
  'escribano_titular', 'escribano_adscripto', 'escribano_subrogante', 'escribano_interino',
  'oficial_cumplimiento', 'empleado_admin',
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

  // Multi-tenancy + licencias
  escribania_id?: string
  desactivado_at?: string
  desactivado_por?: string
  desactivacion_motivo?: string
  reactivacion_programada?: string
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

  // Padres (relevante para solteros)
  nombre_padre?: string
  nombre_madre?: string

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
  tipo_acto?: TipoActo // categoría UIF (no confundir con tipo_acto_notarial)
  tipo_acto_notarial?: 'inmuebles' | 'personales' | 'societarios' | 'gestion_registral'
  negocios_causales?: string[]
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
export type CategoriaDoc =
  | 'identificacion'
  | 'estado_civil'
  | 'pep'
  | 'sujeto_obligado'
  | 'origen_fondos'
  | 'inmueble'
  | 'sociedad'
  | 'poder'
  | 'beneficiario_final'
  | 'renaper'
  | 'repet'
  | 'nosis'
  | 'ddjj_uif'
  | 'otros'

export interface Documento {
  id: string
  tramite_id?: string
  cliente_id?: string
  nombre: string
  tipo?: string
  url: string
  storage_path?: string
  mime_type?: string
  tamano_bytes?: number

  // Categorización UIF
  categoria?: CategoriaDoc
  subcategoria?: string
  campo_valida?: string

  // Vigencia
  fecha_emision?: string
  fecha_vencimiento?: string

  // Verificación
  verificado: boolean
  verificado_por?: string
  verificado_at?: string
  observaciones?: string

  // Otros
  declaracion_jurada_id?: string
  subido_por?: string
  visible_cliente: boolean
  created_at: string
}

export const LABEL_CATEGORIA_DOC: Record<CategoriaDoc, string> = {
  identificacion: 'Identificación',
  estado_civil: 'Estado civil',
  pep: 'PEP',
  sujeto_obligado: 'Sujeto Obligado',
  origen_fondos: 'Origen de fondos',
  inmueble: 'Inmueble',
  sociedad: 'Sociedad',
  poder: 'Poder',
  beneficiario_final: 'Beneficiario Final',
  renaper: 'Consulta RENAPER',
  repet: 'Consulta REPET',
  nosis: 'Informe NOSIS',
  ddjj_uif: 'DJ UIF firmada',
  otros: 'Otros',
}

// Subcategorías sugeridas por categoría
export const SUBCATEGORIAS_DOC: Record<CategoriaDoc, { v: string; label: string }[]> = {
  identificacion: [
    { v: 'dni_frente', label: 'DNI frente' },
    { v: 'dni_dorso', label: 'DNI dorso' },
    { v: 'pasaporte', label: 'Pasaporte' },
    { v: 'cedula', label: 'Cédula' },
    { v: 'selfie_kyc', label: 'Selfie KYC' },
    { v: 'cuit_constancia', label: 'Constancia CUIT/CUIL' },
  ],
  estado_civil: [
    { v: 'acta_matrimonio', label: 'Acta de matrimonio' },
    { v: 'sentencia_divorcio', label: 'Sentencia de divorcio' },
    { v: 'acta_defuncion_conyuge', label: 'Acta defunción del cónyuge' },
    { v: 'declaracion_union_convivencial', label: 'Declaración unión convivencial' },
  ],
  pep: [
    { v: 'ddjj_pep', label: 'DDJJ PEP firmada' },
    { v: 'designacion_cargo', label: 'Designación / acta cargo' },
  ],
  sujeto_obligado: [
    { v: 'constancia_uif', label: 'Constancia inscripción UIF' },
    { v: 'ddjj_so', label: 'DDJJ Sujeto Obligado' },
  ],
  origen_fondos: [
    { v: 'escritura_previa', label: 'Escritura de venta anterior' },
    { v: 'constancia_bancaria', label: 'Resumen / constancia bancaria' },
    { v: 'recibo_sueldo', label: 'Recibo de sueldo / constancia laboral' },
    { v: 'declaratoria_herederos', label: 'Declaratoria / partición' },
    { v: 'mutuo', label: 'Mutuo / contrato de préstamo' },
    { v: 'venta_acciones', label: 'Constancia venta de acciones / títulos' },
    { v: 'ddjj_origen_fondos', label: 'DDJJ origen y licitud de fondos' },
  ],
  inmueble: [
    { v: 'informe_dominio', label: 'Informe de dominio' },
    { v: 'cedula_catastral', label: 'Cédula catastral' },
    { v: 'libre_deuda', label: 'Certificado libre deuda' },
    { v: 'plano_mensura', label: 'Plano de mensura' },
    { v: 'titulo_propiedad', label: 'Título de propiedad' },
  ],
  sociedad: [
    { v: 'estatuto', label: 'Estatuto / contrato social' },
    { v: 'acta_designacion', label: 'Acta de designación de autoridades' },
    { v: 'certificado_vigencia', label: 'Certificado registral de vigencia' },
    { v: 'balance', label: 'Estado contable / balance' },
  ],
  poder: [
    { v: 'poder_general', label: 'Poder general' },
    { v: 'poder_especial', label: 'Poder especial' },
    { v: 'certif_vigencia_poder', label: 'Certificado de vigencia del poder' },
  ],
  beneficiario_final: [
    { v: 'ddjj_bf', label: 'DDJJ Beneficiario Final' },
    { v: 'organigrama', label: 'Organigrama / cadena de titularidad' },
  ],
  renaper: [
    { v: 'consulta_pdf', label: 'Consulta (PDF)' },
    { v: 'consulta_captura', label: 'Captura de pantalla' },
  ],
  repet: [
    { v: 'busqueda_persona', label: 'Búsqueda persona física' },
    { v: 'busqueda_entidad', label: 'Búsqueda entidad' },
    { v: 'sin_coincidencias', label: 'Constancia sin coincidencias' },
  ],
  nosis: [
    { v: 'informe_basico', label: 'Informe básico' },
    { v: 'informe_completo', label: 'Informe completo' },
  ],
  ddjj_uif: [
    { v: 'completa', label: 'DJ completa firmada' },
    { v: 'pep', label: 'DJ PEP firmada' },
    { v: 'sujeto_obligado', label: 'DJ Sujeto Obligado firmada' },
    { v: 'origen_fondos', label: 'DJ origen de fondos firmada' },
  ],
  otros: [
    { v: 'consentimiento_datos', label: 'Consentimiento Ley 25.326' },
    { v: 'otro', label: 'Otro' },
  ],
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

// ─── DECLARACIONES JURADAS (FASE 2) ──────────────────────
export type TipoDDJJ =
  | 'pep'
  | 'sujeto_obligado'
  | 'origen_fondos'
  | 'beneficiario_final'
  | 'domicilio'
  | 'datos_personales'
  | 'gafi'
  | 'situacion_fiscal'

export type MetodoFirma = 'digital' | 'fisica' | 'electronica'

export interface DeclaracionJurada {
  id: string
  tipo: TipoDDJJ
  cliente_id?: string
  cliente_juridico_id?: string
  tramite_id?: string
  beneficiario_final_id?: string
  contenido?: Record<string, unknown>
  pdf_url?: string
  firmada: boolean
  fecha_firma?: string
  metodo_firma?: MetodoFirma
  ip_firma?: string
  vigente: boolean
  fecha_emision: string
  fecha_vencimiento?: string
  emitido_por?: string
  observaciones?: string
  created_at: string

  cliente?: Cliente
  cliente_juridico?: ClienteJuridico
  tramite?: Tramite
}

export const LABEL_DDJJ: Record<TipoDDJJ, string> = {
  pep: 'Persona Expuesta Políticamente',
  sujeto_obligado: 'Sujeto Obligado UIF',
  origen_fondos: 'Origen y licitud de fondos',
  beneficiario_final: 'Beneficiario Final',
  domicilio: 'Declaración de domicilio',
  datos_personales: 'Consentimiento Datos Personales (Ley 25.326)',
  gafi: 'No estar en listas GAFI',
  situacion_fiscal: 'Situación fiscal',
}

// ─── ROS — REPORTES DE OPERACIÓN SOSPECHOSA (FASE 2) ─────
export type TipoROS = 'LA' | 'FT' | 'FP'
export type EstadoROS = 'inusual' | 'en_analisis' | 'sospechosa' | 'reportada' | 'descartada'

export interface ROS {
  id: string
  tramite_id: string
  tipo: TipoROS
  estado: EstadoROS
  motivos_inusualidad?: string
  analisis_oc?: string
  hechos_sospechosos?: string
  fecha_deteccion: string
  fecha_conclusion_sospecha?: string
  fecha_limite_reporte?: string
  fecha_reportado?: string
  numero_constancia?: string
  acuse_url?: string
  operacion_concretada: boolean
  detectado_por?: string
  reportado_por?: string
  created_at: string
  updated_at: string

  tramite?: Tramite
}

export const LABEL_TIPO_ROS: Record<TipoROS, string> = {
  LA: 'Lavado de Activos',
  FT: 'Financiamiento del Terrorismo',
  FP: 'Financiamiento de la Proliferación',
}

export const LABEL_ESTADO_ROS: Record<EstadoROS, string> = {
  inusual: 'Inusual (en revisión)',
  en_analisis: 'En análisis del OC',
  sospechosa: 'Sospechosa (a reportar)',
  reportada: 'Reportada a UIF',
  descartada: 'Descartada',
}

// ─── AUTOEVALUACIÓN ANUAL (RSA — FASE 2) ─────────────────
export type EstadoAutoevaluacion = 'borrador' | 'cerrado' | 'presentado'

export interface AutoevaluacionRiesgo {
  id: string
  anio: number
  total_clientes: number
  clientes_riesgo_alto: number
  clientes_riesgo_medio: number
  clientes_riesgo_bajo: number
  total_operaciones: number
  operaciones_uif: number
  total_pep: number
  total_bf_identificados: number
  total_ros: number
  total_ros_la: number
  total_ros_ft: number
  total_ros_fp: number
  metodologia?: string
  riesgos_identificados?: string
  controles_aplicados?: string
  plan_mitigacion?: string
  conclusiones?: string
  estado: EstadoAutoevaluacion
  fecha_cierre?: string
  fecha_presentacion?: string
  numero_constancia?: string
  informe_pdf_url?: string
  acuse_url?: string
  preparado_por?: string
  firmado_por?: string
  created_at: string
  updated_at: string
}

// ─── CAPACITACIONES (FASE 2) ─────────────────────────────
export type ModalidadCapacitacion = 'presencial' | 'virtual' | 'mixta'

export interface Capacitacion {
  id: string
  fecha: string
  titulo: string
  contenido?: string
  instructor?: string
  duracion_horas?: number
  modalidad?: ModalidadCapacitacion
  norma_origen?: string
  constancia_url?: string
  created_at: string
}

export interface CapacitacionAsistente {
  id: string
  capacitacion_id: string
  profile_id: string
  asistio: boolean
  evaluacion_aprobada?: boolean
  observaciones?: string
  created_at: string

  profile?: Profile
}

// ─── MANUAL DE PROCEDIMIENTOS (FASE 3) ───────────────────
export interface ManualProcedimientos {
  id: string
  version: string
  titulo: string
  contenido: string
  resumen_cambios?: string
  vigente: boolean
  fecha_vigencia?: string
  pdf_url?: string
  aprobado_por?: string
  fecha_aprobacion?: string
  created_by?: string
  created_at: string
}

export interface ManualAcuse {
  id: string
  manual_id: string
  profile_id: string
  fecha_acuse: string
  ip_acuse?: string
  observaciones?: string
  profile?: Profile
}

// ─── REVISIONES EXTERNAS (FASE 3) ────────────────────────
export type EstadoRevision = 'pendiente' | 'en_proceso' | 'completada' | 'archivada'

export interface RevisionExterna {
  id: string
  fecha: string
  revisor_nombre: string
  revisor_matricula?: string
  revisor_email?: string
  alcance?: string
  hallazgos?: string
  plan_accion?: string
  estado: EstadoRevision
  informe_url?: string
  acta_url?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// ─── SCREENING DE LISTAS (FASE 3) ────────────────────────
export type OrigenLista = 'PEP_AR' | 'OFAC' | 'ONU' | 'UE' | 'GAFI' | 'INTERPOL' | 'OTRO'
export type EstadoScreening = 'pendiente' | 'confirmado' | 'descartado'

export interface ListaSancion {
  id: string
  origen: OrigenLista
  nombre_completo: string
  alias?: string
  documento?: string
  pais?: string
  fecha_nacimiento?: string
  cargo?: string
  motivo?: string
  fecha_inclusion?: string
  observaciones?: string
  vigente: boolean
  created_at: string
}

export interface ScreeningResultado {
  id: string
  cliente_id?: string
  cliente_juridico_id?: string
  lista_id: string
  similitud: number
  motivo_match?: string
  estado: EstadoScreening
  observaciones?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  cliente?: Cliente
  lista?: ListaSancion
}

export const LABEL_LISTA: Record<OrigenLista, string> = {
  PEP_AR: 'PEP Argentina',
  OFAC: 'OFAC (USA)',
  ONU: 'ONU',
  UE: 'Unión Europea',
  GAFI: 'GAFI',
  INTERPOL: 'Interpol',
  OTRO: 'Otra',
}

// ─── AUDIT LOGS (FASE 3) ─────────────────────────────────
export interface AuditLog {
  id: string
  ts: string
  actor_id?: string
  actor_email?: string
  accion: string
  tabla: string
  registro_id?: string
  cambios?: Record<string, unknown>
  ip?: string
  user_agent?: string
  escribania_id?: string
}

// ─── MULTI-TENANCY (FASE 6) ──────────────────────────────
export type PlanEscribania = 'trial' | 'basico' | 'profesional' | 'estudio'
export type EstadoEscribania = 'trial' | 'activa' | 'suspendida' | 'cancelada'

export interface Escribania {
  id: string
  razon_social: string
  nombre_fantasia?: string
  cuit?: string
  matricula?: string
  registro_notarial?: string
  jurisdiccion?: string

  dom_calle?: string
  dom_numero?: string
  dom_piso?: string
  dom_localidad?: string
  dom_provincia?: string
  dom_codigo_postal?: string
  dom_pais?: string

  telefono?: string
  email?: string
  sitio_web?: string

  plan: PlanEscribania
  estado: EstadoEscribania
  max_usuarios: number
  trial_until?: string

  soporte_habilitado_until?: string
  soporte_habilitado_por?: string

  created_at: string
  updated_at: string
}

export const LABEL_PLAN: Record<PlanEscribania, string> = {
  trial: 'Trial (7 días)',
  basico: 'Básico',
  profesional: 'Profesional',
  estudio: 'Estudio',
}

export const LABEL_ESTADO_ESCRIBANIA: Record<EstadoEscribania, string> = {
  trial: 'En prueba',
  activa: 'Activa',
  suspendida: 'Suspendida',
  cancelada: 'Cancelada',
}

export type RolInvitable =
  | 'escribano_titular'
  | 'escribano_adscripto'
  | 'escribano_subrogante'
  | 'escribano_interino'
  | 'oficial_cumplimiento'
  | 'empleado_admin'

export interface Invitacion {
  id: string
  escribania_id: string
  email: string
  rol: RolInvitable
  token: string
  mensaje?: string
  expira_at: string
  aceptada_at?: string
  aceptada_por?: string
  cancelada_at?: string
  invitado_por: string
  created_at: string
  escribania?: Escribania
  invitador?: Profile
}

export const LABEL_ROL_INVITABLE: Record<RolInvitable, string> = {
  escribano_titular: 'Escribano titular',
  escribano_adscripto: 'Escribano adscripto',
  escribano_subrogante: 'Escribano subrogante',
  escribano_interino: 'Escribano interino',
  oficial_cumplimiento: 'Oficial de Cumplimiento',
  empleado_admin: 'Empleado administrativo',
}

// Roles que se consideran "escribanos" (cuentan contra el límite de 5 por escribanía)
export const ROLES_ESCRIBANO: RolInvitable[] = [
  'escribano_titular', 'escribano_adscripto', 'escribano_subrogante', 'escribano_interino',
]
export const MAX_ESCRIBANOS_POR_ESCRIBANIA = 5

export interface SuperAdmin {
  profile_id: string
  notas?: string
  created_at: string
}

// ─── HELPERS DE LABEL ────────────────────────────────────
export const LABEL_NIVEL_RIESGO: Record<NivelRiesgo, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
}

export const LABEL_TIPO_ACTO: Record<TipoActo, string> = {
  compraventa_inmueble: 'Compraventa',
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
  escribano_adscripto: 'Escribano adscripto',
  escribano_subrogante: 'Escribano subrogante',
  escribano_interino: 'Escribano interino',
  oficial_cumplimiento: 'Oficial de Cumplimiento',
  empleado_admin: 'Empleado administrativo',
  auditor_externo: 'Auditor externo',
  cliente: 'Cliente',
  secretaria: 'Secretaría',
  protocolista: 'Protocolista',
  escribano: 'Escribano',
}
