/**
 * Determina qué documentos son obligatorios para una operación/cliente
 * según normativa UIF (Res. 242/2023, 56/2024, 78/2025).
 *
 * Soporta múltiples clientes (compraventa con varios compradores y
 * vendedores) — los requerimientos por cliente (RENAPER, REPET, DDJJ
 * PEP/SO/BF) se calculan por cada uno y traen el nombre del cliente
 * en el motivo para que el alert diga claramente A QUIÉN le falta.
 */

export interface DocRequerido {
  /** Categoría que matchea contra documentos.categoria de la DB */
  categoria: string
  /** Label legible del documento */
  label: string
  /** Por qué se requiere */
  motivo: string
  critico: boolean
  /**
   * Si el requerimiento es por un cliente puntual, este es su id+nombre.
   * Si es de la operación en general (NOSIS, DDJJ origen fondos), null.
   */
  cliente?: {
    id: string
    nombre: string
    apellido: string
  } | null
}

export interface ContextoCliente {
  id: string
  nombre: string
  apellido: string
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

function fullName(c: ContextoCliente): string {
  return `${c.apellido}, ${c.nombre}`
}

/**
 * Calcula los documentos requeridos para una operación con uno o
 * más clientes. Cada doc viene con `cliente` cuando aplica a una
 * persona puntual; los docs de la operación (NOSIS, DDJJ origen
 * de fondos) no tienen cliente asociado.
 */
export function calcularDocsRequeridos(
  tramite: ContextoTramite,
  clientes: ContextoCliente[],
  smvm: number = 308200,
): DocRequerido[] {
  const reqs: DocRequerido[] = []
  const tipo = (tramite.tipo ?? '').toLowerCase()
  const monto = Number(tramite.monto ?? 0)
  const efectivo = Number(tramite.monto_efectivo ?? 0)

  // ──────── Requerimientos POR CLIENTE ────────
  for (const c of clientes) {
    const nombre = fullName(c)

    // RENAPER: identificación de persona humana, siempre
    if (c.tipo_persona !== 'juridica') {
      reqs.push({
        categoria: `renaper:${c.id}`,
        label: `Consulta RENAPER — ${nombre}`,
        motivo: 'Identificación de persona humana',
        critico: true,
        cliente: { id: c.id, nombre: c.nombre, apellido: c.apellido },
      })
    }

    // REPET + DDJJ PEP: si está marcado como PEP
    if (c.es_pep) {
      reqs.push({
        categoria: `repet:${c.id}`,
        label: `Consulta REPET — ${nombre}`,
        motivo: 'Cliente marcado como PEP',
        critico: true,
        cliente: { id: c.id, nombre: c.nombre, apellido: c.apellido },
      })
      reqs.push({
        categoria: `pep:${c.id}`,
        label: `DDJJ PEP firmada — ${nombre}`,
        motivo: 'Cliente marcado como PEP',
        critico: true,
        cliente: { id: c.id, nombre: c.nombre, apellido: c.apellido },
      })
    }

    // Sujeto obligado
    if (c.es_sujeto_obligado) {
      reqs.push({
        categoria: `sujeto_obligado:${c.id}`,
        label: `DDJJ Sujeto Obligado UIF — ${nombre}`,
        motivo: 'Cliente marcado como Sujeto Obligado',
        critico: true,
        cliente: { id: c.id, nombre: c.nombre, apellido: c.apellido },
      })
    }

    // Beneficiario final para personas jurídicas
    if (c.tipo_persona === 'juridica') {
      reqs.push({
        categoria: `beneficiario_final:${c.id}`,
        label: `DDJJ Beneficiario Final — ${nombre}`,
        motivo: 'Persona jurídica',
        critico: true,
        cliente: { id: c.id, nombre: c.nombre, apellido: c.apellido },
      })
    }
  }

  // ──────── Requerimientos DE LA OPERACIÓN (no por cliente) ────────
  const umbral700 = smvm * 700
  const umbral750 = smvm * 750

  // NOSIS: compraventa > 700 SMVM, fideicomiso, cesión cuotas
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
      cliente: null,
    })
  }

  // DDJJ origen de fondos: compraventa > 700 SMVM, efectivo > 750 SMVM, o dispara UIF
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
      cliente: null,
    })
  }

  return reqs
}

/**
 * Cruza requerimientos contra documentos cargados.
 *
 * Para requeridos POR CLIENTE (categoria='renaper:xxx', etc), considera
 * presente un documento que tenga la misma categoría base (sin el sufijo).
 * Esto preserva compatibilidad con docs cargados antes del refactor.
 *
 * Mejora futura: que los docs en la DB también tengan cliente_id para
 * trackear con precisión cuál cliente tiene cada doc.
 */
export function detectarFaltantes(
  requeridos: DocRequerido[],
  documentos: {
    categoria?: string | null
    tipo?: string | null
    cliente_id?: string | null
  }[],
): DocRequerido[] {
  return requeridos.filter(req => {
    // Si el req es por cliente, buscar doc con esa categoría base que
    // matchee con cliente_id, o categoría base sin cliente_id (legacy).
    if (req.cliente) {
      const baseCat = req.categoria.split(':')[0].toLowerCase()
      return !documentos.some(d => {
        const docCat = (d.categoria ?? d.tipo ?? '').toLowerCase()
        if (docCat !== baseCat) return false
        // Si el doc tiene cliente_id, exige que matchee
        if (d.cliente_id != null) return d.cliente_id === req.cliente?.id
        // Legacy: doc sin cliente_id se acepta como genérico
        return true
      })
    }
    // Reqs genéricos (NOSIS, DDJJ): match directo por categoría
    const present = new Set(
      documentos.map(d => (d.categoria ?? d.tipo ?? '').toLowerCase()).filter(Boolean),
    )
    return !present.has(req.categoria.toLowerCase())
  })
}
