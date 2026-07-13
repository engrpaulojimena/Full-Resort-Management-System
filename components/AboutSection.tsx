'use client'

import Image from 'next/image'
import { Anchor, Sun, Shell } from 'lucide-react'

const highlights = [
  {
    icon: Anchor,
    title: 'Beachfront Location',
    desc: 'Directly overlooking the beachfront with breathtaking sunsets every evening.',
    color: 'text-ocean-500',
    bg: 'bg-ocean-50',
  },
  {
    icon: Sun,
    title: 'Stunning Sunsets',
    desc: 'Watch the sun dip below the horizon from our infinity pool every night.',
    color: 'text-sand-600',
    bg: 'bg-sand-50',
  },
  {
    icon: Shell,
    title: 'A-Frame Villas',
    desc: 'Unique architect-designed A-frame cottages with modern interiors and poolside access.',
    color: 'text-palm-500',
    bg: 'bg-green-50',
  },
]

export default function AboutSection() {
  return (
    <section id="about" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            <p className="section-label mb-3">Welcome to Kekamiya</p>
            <h2 className="section-title mb-6">
              Your Perfect{' '}
              <span className="text-gradient-ocean">Beach Escape</span>
              <br />in Zambales
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              Nestled along the shores of Botolan, Zambales, Kekamiya Beach Resort is where the waves
              whisper and time slows down. Our signature A-frame villas sit beside a stunning infinity
              pool that seems to merge with the open horizon.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              Whether you're here for a family getaway, a romantic retreat, or an adventurous trip —
              wake up to golden sunrises, swim in our crystal-clear pool, and fall asleep to the
              sound of waves. This is more than a resort — it's a feeling.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-100">
              {[
                { num: '500+', label: 'Happy Guests' },
                { num: '10+', label: 'Cabin' },
                { num: '★ 5.0', label: 'Guest Rating' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-display text-2xl font-bold text-ocean-600">{s.num}</div>
                  <div className="text-gray-500 text-sm mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo collage */}
          <div className="relative">
            <div className="absolute -top-10 -right-10 w-80 h-80 bg-ocean-100 rounded-full blur-3xl opacity-50 -z-10" />

            {/* Main big photo */}
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-ocean-200 mb-4 relative h-72">
              <Image
                src="/images/resort-villas-daytime.jpg"
                alt="Kekamiya A-frame villas with swimming pool"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* Two smaller photos */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl overflow-hidden shadow-lg relative h-44">
                <Image
                  src="/images/19286.jpg"
                  alt="Sunset view from Kekamiya pool"
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-lg relative h-44">
                <Image
                  src="/images/resort-pavilion-pool.jpg"
                  alt="Kekamiya beachfront pavilion overlooking the pool and shore"
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              </div>
            </div>

            {/* Highlight cards */}
            <div className="grid grid-cols-1 gap-3">
              {highlights.map((h) => {
                const Icon = h.icon
                return (
                  <div key={h.title} className={`flex items-start gap-4 p-4 rounded-2xl ${h.bg} card-hover`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm shrink-0`}>
                      <Icon className={`w-5 h-5 ${h.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-0.5">{h.title}</h4>
                      <p className="text-gray-500 text-sm leading-relaxed">{h.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
