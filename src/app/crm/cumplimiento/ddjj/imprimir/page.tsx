'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { LABEL_DDJJ } from '@/types'
import type { TipoDDJJ } from '@/types'

const TEMPLATES: Record<TipoDDJJ, { titulo: string; cuerpo: string }> = {
  pep: {
    titulo: 'DECLARACIÓN JURADA — PERSONA EXPUESTA POLÍTICAMENTE (PEP)',
    cuerpo: `En cumplimiento de lo dispuesto por la Resolución UIF N° 35/2023 y normativa concordante, el/la suscripto/a declara bajo juramento:

☐ NO ser ni haber sido en los últimos 2 años Persona Expuesta Políticamente (PEP) conforme las definiciones del art. 1° de la Res. UIF 35/2023.

☐ SÍ revestir/haber revestido tal calidad, indicando:
   • Cargo desempeñado: ______________________________________
   • Organismo: ______________________________________________
   • Período: ____/____/____ al ____/____/____

Asimismo declara que ningún familiar directo (hasta segundo grado de consanguinidad o afinidad) ni allegado cercano se encuentra alcanzado por dicha categoría, salvo:

________________________________________________________________

El/la declarante asume la obligación de comunicar cualquier modificación dentro de los 30 días corridos de producida.`,
  },
  sujeto_obligado: {
    titulo: 'DECLARACIÓN JURADA — SUJETO OBLIGADO UIF',
    cuerpo: `Conforme art. 20 de la Ley 25.246 y modificatorias, el/la declarante manifiesta bajo juramento:

☐ NO ser Sujeto Obligado ante la Unidad de Información Financiera.

☐ SÍ ser Sujeto Obligado, encuadrado en el inciso ____ del art. 20 (especificar):
   ________________________________________________________________

   N° CUIT registrado ante UIF: __________________________________
   Oficial de Cumplimiento: ______________________________________`,
  },
  origen_fondos: {
    titulo: 'DECLARACIÓN JURADA — ORIGEN Y LICITUD DE FONDOS',
    cuerpo: `El/la suscripto/a declara bajo juramento que los fondos involucrados en la presente operación, por un monto total de $ ________________ (pesos / dólares estadounidenses / otra moneda: ________), provienen de actividades lícitas y de las siguientes fuentes:

☐ Ingresos por trabajo en relación de dependencia
☐ Ingresos por actividad profesional / comercial autónoma
☐ Producido de venta de inmuebles / vehículos / acciones
☐ Herencia / donación / legado
☐ Préstamo bancario o de tercero (adjuntar comprobante)
☐ Ahorros previos
☐ Otros: __________________________________________________

Documentación respaldatoria adjunta: ____________________________

Se compromete a exhibir la documentación que respalde los fondos cuando le sea requerida por el escribano interviniente o autoridad competente.`,
  },
  beneficiario_final: {
    titulo: 'DECLARACIÓN JURADA — BENEFICIARIO/S FINAL/ES',
    cuerpo: `Conforme Res. UIF 112/2021, el/la representante legal de la persona jurídica __________________________________________ (CUIT __________________) declara bajo juramento que el/los beneficiario/s final/es de la entidad es/son:

1) Nombre y apellido: ________________________________________________
   DNI / Pasaporte: __________________  Nacionalidad: ______________
   % participación / control: __________  Tipo de control: __________

2) Nombre y apellido: ________________________________________________
   DNI / Pasaporte: __________________  Nacionalidad: ______________
   % participación / control: __________  Tipo de control: __________

3) Nombre y apellido: ________________________________________________
   DNI / Pasaporte: __________________  Nacionalidad: ______________
   % participación / control: __________  Tipo de control: __________

Se entiende por beneficiario final a la/s persona/s humana/s que posea/n como mínimo el 10% del capital o derechos de voto, o que por otros medios ejerza/n control final directo o indirecto.`,
  },
  domicilio: {
    titulo: 'DECLARACIÓN JURADA DE DOMICILIO REAL',
    cuerpo: `El/la suscripto/a declara bajo juramento que su domicilio real es:

Calle: __________________________________________________________
Número: __________  Piso: ______  Depto: ______
Localidad / Ciudad: ______________________________________________
Provincia: _______________________  Código Postal: ____________
País: ____________________________________________________________

Documentación respaldatoria (DNI, factura de servicio, contrato de locación, etc.): ________________________________________________

Se compromete a comunicar cualquier cambio dentro de los 30 días corridos.`,
  },
  datos_personales: {
    titulo: 'CONSENTIMIENTO TRATAMIENTO DE DATOS PERSONALES (Ley 25.326)',
    cuerpo: `El/la suscripto/a presta su consentimiento libre, expreso e informado para el tratamiento de sus datos personales por parte de la Escribanía, conforme art. 5° de la Ley 25.326 de Protección de Datos Personales.

Finalidad: cumplimiento de obligaciones notariales, registrales, fiscales, UIF y de prevención de lavado de activos.

Conservación: por el plazo legal aplicable (mínimo 10 años para registros UIF).

Derechos: el titular podrá ejercer en cualquier momento los derechos de acceso, rectificación, actualización y supresión, dirigiéndose por escrito a la Escribanía.

Cesión a terceros: solo a organismos públicos competentes (UIF, AFIP, Registros) cuando la normativa así lo exija.

☐ Acepto              ☐ No acepto`,
  },
  gafi: {
    titulo: 'DECLARACIÓN JURADA — LISTAS GAFI / SANCIONES INTERNACIONALES',
    cuerpo: `El/la suscripto/a declara bajo juramento NO encontrarse incluido/a en:

☐ Listas de personas y entidades sujetas a sanciones del Consejo de Seguridad de la ONU
☐ Listas GAFI / FATF de jurisdicciones de alto riesgo
☐ Listas OFAC (Office of Foreign Assets Control) de los EE.UU.
☐ Listados de la Unión Europea (CFSP)
☐ Listas locales de personas designadas por la Res. UIF 29/2013 y concordantes

Asimismo declara no actuar por cuenta y orden de personas o entidades comprendidas en dichos listados.`,
  },
  situacion_fiscal: {
    titulo: 'DECLARACIÓN JURADA — SITUACIÓN FISCAL',
    cuerpo: `El/la suscripto/a declara bajo juramento su situación fiscal:

CUIT / CUIL / CDI: _______________________________________________
Categoría AFIP:
   ☐ Responsable Inscripto en IVA
   ☐ Monotributista — Categoría: ______
   ☐ Exento
   ☐ Consumidor Final
   ☐ Otro: __________________________________________________

Ingresos Brutos (jurisdicción y N°): ____________________________

Declara conocer las obligaciones fiscales aplicables a la operación y se compromete a aportar la documentación respaldatoria.`,
  },
}

