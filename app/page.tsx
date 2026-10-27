'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 49,
    color: 'var(--accent-teal)',
    destacado: false,
    limites: ['50 servicios / mes', '50 comprobantes / mes', '50 consultas de placa / mes'],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: 99,
    color: 'var(--accent)',
    destacado: true,
    limites: ['200 servicios / mes', '200 comprobantes / mes', '200 consultas de placa / mes'],
  },
  {
    id: 'exclusive',
    nombre: 'Exclusive',
    precio: 199,
    color: 'var(--accent-yellow)',
    destacado: false,
    limites: ['Servicios ilimitados', 'Comprobantes ilimitados', 'Consultas de placa ilimitadas'],
  },
]

const MODULOS = [
  { icono: '🔧', titulo: 'Atención técnica', desc: 'Registra servicios completos: aceite, filtros, caja, refrigerante y bujías en un solo flujo.' },
  { icono: '🧾', titulo: 'Comprobantes SUNAT', desc: 'Emite boletas y facturas electrónicas directo desde cada atención o venta.' },
  { icono: '📦', titulo: 'Inventario', desc: 'Controla stock, costos y márgenes de tus productos con alertas de bajo stock.' },
  { icono: '🛒', titulo: 'Tienda / POS', desc: 'Vende repuestos y productos directos al público con carrito y ticket digital.' },
  { icono: '🔍', titulo: 'Consulta por placa', desc: 'Accede al historial completo de mantenimiento de cualquier vehículo atendido.' },
  { icono: '📊', titulo: 'Panel de estadísticas', desc: 'Visualiza ingresos, operaciones y marcas atendidas en tiempo real.' },
]

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const heroBgRef = useRef<HTMLDivElement>(null)
  const heroContentRef = useRef<HTMLDivElement>(null)
  const modulosRef = useRef<HTMLDivElement>(null)
  const planesRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const planRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {

      // ── Hero parallax — fondo se mueve más lento que el contenido ──
      if (heroBgRef.current) {
        gsap.to(heroBgRef.current, {
          yPercent: 40,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })
      }

      // ── Hero contenido — sale hacia arriba y desvanece ──
      if (heroContentRef.current) {
        gsap.to(heroContentRef.current, {
          yPercent: 20,
          opacity: 0.2,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })
      }

      // ── Módulos — entrada con expansión desde abajo ──
      cardRefs.current.forEach((card, i) => {
        if (!card) return
        gsap.fromTo(card,
          { opacity: 0, y: 60, scale: 0.92 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.7,
            ease: 'power3.out',
            delay: (i % 3) * 0.1,
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          }
        )
      })

      // ── Planes — expansión + fade con stagger ──
      planRefs.current.forEach((plan, i) => {
        if (!plan) return
        gsap.fromTo(plan,
          { opacity: 0, y: 80, scaleY: 0.88, transformOrigin: 'bottom center' },
          {
            opacity: 1, y: 0, scaleY: 1,
            duration: 0.8,
            ease: 'power4.out',
            delay: i * 0.12,
            scrollTrigger: {
              trigger: planesRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        )
      })

      // ── Heading módulos — slide desde izquierda ──
      if (modulosRef.current) {
        const heading = modulosRef.current.querySelector('.section-heading')
        if (heading) {
          gsap.fromTo(heading,
            { opacity: 0, x: -40 },
            {
              opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
              scrollTrigger: {
                trigger: heading,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
              },
            }
          )
        }
      }

      // ── Heading planes — slide desde derecha ──
      if (planesRef.current) {
        const heading = planesRef.current.querySelector('.section-heading')
        if (heading) {
          gsap.fromTo(heading,
            { opacity: 0, x: 40 },
            {
              opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
              scrollTrigger: {
                trigger: heading,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
              },
            }
          )
        }
      }

    })

    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg)' }}>

      {/* NAV */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 relative z-50"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="pilot-light" />
          <span className="font-display text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>AWTU</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="font-display text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
            style={{ color: 'var(--text-muted)' }}>
            Ingresar
          </Link>
          <Link href="/registro"
            className="font-display text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            Crear cuenta
          </Link>
        </div>
      </header>

      {/* HERO — con parallax */}
      <section ref={heroRef} className="relative overflow-hidden" style={{ minHeight: '520px' }}>

        {/* Fondo parallax con gradiente y patrón */}
        <div ref={heroBgRef} className="absolute inset-0 will-change-transform" style={{ top: '-20%', height: '140%' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, color-mix(in srgb, var(--accent-teal) 12%, transparent), transparent)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--border) 60%, transparent) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
        </div>

        {/* Orbes decorativos parallax */}
        <div className="absolute pointer-events-none" style={{
          top: '10%', left: '5%', width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-teal) 8%, transparent), transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div className="absolute pointer-events-none" style={{
          top: '20%', right: '8%', width: '260px', height: '260px', borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 8%, transparent), transparent 70%)',
          filter: 'blur(40px)',
        }} />

        {/* Contenido hero */}
        <div ref={heroContentRef} className="relative z-10 px-6 sm:px-10 pt-16 pb-20 max-w-4xl mx-auto text-center will-change-transform">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] mb-4"
            style={{ color: 'var(--accent-teal)' }}>
            Software de gestión para talleres automotrices
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-bold uppercase tracking-tighter leading-tight mb-5"
            style={{ color: 'var(--text)' }}>
            Lleva tu taller al siguiente nivel
          </h1>
          <p className="text-base sm:text-lg font-semibold max-w-2xl mx-auto mb-9"
            style={{ color: 'var(--text-muted)' }}>
            AWTU centraliza atenciones, inventario, ventas y comprobantes electrónicos en un solo sistema diseñado para talleres en el Perú.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/registro"
              className="font-display font-bold text-sm uppercase tracking-widest px-7 py-3.5 rounded-2xl transition-all active:scale-95"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
              Comenzar ahora
            </Link>
            <a href="#planes"
              className="font-display font-bold text-sm uppercase tracking-widest px-7 py-3.5 rounded-2xl transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              Ver planes
            </a>
          </div>

          {/* Indicador de scroll */}
          <div className="flex flex-col items-center gap-2 mt-12 opacity-40">
            <span className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Scroll
            </span>
            <div style={{
              width: '1px', height: '48px',
              background: 'linear-gradient(to bottom, var(--text-muted), transparent)',
            }} />
          </div>
        </div>
      </section>

      {/* MÓDULOS */}
      <section ref={modulosRef} className="px-6 sm:px-10 py-20 max-w-6xl mx-auto">
        <div className="section-heading text-center mb-12">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Todo en un solo lugar
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tighter"
            style={{ color: 'var(--text)' }}>
            Módulos pensados para el día a día del taller
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULOS.map((m, i) => (
            <div
              key={m.titulo}
              ref={el => { cardRefs.current[i] = el }}
              className="card"
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {m.icono}
              </div>
              <h3 className="font-display text-sm font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text)' }}>{m.titulo}</h3>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" ref={planesRef} className="px-6 sm:px-10 py-20 max-w-6xl mx-auto">
        <div className="section-heading text-center mb-12">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Suscripción mensual
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tighter"
            style={{ color: 'var(--text)' }}>
            Elige el plan que se ajusta a tu taller
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PLANES.map((p, i) => (
            <div
              key={p.id}
              ref={el => { planRefs.current[i] = el }}
              className="rounded-2xl p-7 flex flex-col"
              style={{
                willChange: 'transform, opacity',
                ...(p.destacado
                  ? { background: 'var(--surface)', border: `2px solid ${p.color}` }
                  : { background: 'var(--surface)', border: '1px solid var(--border)' })
              }}
            >
              {p.destacado && (
                <span className="font-display self-start text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg mb-4"
                  style={{ background: p.color + '1f', color: p.color }}>
                  Más elegido
                </span>
              )}
              <h3 className="font-display text-lg font-bold uppercase tracking-widest mb-1"
                style={{ color: 'var(--text)' }}>{p.nombre}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-sm font-bold" style={{ color: p.color }}>S/</span>
                <span className="font-mono text-4xl font-bold" style={{ color: 'var(--text)' }}>{p.precio}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>/ mes</span>
              </div>
              <div className="space-y-3 mb-8 flex-1">
                {p.limites.map(l => (
                  <div key={l} className="flex items-start gap-2">
                    <span className="font-bold mt-0.5" style={{ color: p.color }}>✓</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{l}</span>
                  </div>
                ))}
              </div>
              <Link href={`/registro?plan=${p.id}`}
                className="font-display text-center font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-95"
                style={p.destacado
                  ? { background: p.color, color: 'var(--bg)' }
                  : { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                Elegir {p.nombre}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs font-semibold mt-8" style={{ color: 'var(--text-muted)' }}>
          El límite que se alcance primero (servicios, comprobantes o consultas) bloquea las acciones hasta el siguiente mes.
        </p>
      </section>

      {/* FOOTER */}
      <footer className="px-6 sm:px-10 py-8 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="font-display text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}>
          AWTU — Automotriz Web Tool · Perú
        </p>
      </footer>

    </div>
  )
}