/**
 * Determina qué documentos son obligatorios para un trámite/cliente
 * según normativa UIF (Res. 242/2023, 56/2024, 78/2025).
 */

export interface DocRequerido {
  categoria: string
  label: string
  motivo: string
  critico: boolean
}

interface ContextoCliente {
  es_pep?: boolean | null
  es_sujeto_obligado?: boolean | null
  tipo_persona?: string | null
}

interface ContextoTramite {
  tipo?: string | null
  monto?: number | null
  monto_efectivo?: number | null
  dispara_uif?: boolean | null
  requiere_uif?: boolean | null
  forma_pago?: string | null
}

export function calcularDocsRequeridos(
  tramite: ContextoTramite,
  cliente: ContextoCliente | null,
  smvm: number = 308200,
): DocRequerido[] {
  const reqs: DocRequerido[] = []
  const tipo = (tramite.tipo ?? '').toLowerCase()
  const monto = Number(tramite.monto ?? 0)
  const efectivo = Number(tramite.monto_efectivo ?? 0)

  // RENAPER: identificación de persona humana, siempre
  if (cliente && cliente.tipo_persona !== 'juridica') {
    reqs.push({
      categoria: 'renaper',
      label: 'Consulta RENAPER',
      motivo: 'Identificación de persona humana',
      critico: true,
    })
  }

  // REPET: para PEP o cuando el monto excede umbrales
  if (cliente?.es_pep) {
    reqs.push({
      categoria: 'repet',
      label: 'Consulta REPET',
      motivo: 'Cliente marcado como PEP',
      critico: true,
    })
    reqs.push({
      categoria: 'pep',
      label: 'DDJJ PEP firmada',
      motivo: 'Cliente marcado como PEP',
      critico: true,
    })
  }

  // NOSIS: compraventa > 700 SMVM, fideicomiso, cesión cuotas
  const umbral700 = smvm * 700
  const requiereNosis =
    (tipo.includes('compraventa') && monto > umbral700) ||
    tipo.includes('fideicomiso') ||
    tipo.includes('cesion') ||
    tipo.includes('cesión')
  if (requiereNosis) {
    reqs.push({
      categoria: 'nosis',
      label: 'Informe NOSIS / antecedentes patrimoniales',
      motivo: tipo.includes('compraventa')
        ? `Compraventa supera 700 SMVM ($${umbral700.toLocaleString('es-AR')})`
        : 'Fideicomiso / cesión de cuotas',
      critico: true,
    })
  }

  // DDJJ origen de fondos: compraventa > 700 SMVM o efectivo > 750 SMVM
  const umbral750 = smvm * 750
  if (
    (tipo.includes('compraventa') && monto > umbral700) ||
    efectivo > umbral750 ||
    tramite.dispara_uif
  ) {
    reqs.push({
      categoria: 'origen_fondos',
      label: 'DDJJ origen y licitud de fondos',
      motivo: efectivo > umbral750
        ? `Efectivo supera 750 SMVM ($${umbral750.toLocaleString('es-AR')})`
        : 'Operación supera umbrales UIF',
      critico: true,
    })
  }

  // Sujeto obligado
  if (cliente?.es_sujeto_obligado) {
    reqs.push({
      categoria: 'sujeto_obligado',
      label: 'DDJJ Sujeto Obligado UIF',
      motivo: 'Cliente marcado como Sujeto Obligado',
      critico: true,
    })
  }

  // Beneficiario final para personas jurídicas
  if (cliente?.tipo_persona === 'juridica') {
    reqs.push({
      categoria: 'beneficiario_final',
      label: 'DDJJ Beneficiario Final',
      motivo: 'Persona jurídica',
      critico: true,
    })
  }

  return reqs
}

/**
 * Cruza requerimientos contra documentos cargados.
 * Un doc se considera presente si su `categoria` coincide.
 */
export function detectarFaltantes(
  requeridos: DocRequerido[],
  documentos: { categoria?: string | null; tipo?: string | null }[],
): DocRequerido[] {
  const presentes = new Set(
    documentos
      .map(d => (d.categoria ?? d.tipo ?? '').toLowerCase())
      .filter(Boolean),
  )
  return requeridos.filter(r => !presentes.has(r.categoria.toLowerCase()))
}
