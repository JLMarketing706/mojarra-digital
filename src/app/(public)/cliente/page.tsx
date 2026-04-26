import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight, FileText, Bell, Calendar, ShieldCheck,
  Smartphone, Clock, Eye, MessageCircle, CheckCircle2,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Portal del Cliente — Mojarra Digital',
  description: 'Seguí tu trámite notarial en tiempo real. Documentos, notificaciones y turnos desde donde estés.',
}

const features = [
  {
    icon: Eye,
    titulo: 'Estado en tiempo real',
    desc: 'Mirá en qué etapa está tu trámite las 24 horas. Sin llamar, sin esperar.',
  },
  {
    icon: Bell,
    titulo: 'Notificaciones automáticas',
    desc: 'Te avisamos al instante cuando tu escribanía actualiza algo en tu expediente.',
  },
  {
    icon: FileText,
    titulo: 'Tus documentos online',
    desc: 'Accedé a las copias digitales de todo lo que firmaste, cuando quieras.',
  },
  {
    icon: Calendar,
    titulo: 'Turnos y agenda',
    desc: 'Coordiná y confirmá visitas a la escribanía desde la app, sin teléfono.',
  },
  {
    icon: MessageCircle,
    titulo: 'Comunicación directa',
    desc: 'Hablá con tu escribanía desde el portal. Sin perder mensajes en mil canales.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Datos protegidos',
    desc: 'Tu información está cifrada y solo vos y tu escribanía pueden verla.',
  },
]

export default function ClientePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[80vh] flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-lime-400/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-lime-400/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-lime-400 border border-lime-400/20 bg-lime-400/5 rounded-full px-4 py-1.5 mb-8 tracking-wide uppercase">
                <Smartphone size={12} />
                Portal del cliente
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
                Seguí tu trámite{' '}
                <span className="text-lime-400">en tiempo real</span>.
              </h1>

              <p className="text-zinc-300 text-lg leading-relaxed mb-10 max-w-lg">
                Si tu escribanía usa Mojarra Digital, podés ver el estado de tu
                escritura, poder o trámite cuando quieras, desde tu celular o
                computadora.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/login">
                  <Button size="lg"
                    className="bg-lime-400 text-black hover:bg-lime-300 font-bold px-8 py-6 text-base gap-2 shadow-lg shadow-lime-400/20">
                    Ingresar al portal <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link href="/registro">
                  <Button size="lg" variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-8 py-6 text-base">
                    Crear cuenta nueva
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-zinc-500">
                ¿Aún no tenés cuenta? Pedile a tu escribanía que te envíe la invitación.
              </p>
            </div>

            {/* Mock celular */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-72 bg-zinc-900 border-[10px] border-zinc-800 rounded-[2.5rem] shadow-2xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs text-zinc-500">Hola, María</p>
                      <p className="text-white font-semibold">Tus trámites</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center relative">
                      <Bell size={14} className="text-lime-400" />
                      <span className="absolute top-1 right-1 w-2 h-2 bg-lime-400 rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-white">Escritura compraventa</span>
                        <span className="text-[10px] bg-lime-400/10 text-lime-400 border border-lime-400/20 px-2 py-0.5 rounded-full">En registro</span>
                      </div>
                      <div className="flex gap-1">
                        {[true, true, true, false].map((d, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${d ? 'bg-lime-400' : 'bg-zinc-700'}`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2">Actualizado hace 2h</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-white">Poder general</span>
                        <span className="text-[10px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">Listo</span>
                      </div>
                      <div className="flex gap-1">
                        {[true, true, true, true].map((d, i) => (
                          <div key={i} className="h-1 flex-1 rounded-full bg-lime-400" />
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2">Listo para retirar</p>
                    </div>
                  </div>
                </div>
                {/* Notificación flotante */}
                <div className="absolute -top-4 -right-8 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-2xl max-w-[180px]">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={12} className="text-lime-400" />
                    <span className="text-[10px] font-bold text-lime-400 tracking-wide">NUEVA</span>
                  </div>
                  <p className="text-white text-xs font-medium leading-snug">Tu escritura entró al Registro</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
              Tu escribanía, en tu bolsillo.
            </h2>
            <p className="text-zinc-400 text-lg">
              Todo lo que necesitás saber sobre tu trámite, sin tener que llamar
              ni acercarte a la oficina.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, titulo, desc }) => (
              <div key={titulo}
                className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-lime-400/30 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-lime-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{titulo}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-20 border-t border-zinc-800 bg-zinc-900/20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">¿Cómo funciona?</h2>
            <p className="text-zinc-400">3 pasos simples para empezar.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '01', titulo: 'Recibí la invitación', desc: 'Tu escribanía te invita por email cuando carga tu trámite en el sistema.' },
              { num: '02', titulo: 'Creá tu cuenta', desc: 'Definís tu contraseña en 30 segundos. No necesitás descargar ninguna app.' },
              { num: '03', titulo: 'Seguí tu trámite', desc: 'Accedé desde cualquier dispositivo y ve el avance en tiempo real.' },
            ].map(({ num, titulo, desc }) => (
              <div key={num}>
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mb-4">
                  <span className="font-bold text-lime-400">{num}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{titulo}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Clock size={32} className="text-lime-400 mx-auto mb-6" />
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-5 leading-tight">
            ¿Tenés un trámite en curso?
          </h2>
          <p className="text-zinc-400 mb-10 text-lg">
            Ingresá con el email que te dio tu escribanía y empezá a seguir tu trámite ahora mismo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg"
                className="bg-lime-400 text-black hover:bg-lime-300 font-bold px-10 py-6 text-base gap-2 shadow-lg shadow-lime-400/20">
                Ingresar al portal <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-10 py-6 text-base">
                Soy escribanía
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
