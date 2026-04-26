import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  ArrowRight, CheckCircle2, Sparkles, Clock, Users, FileText,
  ShieldCheck, Zap, Brain, BookOpen, Calendar, AlertTriangle,
  Bell, Bot, Layers, BarChart3, Star, Check, X, Phone,
  Quote, ChevronRight, TrendingUp, Lock,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Mojarra Digital — Software de gestión para escribanías',
  description: 'El sistema integral que digitaliza tu escribanía. Trámites, índice, agenda, UIF, IA y portal cliente. Diseñado para escribanías argentinas.',
}

const stats = [
  { valor: '+50', label: 'Escribanías activas' },
  { valor: '+30k', label: 'Trámites gestionados' },
  { valor: '15h', label: 'Ahorro semanal por escribano' },
  { valor: '99.9%', label: 'Disponibilidad del sistema' },
]

const dolores = [
  {
    titulo: 'Carpetas físicas y planillas Excel',
    desc: 'Buscar un trámite es una pesadilla. Información dispersa entre papeles, mails y archivos personales.',
  },
  {
    titulo: 'Clientes que llaman cada 3 días',
    desc: '"¿Cómo va mi escritura?" Tu equipo pierde horas respondiendo lo mismo a distintos clientes.',
  },
  {
    titulo: 'Índice notarial manual',
    desc: 'Cargar cada acto a mano, errores tipográficos, exportar a PDF para llevar al Colegio. Tiempo perdido.',
  },
  {
    titulo: 'Riesgo de incumplir UIF',
    desc: 'Detectar a tiempo operaciones que requieren reporte. Multas y sanciones por error humano.',
  },
]

const funciones = [
  {
    icon: Layers,
    titulo: 'Gestión de trámites',
    desc: 'Cada expediente con su estado, hitos, documentos y notas internas. Visibilidad total para todo tu equipo.',
  },
  {
    icon: BookOpen,
    titulo: 'Índice notarial digital',
    desc: 'Cargá actos por voz o teclado. Exportá tu índice oficial al Colegio en PDF con un click.',
  },
  {
    icon: Users,
    titulo: 'CRM de clientes',
    desc: 'Base unificada con detección automática de PEP y Sujeto Obligado. Nunca pierdas un dato.',
  },
  {
    icon: AlertTriangle,
    titulo: 'Cumplimiento UIF automático',
    desc: 'El sistema detecta operaciones que superan el umbral y genera alertas. Reportá con un click.',
  },
  {
    icon: Calendar,
    titulo: 'Agenda integrada',
    desc: 'Coordiná turnos con tus clientes desde su portal. Confirmaciones y recordatorios automáticos.',
  },
  {
    icon: Brain,
    titulo: 'OCR con inteligencia artificial',
    desc: 'Subí un DNI o escritura y el sistema extrae los datos automáticamente. Cero tipeo manual.',
  },
  {
    icon: Bot,
    titulo: 'Asistente de minutas',
    desc: 'IA que revisa tus minutas antes de presentarlas al Registro. Detectá errores antes de mandarlas.',
  },
  {
    icon: Bell,
    titulo: 'Portal del cliente',
    desc: 'Tus clientes ven el estado de su trámite 24/7 desde el celular. Menos llamadas, más eficiencia.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Seguridad bancaria',
    desc: 'Datos cifrados en reposo y en tránsito. Backups automáticos. Acceso por roles configurable.',
  },
]

const beneficios = [
  {
    icon: Clock,
    valor: '15 horas',
    label: 'ahorradas por semana',
    desc: 'Automatizando tareas repetitivas: carga de datos, índice, comunicación con clientes.',
  },
  {
    icon: TrendingUp,
    valor: '40% más',
    label: 'capacidad operativa',
    desc: 'Tu equipo gestiona más trámites con la misma estructura. Crecé sin contratar más gente.',
  },
  {
    icon: Lock,
    valor: '0 multas',
    label: 'por incumplimiento UIF',
    desc: 'Las alertas automáticas garantizan que ningún reporte se escape por error humano.',
  },
]

const testimonios = [
  {
    texto: 'Pasamos de tres carpetas físicas por trámite a tener todo en una pantalla. El equipo recuperó horas que ahora dedicamos a captar nuevos clientes.',
    autor: 'Esc. Patricia Romero',
    cargo: 'Escribanía Romero & Asoc. — CABA',
  },
  {
    texto: 'El asistente de IA para revisar minutas me salvó dos veces de errores que hubieran rebotado del Registro. Solo por eso ya vale la inversión.',
    autor: 'Esc. Diego Albornoz',
    cargo: 'Estudio Albornoz — La Plata',
  },
  {
    texto: 'Los clientes nos paran de llamar para preguntar el estado. Eso no tiene precio. Recomiendo Mojarra a todos mis colegas.',
    autor: 'Esc. María Eugenia Fernández',
    cargo: 'Escribanía Fernández — Rosario',
  },
]

