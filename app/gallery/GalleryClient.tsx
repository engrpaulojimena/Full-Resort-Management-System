'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn, Waves, Sunset, BedDouble, Building2, Sparkles, ImageOff } from 'lucide-react'

type Category = 'All' | 'Pool' | 'Sunset' | 'Rooms' | 'Exterior'

interface GalleryPhoto {
  src: string
  alt: string
  category: Category
  span?: 'wide' | 'tall' | 'normal'
}

const photos: GalleryPhoto[] = [
  // POOL category
  {
    src: '/images/pool.jpg',
    alt: 'Kekamiya Resort swimming pool — clear blue water surrounded by tropical landscaping',
    category: 'Pool',
    span: 'tall',
  },
  {
    src: '/images/19288.jpg',
    alt: "Kekamiya's main infinity pool with clear turquoise water under a deep blue sky",
    category: 'Pool',
    span: 'wide',
  },
  {
    src: '/images/resort-pavilion-pool.jpg',
    alt: 'Beachfront pavilion and pool with a view of the shore',
    category: 'Pool',
    span: 'normal',
  },
  {
    src: '/images/resort-villas-daytime.jpg',
    alt: 'A-frame villas lined beside the pool on a sunny day',
    category: 'Pool',
    span: 'normal',
  },
  {
    src: '/images/resort-villas-golden-hour.jpg',
    alt: 'Guests enjoying the infinity pool at golden hour beside the villas',
    category: 'Pool',
    span: 'normal',
  },
  // SUNSET category
  {
    src: '/images/19285.jpg',
    alt: 'Kekamiya infinity pool illuminated at night with a dramatic red sunset over the sea',
    category: 'Sunset',
    span: 'tall',
  },
  {
    src: '/images/19286.jpg',
    alt: 'Guests silhouetted against a blazing orange sunset by the beach',
    category: 'Sunset',
    span: 'normal',
  },
  {
    src: '/images/19289.jpg',
    alt: 'Swimmers enjoying the pool as the golden hour sky reflects on the water',
    category: 'Sunset',
    span: 'tall',
  },
  // EXTERIOR category
  {
    src: '/images/19300.jpg',
    alt: 'Resort cottages and outdoor area by the water',
    category: 'Exterior',
    span: 'wide',
  },
  {
    src: '/images/resort-villas-night.jpg',
    alt: 'A-frame villas illuminated at night beside the pool',
    category: 'Exterior',
    span: 'normal',
  },
  {
    src: '/images/19302.jpg',
    alt: 'Resort event venue and open-air facilities',
    category: 'Exterior',
    span: 'normal',
  },
  {
    src: '/images/19303.jpg',
    alt: 'Kekamiya Resort grounds and facilities from the outside',
    category: 'Exterior',
    span: 'normal',
  },
  // ROOMS category
  {
    src: '/images/19291.jpg',
    alt: 'Living area of A-frame villa with sofa, wooden staircase, and natural light',
    category: 'Rooms',
    span: 'normal',
  },
  {
    src: '/images/19292.jpg',
    alt: 'Cozy bedroom with queen bed, sage green accent wall, and air conditioning',
    category: 'Rooms',
    span: 'normal',
  },
  {
    src: '/images/19293.jpg',
    alt: 'Modern bathroom with vessel sink, black louvered door, and clean finishes',
    category: 'Rooms',
    span: 'normal',
  },
  {
    src: '/images/19294.jpg',
    alt: 'Loft bedroom in A-frame — upper level with arched black beams and pool view windows',
    category: 'Rooms',
    span: 'normal',
  },
  {
    src: '/images/19295.jpg',
    alt: 'Dramatic A-frame loft bedroom with triangular architecture and white linens',
    category: 'Rooms',
    span: 'wide',
  },
]

const categories: Category[] = ['All', 'Pool', 'Sunset', 'Rooms', 'Exterior']

const categoryIcons: Record<Category, any> = {
  All: Sparkles,
  Pool: Waves,
  Sunset: Sunset,
  Rooms: BedDouble,
  Exterior: Building2,
}

