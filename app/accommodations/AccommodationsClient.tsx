'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Users, BedDouble, Wifi, Wind, Coffee, Waves,
  Eye, Star, ChevronLeft, ChevronRight, X, Check
} from 'lucide-react'

const rooms = [
  {
    id: 'ground-floor',
    images: ['/images/19291.jpg', '/images/19292.jpg', '/images/19293.jpg'],
    name: 'A-Frame Villa · Ground Floor',
    shortName: 'Ground Floor',
    tag: 'Most Popular',
    tagColor: 'bg-ocean-500',
    capacity: '2–3 Guests',
    beds: '1 Queen Bed',
    size: '35 sqm',
    price: 3500,
    description:
      'Step into our signature A-frame villa and wake up to the gentle sound of waves. The ground floor unit features a comfortable queen bed, modern mini-bar, and direct access to the resort grounds — steps away from our infinity pool.',
    amenities: [
      { icon: Wind, label: 'Air Conditioning' },
      { icon: Waves, label: 'Pool Access' },
      { icon: Coffee, label: 'Mini Bar & Kettle' },
      { icon: Eye, label: 'Garden View' },
      { icon: BedDouble, label: 'Queen Bed' },
      { icon: Wifi, label: 'Free Wi-Fi' },
    ],
    highlights: ['Pool-facing terrace', 'En-suite bathroom', 'Daily housekeeping', 'Welcome amenities'],
  },
  {
    id: 'upper-loft',
    images: ['/images/19294.jpg', '/images/19295.jpg', '/images/19292.jpg'],
    name: 'A-Frame Villa · Upper Loft',
    shortName: 'Upper Loft',
    tag: 'Romantic Escape',
    tagColor: 'bg-coral-500',
    capacity: '2 Guests',
    beds: '1 Double Bed',
    size: '28 sqm',
    price: 3000,
    description:
      'Tucked beneath the dramatic triangular architecture of our A-frame villas, the upper loft is an intimate retreat for two. Arched black beams frame a cozy loft bedroom with sweeping views of the pool and surrounding tropical trees.',
    amenities: [
      { icon: Wind, label: 'Air Conditioning' },
      { icon: Waves, label: 'Pool Access' },
      { icon: Eye, label: 'Pool & Tree View' },
      { icon: BedDouble, label: 'Double Bed' },
      { icon: Wifi, label: 'Free Wi-Fi' },
      { icon: Star, label: 'Loft Architecture' },
    ],
    highlights: ['Loft-style bedroom', 'Panoramic windows', 'Architectural A-frame beams', 'Private & intimate'],
  },
  {
    id: 'poolside-villa',
    images: ['/images/resort-villas-daytime.jpg', '/images/resort-villas-golden-hour.jpg', '/images/resort-pavilion-pool.jpg'],
    name: 'Poolside Villa Package',
    shortName: 'Poolside Villa',
    tag: 'Best for Groups',
    tagColor: 'bg-palm-500',
    capacity: '4–8 Guests',
    beds: 'Multiple Rooms',
    size: '70+ sqm',
    price: 6500,
    description:
      'Perfect for families and groups, the Poolside Villa Package gives you exclusive access to a cluster of A-frame villas right beside our infinity pool. Enjoy your own deck seating, wicker loungers, and unobstructed views of the open water.',
    amenities: [
      { icon: Wind, label: 'Air Conditioning' },
      { icon: Waves, label: 'Direct Pool Access' },
      { icon: Eye, label: 'Sea View' },
      { icon: Users, label: 'Up to 8 Guests' },
      { icon: Coffee, label: 'Mini Bar & Kettle' },
      { icon: Wifi, label: 'Free Wi-Fi' },
    ],
    highlights: ['Private deck with loungers', 'Multiple bedrooms', 'Sea-facing orientation', 'Ideal for events & reunions'],
  },
]

const policies = [
  { label: 'Check-in', value: '2:00 PM' },
  { label: 'Check-out', value: '11:00 AM' },
  { label: 'Security Deposit', value: '₱2,000 per room' },
  { label: 'Cancellation', value: 'Free 10+ days before arrival' },
  { label: 'Children', value: 'Welcome, must be supervised' },
  { label: 'Pets', value: 'Not allowed' },
  { label: 'Smoking', value: 'Strictly prohibited indoors' },
]

