'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Users, BedDouble, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
type RoomType = 'standard' | 'deluxe' | 'suite' | 'villa' | 'cottage'
type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'reserved'

interface Room {
  id: number
  roomNumber: string
  type: RoomType
  status: RoomStatus
  floor: number
  capacity: number
  pricePerNight: string
  description: string | null
  amenities: string[] | null
  images: string[] | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<RoomType, string> = {
  standard: 'Standard Room',
  deluxe:   'Deluxe Room',
  suite:    'Suite',
  villa:    'Villa',
  cottage:  'Cottage',
}

const TYPE_TAG: Record<RoomType, { label: string; color: string }> = {
  standard: { label: 'Great Value',       color: 'bg-palm-500' },
  deluxe:   { label: 'Most Popular',      color: 'bg-ocean-500' },
  suite:    { label: 'Romantic Escape',   color: 'bg-coral-500' },
  villa:    { label: 'Perfect for Groups', color: 'bg-sand-500' },
  cottage:  { label: 'Cozy & Private',    color: 'bg-palm-500' },
}

// Fall back to local images when the room has no Cloudinary/remote images saved
const FALLBACK_IMAGES: Record<RoomType, string> = {
  standard: '/images/19285.jpg',
  deluxe:   '/images/19287.jpg',
  suite:    '/images/19288.jpg',
  villa:    '/images/19291.jpg',
  cottage:  '/images/19293.jpg',
}

function getRoomImage(room: Room): string {
  return room.images?.[0] || FALLBACK_IMAGES[room.type] || '/images/19285.jpg'
}

function getRoomDisplayName(room: Room): string {
  // If the admin set a description we can use the type label + room number.
  // Keep it short and friendly for the card.
  return `${TYPE_LABEL[room.type]} · Room ${room.roomNumber}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AccommodationsSection() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch('/api/rooms')
        if (!res.ok) throw new Error('Failed to load rooms')
        const data: Room[] = await res.json()
        // Show all rooms (including maintenance & reserved) — limit to 3 for homepage
        const visible = data.slice(0, 3)
        setRooms(visible)
      } catch (err) {
        console.error(err)
        setError('Could not load room information. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    fetchRooms()
  }, [])

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <p className="section-label mb-3">Where You'll Stay</p>
            <h2 className="section-title">
              Iconic A-Frame Villas,{' '}
              <span className="text-gradient-ocean">Unforgettable Views</span>
            </h2>
          </div>
          <Link href="/accommodations" className="btn-outline whitespace-nowrap self-start md:self-auto">
            See All Rooms
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-24 text-ocean-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
            <AlertCircle className="w-8 h-8 text-coral-400" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Room cards */}
        {!loading && !error && rooms.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const tag        = TYPE_TAG[room.type]
              const image      = getRoomImage(room)
              const name       = getRoomDisplayName(room)
              const price      = parseFloat(room.pricePerNight)
              const amenities  = room.amenities?.slice(0, 3) ?? []
              const isAvailable    = room.status === 'available'
              const isMaintenance  = room.status === 'maintenance'
              const isUnavailable  = !isAvailable // reserved, occupied, or maintenance

              // Status badge config
              const statusBadge = isMaintenance
                ? { label: 'Under Maintenance', bg: 'bg-orange-600/85' }
                : room.status === 'reserved'
                ? { label: 'Reserved',  bg: 'bg-blue-700/80' }
                : room.status === 'occupied'
                ? { label: 'Occupied',  bg: 'bg-gray-700/80' }
                : null

              return (
                <div
                  key={room.id}
                  className={`group rounded-3xl overflow-hidden border shadow-sm transition-all duration-300 bg-white ${
                    isUnavailable
                      ? 'border-gray-200 opacity-75'
                      : 'border-gray-100 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  {/* Room photo */}
                  <div className="relative h-52 overflow-hidden">
                    <Image
                      src={image}
                      alt={name}
                      fill
                      className={`object-cover transition-transform duration-700 ${isUnavailable ? 'grayscale-[30%]' : 'group-hover:scale-105'}`}
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    {/* Type tag */}
                    <span className={`absolute top-4 left-4 ${tag.color} text-white text-xs font-bold px-3 py-1 rounded-full z-10`}>
                      {tag.label}
                    </span>
                    {/* Status badge */}
                    {statusBadge && (
                      <span className={`absolute top-4 right-4 ${statusBadge.bg} text-white text-xs font-semibold px-3 py-1 rounded-full z-10 backdrop-blur-sm`}>
                        {statusBadge.label}
                      </span>
                    )}
                    {/* Overlay for unavailable */}
                    {isUnavailable && (
                      <div className="absolute inset-0 bg-white/10" />
                    )}
                  </div>

                  {/* Room details */}
                  <div className="p-6">
                    <h3 className="font-display text-xl font-bold text-gray-900 mb-1">{name}</h3>

                    {room.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{room.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-gray-500 text-sm mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Up to {room.capacity} Guests
                      </span>
                      <span className="flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5" /> Floor {room.floor}
                      </span>
                    </div>

                    {amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {amenities.map((f) => (
                          <span key={f} className={`text-xs font-medium px-3 py-1 rounded-full ${isUnavailable ? 'bg-gray-100 text-gray-400' : 'bg-ocean-50 text-ocean-600'}`}>
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <span className="text-xs text-gray-400">Starting at</span>
                        <div className={`font-display text-2xl font-bold ${isUnavailable ? 'text-gray-400' : 'text-ocean-600'}`}>
                          ₱{price.toLocaleString()}
                          <span className="text-sm font-normal text-gray-400">/night</span>
                        </div>
                      </div>
                      {isAvailable ? (
                        <Link
                          href={`/book?roomId=${room.id}`}
                          className="btn-primary text-sm px-5 py-2.5"
                        >
                          Book
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold px-4 py-2.5 rounded-xl cursor-not-allowed bg-gray-100 text-gray-400">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && rooms.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <BedDouble className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No rooms available at the moment. Please check back soon.</p>
          </div>
        )}
      </div>
    </section>
  )
}