export default function GalleryClient() {
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const filtered = activeCategory === 'All'
    ? photos
    : photos.filter((p) => p.category === activeCategory)

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const prevPhoto = useCallback(() => setLightboxIndex((i) => (i !== null ? (i - 1 + filtered.length) % filtered.length : null)), [filtered.length])
  const nextPhoto = useCallback(() => setLightboxIndex((i) => (i !== null ? (i + 1) % filtered.length : null)), [filtered.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevPhoto()
      if (e.key === 'ArrowRight') nextPhoto()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, closeLightbox, prevPhoto, nextPhoto])

  return (
    <>
      {/* Hero banner */}
      <div className="relative pt-20 pb-16 bg-gradient-to-br from-ocean-700 to-ocean-900 overflow-hidden">
        {/* Background from best photo */}
        <div className="absolute inset-0 opacity-30">
          <Image
            src="/images/19285.jpg"
            alt="Gallery background"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/60 to-ocean-900/80" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-12">
          <p className="text-ocean-300 font-semibold text-sm tracking-[0.2em] uppercase mb-3">Visual Stories</p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-4">
            Photo Gallery
          </h1>
          <p className="text-ocean-200 text-lg max-w-xl mx-auto">
            Glimpses of paradise — from golden sunsets to our iconic A-frame villas in Botolan, Zambales.
          </p>
          <p className="text-ocean-400 text-sm mt-2">{photos.length} photos &amp; counting</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="sticky top-[64px] z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => {
            const count = cat === 'All' ? photos.length : photos.filter(p => p.category === cat).length
            const Icon = categoryIcons[cat]
            const active = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${
                  active
                    ? 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white shadow-lg shadow-ocean-300/40 -translate-y-0.5'
                    : 'bg-gray-100 text-gray-600 hover:bg-ocean-50 hover:text-ocean-600'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-sand-300' : 'text-ocean-400'}`} />
                {cat}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Masonry grid */}
      <section className="py-12 bg-gray-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filtered.map((photo, index) => {
              const Icon = categoryIcons[photo.category]
              return (
              <div
                key={photo.src}
                className="break-inside-avoid group relative overflow-hidden rounded-2xl cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gray-200 animate-fadeIn"
                style={{ animationDelay: `${(index % 9) * 60}ms` }}
                onClick={() => openLightbox(index)}
              >
                <div className={`relative w-full ${
                  photo.span === 'wide' ? 'aspect-video' :
                  photo.span === 'tall' ? 'aspect-[3/4]' :
                  'aspect-[4/3]'
                }`}>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-end justify-between">
                      <span className="inline-flex items-center gap-1.5 text-white/90 text-xs font-semibold bg-black/30 px-2.5 py-1.5 rounded-full backdrop-blur-sm">
                        <Icon className="w-3.5 h-3.5 text-sand-300" />
                        {photo.category}
                      </span>
                      <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/25 transition-colors">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <ImageOff className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No photos in this category yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/60 text-sm">
            {lightboxIndex + 1} / {filtered.length}
          </div>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prevPhoto() }}
            className="absolute left-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          {/* Image */}
          <div
            className="relative max-w-5xl max-h-[85vh] w-full mx-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[80vh]">
              <Image
                src={filtered[lightboxIndex].src}
                alt={filtered[lightboxIndex].alt}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 80vw"
                priority
              />
            </div>
            {/* Caption */}
            <div className="text-center mt-3">
              <span className="inline-flex items-center gap-1.5 text-white/60 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                {(() => {
                  const Icon = categoryIcons[filtered[lightboxIndex].category]
                  return <Icon className="w-3.5 h-3.5" />
                })()}
                {filtered[lightboxIndex].category}
              </span>
            </div>
          </div>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); nextPhoto() }}
            className="absolute right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-7 h-7" />
          </button>

          {/* Keyboard hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs">
            Click outside or press anywhere to close
          </div>
        </div>
      )}
    </>
  )
}