const planes = [
  {
    nombre: 'Básico',
    precio: '85.000',
    desc: 'Para escribanías chicas que están dando el primer paso al digital.',
    incluye: [
      'Hasta 2 usuarios',
      'Trámites y clientes ilimitados',
      'Índice notarial digital',
      'Portal del cliente',
      'Soporte por email',
    ],
    excluye: ['IA / OCR', 'Asistente de minutas', 'Cumplimiento UIF automático'],
    destacado: false,
    cta: 'Empezar prueba',
  },
  {
    nombre: 'Profesional',
    precio: '165.000',
    desc: 'Lo que necesitan las escribanías que quieren crecer y diferenciarse.',
    incluye: [
      'Hasta 5 usuarios',
      'Todo lo del plan Básico',
      'OCR de documentos con IA',
      'Asistente de minutas con IA',
      'Cumplimiento UIF automático',
      'Soporte prioritario',
      'Capacitación inicial',
    ],
    excluye: [],
    destacado: true,
    cta: 'Empezar prueba',
  },
  {
    nombre: 'Estudio',
    precio: 'A medida',
    desc: 'Para estudios grandes con múltiples escribanos y oficinas.',
    incluye: [
      'Usuarios ilimitados',
      'Todo lo del plan Profesional',
      'Múltiples oficinas',
      'Integraciones a medida',
      'Onboarding dedicado',
      'Soporte 24/7',
      'SLA garantizado',
    ],
    excluye: [],
    destacado: false,
    cta: 'Hablar con ventas',
  },
]

const faq = [
  {
    q: '¿Cómo es el proceso para empezar a usar Mojarra Digital?',
    a: 'Solicitás una demo de 30 minutos por video. Si te interesa, firmamos el contrato y en 48 horas tenés tu escribanía configurada con tus datos. Ofrecemos 30 días de prueba sin compromiso.',
  },
  {
    q: '¿Qué pasa con la información que ya tengo cargada en planillas?',
    a: 'Te ayudamos a migrar todos tus clientes, trámites e índice histórico desde Excel, Word u otros sistemas. Sin costo extra en los planes Profesional y Estudio.',
  },
  {
    q: '¿La información de mis clientes está segura?',
    a: 'Absolutamente. Datos cifrados con AES-256, servidores en Argentina con cumplimiento de Ley 25.326, backups diarios automáticos y acceso solo por roles definidos por vos.',
  },
  {
    q: '¿Puedo probar antes de pagar?',
    a: 'Sí. Todos los planes incluyen 30 días de prueba completos sin tarjeta de crédito. Si no te convence, cancelás y listo, sin letra chica.',
  },
  {
    q: '¿Necesito instalar algo en mis computadoras?',
    a: 'No. Mojarra Digital funciona 100% en el navegador. Funciona desde cualquier dispositivo: PC, Mac, tablet o celular. Tus datos siempre sincronizados.',
  },
  {
    q: '¿Qué soporte ofrecen?',
    a: 'Plan Básico: email con respuesta en 24h hábiles. Profesional: email + WhatsApp prioritario. Estudio: línea directa con un Customer Success dedicado y SLA garantizado.',
  },
]

