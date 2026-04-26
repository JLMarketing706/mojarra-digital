export type Rol = 'secretaria' | 'protocolista' | 'escribano' | 'cliente'

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

export interface Cliente {
  id: string
  user_id?: string
  nombre: string
  apellido: string
  dni?: string
  cuil?: string
  estado_civil?: string
  domicilio?: string
  email?: string
  telefono?: string
  es_pep: boolean
  es_sujeto_obligado: boolean
  notas?: string
  created_at: string
}

export type EstadoTramite = 'iniciado' | 'en_proceso' | 'en_registro' | 'listo' | 'entregado'

export interface Tramite {
  id: string
  numero_referencia?: string
  tipo: string
  estado: EstadoTramite
  cliente_id: string
  escribano_id?: string
  descripcion?: string
  monto?: number
  requiere_uif: boolean
  notas_internas?: string
  created_at: string
  updated_at: string
  cliente?: Cliente
  escribano?: Profile
}

export interface TramiteHito {
  id: string
  tramite_id: string
  descripcion: string
  fecha: string
  creado_por?: string
}

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

export type TipoAlertaUIF = 'monto_excedido' | 'pep_detectado' | 'sujeto_obligado'
export type EstadoAlerta = 'pendiente' | 'reportado' | 'archivado'

export interface AlertaUIF {
  id: string
  tramite_id: string
  tipo_alerta: TipoAlertaUIF
  descripcion?: string
  estado: EstadoAlerta
  created_at: string
  tramite?: Tramite
}

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

export interface Notificacion {
  id: string
  destinatario_id: string
  tramite_id?: string
  titulo: string
  mensaje: string
  leida: boolean
  created_at: string
}

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

export interface Configuracion {
  id: string
  clave: string
  valor: string
  descripcion?: string
}