function RoomGallery({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0)
  return (
    <div className="relative h-64 md:h-80 overflow-hidden rounded-t-2xl bg-gray-200">
      <Image
        src={images[current]}
        alt={`${name} photo ${current + 1}`}
        fill
        className="object-cover transition-opacity duration-500"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % images.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function LightboxModal({ room, onClose }: { room: typeof rooms[0]; onClose: () => void }) {
  const [imgIndex, setImgIndex] = useState(0)
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          <div className="relative h-72 md:h-96 rounded-t-3xl overflow-hidden bg-gray-200">
            <Image
              src={room.images[imgIndex]}
              alt={room.name}
              fill
              className="object-cover"
              sizes="80vw"
              priority
            />
            <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {room.images.map((_, i) => (
                <button key={i} onClick={() => setImgIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === imgIndex ? 'bg-white w-5' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div>
              <span className={`${room.tagColor} text-white text-xs font-bold px-3 py-1 rounded-full`}>{room.tag}</span>
              <h2 className="font-display text-2xl font-bold text-gray-900 mt-3">{room.name}</h2>
              <div className="flex items-center gap-4 text-gray-500 text-sm mt-2">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" />{room.capacity}</span>
                <span className="flex items-center gap-1"><BedDouble className="w-4 h-4" />{room.beds}</span>
                <span className="text-gray-400">{room.size}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-gray-400 block">Starting at</span>
              <span className="font-display text-3xl font-bold text-ocean-600">
                ₱{room.price.toLocaleString()}
              </span>
              <span className="text-gray-400 text-sm">/night</span>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">{room.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {room.amenities.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 bg-ocean-50 rounded-xl px-3 py-2.5">
                <Icon className="w-4 h-4 text-ocean-500 shrink-0" />
                <span className="text-sm font-medium text-ocean-800">{label}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Room Highlights</h3>
            <div className="grid grid-cols-2 gap-2">
              {room.highlights.map((h) => (
                <div key={h} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-palm-500 shrink-0" />
                  {h}
                </div>
              ))}
            </div>
          </div>

          <Link
            href={`/book?room=${encodeURIComponent(room.name)}`}
            className="btn-primary w-full justify-center text-base py-4"
          >
            Book This Room
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AccommodationsClient() {
  const [activeRoom, setActiveRoom] = useState<typeof rooms[0] | null>(null)

  return (
    <>
      {/* Hero */}
      <div className="relative pt-20 pb-16 bg-gradient-to-br from-ocean-700 to-ocean-900 overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <Image src="/images/resort-villas-daytime.jpg" alt="Accommodations background" fill className="object-cover" sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/60 to-ocean-900/80" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-12">
          <p className="text-ocean-300 font-semibold text-sm tracking-[0.2em] uppercase mb-3">Where You'll Stay</p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-4">
            Our Accommodations
          </h1>
          <p className="text-ocean-200 text-lg max-w-2xl mx-auto">
            Iconic A-frame villas designed for comfort, romance, and relaxation — all steps from our infinity pool overlooking the beach.
          </p>
        </div>
      </div>

      {/* Rooms */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-12">
            <p className="section-label mb-3">Choose Your Villa</p>
            <h2 className="section-title">
              <span className="text-gradient-ocean">A-Frame Villas</span> in Botolan, Zambales
            </h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">
              Each villa is uniquely designed with the signature A-frame architecture, combining rustic charm with modern comfort.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-7">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 flex flex-col"
              >
                {/* Gallery */}
                <div className="relative">
                  <RoomGallery images={room.images} name={room.name} />
                  <span className={`absolute top-4 left-4 z-10 ${room.tagColor} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow`}>
                    {room.tag}
                  </span>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-display text-xl font-bold text-gray-900 mb-1">{room.name}</h3>

                  <div className="flex items-center gap-4 text-gray-400 text-xs mb-3">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{room.capacity}</span>
                    <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{room.beds}</span>
                    <span>{room.size}</span>
                  </div>

                  <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{room.description}</p>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {room.amenities.slice(0, 4).map(({ icon: Icon, label }) => (
                      <span key={label} className="flex items-center gap-1 bg-ocean-50 text-ocean-600 text-xs font-medium px-2.5 py-1 rounded-full">
                        <Icon className="w-3 h-3" />{label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 block">Starting at</span>
                      <span className="font-display text-2xl font-bold text-ocean-600">
                        ₱{room.price.toLocaleString()}
                        <span className="text-sm font-normal text-gray-400">/night</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveRoom(room)}
                        className="px-4 py-2 rounded-full border-2 border-ocean-500 text-ocean-600 hover:bg-ocean-50 text-sm font-semibold transition-colors"
                      >
                        Details
                      </button>
                      <Link
                        href={`/book?room=${encodeURIComponent(room.name)}`}
                        className="px-4 py-2 rounded-full bg-ocean-500 hover:bg-ocean-600 text-white text-sm font-semibold transition-colors shadow"
                      >
                        Book
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Every Stay Includes</p>
            <h2 className="section-title">All the Essentials, <span className="text-gradient-ocean">Covered</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Waves, title: 'Infinity Pool Access', desc: 'Unlimited use of our stunning infinity pool with breathtaking views.' },
              { icon: Wifi, title: 'Free Wi-Fi', desc: 'Stay connected throughout your stay with complimentary high-speed internet.' },
              { icon: Coffee, title: 'Welcome Amenities', desc: 'Complimentary toiletries, kettle, and mini-bar stocked on arrival.' },
              { icon: Star, title: 'Daily Housekeeping', desc: 'Our team ensures your villa is refreshed and spotless every day.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-ocean-50 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-ocean-500 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-label mb-3">Good to Know</p>
            <h2 className="section-title">Policies & <span className="text-gradient-ocean">Information</span></h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {policies.map((p, i) => (
              <div key={p.label} className={`flex items-center justify-between px-7 py-5 ${i !== policies.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <span className="font-semibold text-gray-700 text-sm">{p.label}</span>
                <span className="text-ocean-600 font-medium text-sm">{p.value}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">
            See the full{' '}
            <Link href="/policies" className="text-ocean-500 hover:underline font-medium">house rules and booking terms</Link>
            {' '}or, for special requests or group bookings, please{' '}
            <Link href="/contact" className="text-ocean-500 hover:underline font-medium">contact us directly</Link>.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-ocean-700 to-ocean-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image src="/images/19288.jpg" alt="Pool CTA" fill className="object-cover" sizes="100vw" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Ready for Your Escape?
          </h2>
          <p className="text-ocean-200 text-lg mb-8">
            Book your A-frame villa today and wake up to paradise in Botolan, Zambales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book" className="btn-primary text-base px-8 py-4">
              Book Your Stay
            </Link>
            <Link href="/contact" className="btn-secondary text-base px-8 py-4">
              Ask a Question
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {activeRoom && (
        <LightboxModal room={activeRoom} onClose={() => setActiveRoom(null)} />
      )}
    </>
  )
}