export default function HomePage() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        {/* Imagen de fondo */}
        <div className="absolute inset-0">
          <Image
            src="/images/dashboard-hero.jpg"
            alt="Software de gestión notarial Mojarra Digital"
            fill
            priority
            className="object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/85 to-[#0a0a0a]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50" />
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 -left-32 w-[600px] h-[600px] bg-lime-400/8 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-lime-400/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-lime-400 border border-lime-400/20 bg-lime-400/5 rounded-full px-4 py-1.5 mb-8 tracking-wide uppercase">
              <Sparkles size={12} />
              Software hecho para escribanías argentinas
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              El sistema operativo<br />
              de tu{' '}
              <span className="relative inline-block">
                <span className="text-lime-400">escribanía</span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-lime-400/30" />
              </span>.
            </h1>

            <p className="text-zinc-300 text-lg lg:text-xl leading-relaxed mb-10 max-w-2xl">
              Trámites, clientes, índice notarial, agenda, UIF e inteligencia artificial.
              Todo en una sola plataforma diseñada para cómo trabaja{' '}
              <span className="text-white font-medium">realmente</span> una escribanía.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link href="/consulta">
                <Button size="lg"
                  className="bg-lime-400 text-black hover:bg-lime-300 font-bold px-8 py-6 text-base gap-2 shadow-lg shadow-lime-400/20">
                  Solicitar demo gratis <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-8 py-6 text-base gap-2">
                  Ya soy cliente <ChevronRight size={16} />
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-lime-400" />
                <span>30 días gratis</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-lime-400" />
                <span>Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-lime-400" />
                <span>Migración incluida</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-lime-400" />
                <span>Soporte en castellano</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(({ valor, label }) => (
              <div key={label} className="text-center">
                <p className="text-4xl font-bold text-lime-400 mb-1">{valor}</p>
                <p className="text-sm text-zinc-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOLORES ── */}
      <section id="producto" className="py-24 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-xs font-semibold text-lime-400 tracking-widest uppercase">El problema</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3 mb-5 leading-tight">
              Las escribanías pierden tiempo<br />
              haciendo lo que no deberían.
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Hace décadas que los procesos no cambian. Mientras tanto, los clientes
              cambiaron y exigen velocidad, transparencia y digitalización.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {dolores.map(({ titulo, desc }) => (
              <div key={titulo}
                className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <X size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1.5">{titulo}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTO / VISUAL ── */}
      <section className="py-24 border-t border-zinc-800 bg-zinc-900/20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-semibold text-lime-400 tracking-widest uppercase">La solución</span>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3 mb-6 leading-tight">
                Una sola plataforma.<br />
                Cero hojas sueltas.
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                Todo lo que tu escribanía necesita en un solo lugar. Diseñado por
                escribanos junto con desarrolladores especializados, no genérico
                ni adaptado de otros rubros.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  'Implementación en 48 horas',
                  'Migración de datos sin cargo',
                  'Capacitación incluida para todo el equipo',
                  'Actualizaciones constantes sin costo extra',
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-lime-400 shrink-0" />
                    <span className="text-zinc-200">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/consulta">
                <Button className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2 px-6 py-5">
                  Ver una demo en vivo <ArrowRight size={16} />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 aspect-[4/3] shadow-2xl">
                <Image
                  src="/images/dashboard-hero.jpg"
                  alt="Dashboard del sistema"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Floating cards */}
              <div className="absolute -top-5 -left-5 bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl max-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 size={14} className="text-lime-400" />
                  <span className="text-[10px] font-bold text-lime-400 tracking-wide">+38% ESTE MES</span>
                </div>
                <p className="text-white text-sm font-semibold">Trámites cerrados</p>
              </div>
              <div className="absolute -bottom-5 -right-5 bg-lime-400 rounded-xl p-4 shadow-2xl shadow-lime-400/30">
                <p className="text-[10px] text-black/70 font-bold tracking-wide mb-1">PROMEDIO</p>
                <p className="text-2xl font-bold text-black leading-none">15h</p>
                <p className="text-[10px] text-black/80 font-semibold mt-1">ahorradas por semana</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FUNCIONES ── */}
      <section id="funciones" className="py-24 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-lime-400 tracking-widest uppercase">Funciones</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3 mb-5 leading-tight">
              Pensado al detalle<br />
              para escribanos.
            </h2>
            <p className="text-zinc-400 text-lg">
              No es un CRM genérico con etiqueta de notario. Cada función fue diseñada
              específicamente para los procesos de tu escribanía.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {funciones.map(({ icon: Icon, titulo, desc }) => (
              <div key={titulo}
                className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-lime-400/30 transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mb-4 group-hover:bg-lime-400/15 transition-colors">
                  <Icon size={20} className="text-lime-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{titulo}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS NÚMEROS ── */}
      <section className="py-24 border-t border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-lime-400 tracking-widest uppercase">Resultados</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3 mb-5 leading-tight">
              Resultados que se notan<br />
              desde la primera semana.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {beneficios.map(({ icon: Icon, valor, label, desc }) => (
              <div key={valor}
                className="p-8 rounded-2xl border border-zinc-800 bg-[#0a0a0a]">
                <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mb-6">
                  <Icon size={22} className="text-lime-400" />
                </div>
                <p className="text-5xl font-bold text-white mb-2 leading-none">{valor}</p>
                <p className="text-lime-400 font-medium text-sm mb-3">{label}</p>
                <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section id="testimonios" className="py-24 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
            <div>
              <span className="text-xs font-semibold text-lime-400 tracking-widest uppercase">Casos de éxito</span>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3 leading-tight">
                Escribanías de toda Argentina<br />
                ya digitalizaron su estudio.
              </h2>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 aspect-[3/4] max-w-sm">
                <Image
                  src="/images/escribano.jpg"
                  alt="Escribano usando Mojarra Digital"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/70 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className="text-lime-400 fill-lime-400" />
                    ))}
                  </div>
                  <p className="text-white font-semibold">"La mejor decisión que tomé este año."</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonios.map(({ texto, autor, cargo }) => (
              <div key={autor}
                className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors">
                <Quote size={24} className="text-lime-400/40 mb-4" />
                <p className="text-zinc-200 text-sm leading-relaxed mb-5">{texto}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
                  <div className="w-9 h-9 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-xs font-bold text-lime-400">
                    {autor.split(' ').slice(-2)[0][0]}{autor.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{autor}</p>
                    <p className="text-zinc-500 text-xs">{cargo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRECIOS ── */}
      <section id="precios" className="py-24 border-t border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-lime-400 tracking-widest uppercase">Precios transparentes</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3 mb-5 leading-tight">
              Un plan para cada escribanía.
            </h2>
            <p className="text-zinc-400 text-lg">
              Sin letra chica. Sin sorpresas. Cancelás cuando quieras.
              Todos los planes incluyen 30 días de prueba gratis.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {planes.map(({ nombre, precio, desc, incluye, excluye, destacado, cta }) => (
              <div key={nombre}
                className={`relative p-8 rounded-2xl border transition-all ${
                  destacado
                    ? 'border-lime-400 bg-zinc-900 shadow-2xl shadow-lime-400/10 lg:scale-105'
                    : 'border-zinc-800 bg-[#0a0a0a]'
                }`}>
                {destacado && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-lime-400 text-black text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                    Más elegido
                  </span>
                )}
                <h3 className="text-xl font-bold text-white mb-2">{nombre}</h3>
                <p className="text-zinc-400 text-sm mb-6 min-h-[40px]">{desc}</p>
                <div className="mb-6">
                  {precio === 'A medida' ? (
                    <p className="text-4xl font-bold text-white">{precio}</p>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-zinc-500 text-lg">$</span>
                      <span className="text-4xl font-bold text-white">{precio}</span>
                      <span className="text-zinc-500 text-sm">/mes + IVA</span>
                    </div>
                  )}
                </div>
                <Link href="/consulta">
                  <Button
                    className={`w-full mb-8 font-semibold ${
                      destacado
                        ? 'bg-lime-400 text-black hover:bg-lime-300'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                    }`}>
                    {cta}
                  </Button>
                </Link>
                <ul className="space-y-3">
                  {incluye.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <Check size={16} className="text-lime-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                  {excluye.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
                      <X size={16} className="text-zinc-700 shrink-0 mt-0.5" />
                      <span className="line-through">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-lime-400 tracking-widest uppercase">Preguntas frecuentes</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3 leading-tight">
              ¿Tenés dudas?<br />Te las respondemos.
            </h2>
          </div>
          <div className="space-y-3">
            {faq.map(({ q, a }, i) => (
              <details key={i}
                className="group p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-semibold text-white pr-4">{q}</span>
                  <span className="shrink-0 w-7 h-7 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center group-open:bg-lime-400 transition-colors">
                    <ChevronRight size={14} className="text-lime-400 group-open:text-black group-open:rotate-90 transition-transform" />
                  </span>
                </summary>
                <p className="mt-4 text-zinc-400 text-sm leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 border-t border-zinc-800 bg-gradient-to-b from-zinc-900/30 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-lime-400/5 rounded-full blur-[160px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-lime-400 border border-lime-400/20 bg-lime-400/5 rounded-full px-4 py-1.5 mb-8 tracking-wide uppercase">
            <Zap size={12} />
            Empezá hoy mismo
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-[1.05]">
            Modernizá tu escribanía<br />
            <span className="text-lime-400">en 48 horas.</span>
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
            Solicitá una demo de 30 minutos. Te mostramos el sistema con datos
            reales de tu escribanía y respondemos todas tus preguntas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/consulta">
              <Button size="lg"
                className="bg-lime-400 text-black hover:bg-lime-300 font-bold px-10 py-6 text-base gap-2 shadow-lg shadow-lime-400/30">
                Solicitar demo gratis <ArrowRight size={18} />
              </Button>
            </Link>
            <a href="tel:01143215678">
              <Button size="lg" variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-10 py-6 text-base gap-2">
                <Phone size={16} /> (011) 4321-5678
              </Button>
            </a>
          </div>
          <p className="mt-6 text-xs text-zinc-500">
            30 días gratis · Sin tarjeta de crédito · Migración sin costo
          </p>
        </div>
      </section>
    </>
  )
}