const TIPOS = Object.keys(TEMPLATES) as TipoDDJJ[]

export default function ImprimirDDJJPage() {
  const [tipo, setTipo] = useState<TipoDDJJ>('pep')
  const [escribania, setEscribania] = useState('')

  function imprimir() {
    window.print()
  }

  const tpl = TEMPLATES[tipo]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toolbar (no imprime) */}
      <div className="print:hidden mb-6">
        <Link href="/crm/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Panel de control
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Imprimir DDJJ UIF en blanco</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Elegí el tipo y completá los datos a mano sobre la copia impresa.
        </p>
        <div className="flex gap-3 items-end flex-wrap mb-4">
          <div className="flex-1 min-w-[260px]">
            <label className="text-xs text-zinc-400 block mb-1.5">Tipo de declaración</label>
            <Select value={tipo} onValueChange={v => setTipo(v as TipoDDJJ)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {TIPOS.map(t => (
                  <SelectItem key={t} value={t} className="text-zinc-200 focus:bg-zinc-800">
                    {LABEL_DDJJ[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[260px]">
            <label className="text-xs text-zinc-400 block mb-1.5">Escribanía (opcional, en encabezado)</label>
            <input
              value={escribania}
              onChange={e => setEscribania(e.target.value)}
              placeholder="Ej: Escribanía López"
              className="w-full h-9 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>
          <Button onClick={imprimir} className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
            <Printer size={14} />Imprimir
          </Button>
        </div>
      </div>

      {/* Documento imprimible */}
      <div className="print-document bg-white text-black p-10 rounded-lg shadow-xl print:shadow-none print:p-0 print:rounded-none">
        {escribania && (
          <p className="text-xs text-gray-700 mb-2 uppercase tracking-wider text-center">{escribania}</p>
        )}
        <h2 className="text-base font-bold uppercase text-center mb-6 border-b border-gray-300 pb-3">
          {tpl.titulo}
        </h2>

        <div className="text-sm text-gray-800 mb-8 leading-relaxed">
          <p className="mb-1"><strong>Apellido y Nombre:</strong> ____________________________________________</p>
          <p className="mb-1"><strong>Tipo y N° de documento:</strong> _________________________________________</p>
          <p className="mb-1"><strong>CUIT / CUIL:</strong> ___________________________________________________</p>
          <p className="mb-1"><strong>Domicilio:</strong> _____________________________________________________</p>
          <p className="mb-1"><strong>Carácter en que comparece:</strong> ☐ Por sí  ☐ Por apoderado de _________________________</p>
        </div>

        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap mb-10">
          {tpl.cuerpo}
        </div>

        <div className="grid grid-cols-2 gap-6 mt-16 text-sm text-gray-800">
          <div>
            <p className="border-t border-gray-400 pt-2">Firma del/la declarante</p>
            <p className="text-xs text-gray-600 mt-1">Aclaración: ______________________</p>
          </div>
          <div>
            <p className="border-t border-gray-400 pt-2">Lugar y fecha</p>
            <p className="text-xs text-gray-600 mt-1">_______________________________</p>
          </div>
        </div>

        <div className="grid grid-cols-1 mt-12 text-sm text-gray-800">
          <div>
            <p className="border-t border-gray-400 pt-2 text-center">Sello y firma del/la Escribano/a interviniente</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 1.5cm; }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Ocultar TODO menos el documento imprimible */
          body * { visibility: hidden; }
          .print-document, .print-document * { visibility: visible; }
          .print-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
}
