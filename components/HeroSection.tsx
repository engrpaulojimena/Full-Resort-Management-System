'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, Star, MapPin, Waves, Sun, Umbrella } from 'lucide-react'

// Best hero candidates: 19285 (night pool+sunset), 19288 (daytime pool+sea), 19289 (golden hour pool)
const heroImages = [
  { src: '/images/19288.jpg', alt: 'Kekamiya infinity pool overlooking the beach' },
  { src: '/images/resort-villas-golden-hour.jpg', alt: 'Guests enjoying the infinity pool at golden hour beside the A-frame villas' },
  { src: '/images/19289.jpg', alt: 'Guests enjoying the pool at golden hour' },
  { src: '/images/resort-villas-night.jpg', alt: 'A-frame villas illuminated at night beside the pool' },
]

export default function HeroSection() {
  const [loaded, setLoaded] = useState(false)
  const [currentImg, setCurrentImg] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Auto-rotate hero images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImg((prev) => (prev + 1) % heroImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background images with crossfade */}
      <div className="absolute inset-0 z-0">
        {heroImages.map((img, i) => (
          <div
            key={img.src}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === currentImg ? 1 : 0 }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover object-center"
              priority={i === 0}
              sizes="100vw"
            />
          </div>
        ))}
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/60 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10 z-10" />
      </div>

      {/* Content */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-28 pb-16">
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 glass text-white/90 text-[11px] font-bold tracking-[0.25em] uppercase px-5 py-2.5 rounded-full mb-8 transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <MapPin className="w-3.5 h-3.5 text-sand-300" />
          Botolan, Zambales
        </div>

        {/* Headline */}
        <h1
          className={`font-display text-white leading-[1.05] mb-6 transition-all duration-1000 delay-150 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold drop-shadow-lg tracking-tight">
            Where the Sea
          </span>
          <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold italic text-gradient-sand drop-shadow-lg tracking-tight">
            Meets Serenity
          </span>
        </h1>

        {/* Tagline */}
        <p
          className={`text-white/85 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed mb-10 drop-shadow transition-all duration-1000 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          Escape to Kekamiya — a paradise of crystal-clear waters, golden sands,
          and tropical breezes right on the shores of Zambales.
        </p>

        {/* Buttons */}
        <div
          className={`flex flex-col sm:flex-row gap-4 mb-16 transition-all duration-1000 delay-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <Link href="/book" className="btn-primary text-base px-8 py-4 rounded-full shadow-2xl shadow-ocean-900/30">
            <Waves className="w-5 h-5" />
            Book Your Stay
          </Link>
          <Link href="/gallery" className="btn-secondary text-base px-8 py-4">
            View Gallery
          </Link>
        </div>

        {/* Pills */}
        <div
          className={`flex flex-wrap justify-center gap-4 transition-all duration-1000 delay-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {[
            { Icon: Waves, label: 'Private Beach' },
            { Icon: Sun, label: 'Swimming Pool' },
            { Icon: Umbrella, label: 'A-Frame Villas' },
          ].map((item) => (
            <div key={item.label} className="glass text-white text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2 transition-colors hover:bg-white/15">
              <item.Icon className="w-3.5 h-3.5 text-sand-300" />
              {item.label}
            </div>
          ))}
          <div className="glass text-white text-sm font-medium px-4 py-2 rounded-full flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-sand-300 text-sand-300" />
            ))}
            <span className="ml-1">5.0</span>
          </div>
        </div>

        {/* Image dots */}
        <div className="flex gap-2 mt-8">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentImg(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentImg ? 'bg-white w-6' : 'bg-white/40'}`}
              aria-label={`Hero image ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="relative z-20 pb-8 flex justify-center animate-bounce">
        <button
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          className="text-white/70 hover:text-white transition-colors"
          aria-label="Scroll down"
        >
          <ChevronDown className="w-8 h-8" />
        </button>
      </div>
    </section>
  )
}
