'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  CalendarCheck,
  Users,
  BedDouble,
  CheckCircle,
  ShieldCheck,
  Clock,
  Star,
  ChevronDown,
  Loader2,
  AlertCircle,
  XCircle,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
type RoomType = 'standard' | 'deluxe' | 'suite' | 'villa' | 'cottage'

interface LiveRoom {
  id: number
  roomNumber: string
  type: RoomType
  status: string
  floor: number
  capacity: number
  pricePerNight: string
  description: string | null
  amenities: string[] | null
  images: string[] | null
  available: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<RoomType, string> = {
  standard: 'Standard Room',
  deluxe:   'Deluxe Room',
  suite:    'Suite',
  villa:    'Villa',
  cottage:  'Cottage',
}

const FALLBACK_IMAGES: Record<RoomType, string> = {
  standard: '/images/19285.jpg',
  deluxe:   '/images/19287.jpg',
  suite:    '/images/19288.jpg',
  villa:    '/images/19291.jpg',
  cottage:  '/images/19293.jpg',
}

function getRoomImage(room: LiveRoom): string {
  return room.images?.[0] || FALLBACK_IMAGES[room.type] || '/images/19285.jpg'
}

function getRoomLabel(room: LiveRoom): string {
  return `${TYPE_LABEL[room.type]} · Room ${room.roomNumber}`
}

const perks = [
  { icon: Star,    label: 'Infinity pool & beach access' },
  { icon: ShieldCheck, label: 'Free cancellation up to 48 hrs before check-in' },
  { icon: Clock,       label: 'Check-in 2:00 PM · Check-out 12:00 PM' },
]

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BookClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Pre-select roomId from query string (e.g. /book?roomId=3 from AccommodationsSection)
  const preselectedRoomId = searchParams.get('roomId')

  const [form, setForm] = useState({
    checkIn: '',
    checkOut: '',
    guests: 2,
    roomId: '',        // will be set to numeric DB id string once rooms load
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  })

  // ── Live rooms from DB ────────────────────────────────────────────────────
  const [allRooms, setAllRooms]         = useState<LiveRoom[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsError, setRoomsError]     = useState<string | null>(null)

  // ── Availability check ────────────────────────────────────────────────────
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [unavailableIds, setUnavailableIds]           = useState<Set<number>>(new Set())
  const [availChecked, setAvailChecked]               = useState(false) // did we run a check?

  // ── Submission state ──────────────────────────────────────────────────────
  const [status, setStatus]           = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [errorMsg, setErrorMsg]       = useState('')

  // ── Load all rooms on mount ───────────────────────────────────────────────
  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch('/api/rooms')
        if (!res.ok) throw new Error('Failed')
        const data: LiveRoom[] = await res.json()
        // Show all rooms; maintenance rooms appear in the dropdown as disabled
        const usable = data
        setAllRooms(usable)

        // Pre-select: query param > first available room (skip maintenance/reserved) > first room
        const initialId = preselectedRoomId
          ? usable.find((r) => String(r.id) === preselectedRoomId)?.id
          : usable.find((r) => r.status === 'available')?.id ?? usable[0]?.id

        if (initialId !== undefined) {
          setForm((prev) => ({ ...prev, roomId: String(initialId) }))
        }
      } catch {
        setRoomsError('Could not load rooms. Please refresh and try again.')
      } finally {
        setRoomsLoading(false)
      }
    }
    fetchRooms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Check availability whenever dates change ──────────────────────────────
  const checkAvailability = useCallback(async (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return
    setAvailabilityLoading(true)
    setAvailChecked(false)
    try {
      const res = await fetch(
        `/api/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}`
      )
      if (!res.ok) throw new Error('Availability check failed')
      const data: { rooms: LiveRoom[] } = await res.json()

      const unavailable = new Set(
        data.rooms.filter((r) => !r.available).map((r) => r.id)
      )
      setUnavailableIds(unavailable)
      setAvailChecked(true)

      // If the currently selected room just became unavailable, auto-switch to
      // the first available one so the user isn't silently locked into a bad pick.
      setForm((prev) => {
        const currentId = parseInt(prev.roomId)
        if (unavailable.has(currentId)) {
          const fallback = data.rooms.find((r) => r.available)
          return fallback ? { ...prev, roomId: String(fallback.id) } : prev
        }
        return prev
      })
    } catch {
      // Non-fatal — just clear the check so we don't show stale info
      setUnavailableIds(new Set())
      setAvailChecked(false)
    } finally {
      setAvailabilityLoading(false)
    }
  }, [])

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0
    const diff = Math.round(
      (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    )
    return diff > 0 ? diff : 0
  }, [form.checkIn, form.checkOut])

  const selectedRoom = allRooms.find((r) => String(r.id) === form.roomId) ?? allRooms[0]
  const estimatedTotal = nights * parseFloat(selectedRoom?.pricePerNight ?? '0')

  // ── Handle input changes ──────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: name === 'guests' ? Number(value) : value }

      // Trigger availability re-check when either date changes
      if ((name === 'checkIn' || name === 'checkOut')) {
        const checkIn  = name === 'checkIn'  ? value : prev.checkIn
        const checkOut = name === 'checkOut' ? value : prev.checkOut
        if (checkIn && checkOut && new Date(checkOut) > new Date(checkIn)) {
          checkAvailability(checkIn, checkOut)
        }
      }

      return next
    })
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.checkIn || !form.checkOut || !form.firstName || !form.email) return

    // Guard: don't allow booking an unavailable room
    const roomIdNum = parseInt(form.roomId)
    if (unavailableIds.has(roomIdNum)) {
      setErrorMsg('Sorry, this room is no longer available for the selected dates. Please choose another room or different dates.')
      setStatus('error')
      return
    }

    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          roomId: form.roomId,           // numeric DB id — bookings route resolves room_number internally
          name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }

      setConfirmationCode(data.confirmationCode)
      setStatus('sent')

      const params = new URLSearchParams({
        code:    data.confirmationCode,
        id:      String(data.reservationId),
        name:    `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        email:   form.email,
        phone:   form.phone || '',
        checkIn: form.checkIn,
        checkOut:form.checkOut,
        guests:  String(form.guests),
        roomId:  form.roomId,
        notes:   form.notes || '',
      })
      router.push(`/booking-confirmation?${params.toString()}`)
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  // ── Sent state ────────────────────────────────────────────────────────────
  if (status === 'sent') {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gray-50 pt-24 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-palm-500/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-9 h-9 text-palm-500" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ocean-900 mb-2">Request Sent!</h1>
          <p className="text-gray-600 mb-4">
            Thank you, {form.firstName || 'guest'}! We&apos;ve received your booking request for{' '}
            <span className="font-semibold text-ocean-700">
              {selectedRoom ? getRoomLabel(selectedRoom) : 'your selected room'}
            </span>
            {nights > 0 && <> ({nights} night{nights > 1 ? 's' : ''})</>}. Our team will confirm within 24 hours.
          </p>
          {confirmationCode && (
            <div className="bg-ocean-50 border border-ocean-200 rounded-xl px-6 py-4 mb-6">
              <p className="text-xs font-bold text-ocean-500 uppercase tracking-widest mb-1">Confirmation Code</p>
              <p className="font-display text-3xl font-bold text-ocean-900 tracking-widest">{confirmationCode}</p>
              <p className="text-xs text-gray-500 mt-1">A copy was sent to {form.email}</p>
            </div>
          )}
          <a href="/" className="btn-primary justify-center w-full">Back to Home</a>
        </div>
      </section>
    )
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hero band */}
      <div className="relative pt-20 pb-16 bg-gradient-to-br from-ocean-700 to-ocean-900 overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <Image src="/images/19289.jpg" alt="Booking background" fill className="object-cover" sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/60 to-ocean-900/85" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-12">
          <p className="section-label justify-center text-sand-300 mb-3">Reserve Your Getaway</p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-4">
            Book Your Stay
          </h1>
          <p className="text-ocean-200 text-lg max-w-xl mx-auto">
            Pick your dates, choose your villa, and let us take care of the rest.
          </p>
        </div>
      </div>

      {/* Main content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Rooms loading error */}
          {roomsError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-4 mb-8">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {roomsError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid lg:grid-cols-5 gap-10">

            {/* ── Left — Form ─────────────────────────────────────────────── */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col gap-7">

              {/* Dates */}
              <div>
                <p className="section-label mb-4">Your Dates</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">Check-in</span>
                    <div className="relative">
                      <CalendarCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
                      <input
                        type="date"
                        name="checkIn"
                        required
                        min={todayStr()}
                        value={form.checkIn}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">Check-out</span>
                    <div className="relative">
                      <CalendarCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
                      <input
                        type="date"
                        name="checkOut"
                        required
                        min={form.checkIn || todayStr()}
                        value={form.checkOut}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                      />
                    </div>
                  </label>
                </div>
                {nights > 0 && (
                  <p className="text-xs font-medium text-sand-600 mt-2">
                    {nights} night{nights > 1 ? 's' : ''} selected
                  </p>
                )}
                {/* Availability indicator */}
                {availabilityLoading && (
                  <p className="flex items-center gap-1.5 text-xs text-ocean-500 mt-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking availability…
                  </p>
                )}
                {availChecked && !availabilityLoading && unavailableIds.size > 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Some rooms are already booked for these dates — unavailable options are marked below.
                  </p>
                )}
                {availChecked && !availabilityLoading && unavailableIds.size === 0 && allRooms.length > 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-palm-600 mt-2">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    All rooms are available for these dates!
                  </p>
                )}
              </div>

              {/* Guests & Room */}
              <div>
                <p className="section-label mb-4">Guests &amp; Villa</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">Guests</span>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
                      <select
                        name="guests"
                        value={form.guests}
                        onChange={handleChange}
                        className="w-full pl-9 pr-9 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800 appearance-none bg-white"
                      >
                        {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n} Guest{n > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">Room / Villa</span>
                    <div className="relative">
                      <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
                      {roomsLoading ? (
                        <div className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading rooms…
                        </div>
                      ) : (
                        <select
                          name="roomId"
                          value={form.roomId}
                          onChange={handleChange}
                          className="w-full pl-9 pr-9 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800 appearance-none bg-white"
                        >
                          {allRooms.map((r) => {
                            const isMaint    = r.status === 'maintenance'
                            const booked     = unavailableIds.has(r.id)
                            const isDisabled = isMaint || booked
                            const suffix = isMaint
                              ? ' (Under Maintenance)'
                              : booked
                              ? ' (Unavailable on selected dates)'
                              : ''
                            return (
                              <option key={r.id} value={String(r.id)} disabled={isDisabled}>
                                {getRoomLabel(r)} — ₱{parseFloat(r.pricePerNight).toLocaleString()}/night{suffix}
                              </option>
                            )
                          })}
                        </select>
                      )}
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    {/* Warn if selected room is unavailable */}
                    {selectedRoom && (selectedRoom.status === 'maintenance' || unavailableIds.has(selectedRoom.id)) && (
                      <p className="flex items-center gap-1 text-xs text-red-600">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        {selectedRoom.status === 'maintenance'
                          ? 'This room is currently under maintenance and cannot be booked.'
                          : 'This room is already booked for your selected dates. Please pick another.'}
                      </p>
                    )}
                  </label>
                </div>
              </div>

              {/* Contact details */}
              <div>
                <p className="section-label mb-4">Your Details</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">First Name</span>
                    <input
                      type="text"
                      name="firstName"
                      required
                      autoComplete="off"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="Juan"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">Last Name</span>
                    <input
                      type="text"
                      name="lastName"
                      required
                      autoComplete="off"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Dela Cruz"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">Email</span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="off"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="juan@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">Phone</span>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="off"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="09XX XXX XXXX"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm font-semibold text-gray-700">Special Requests (optional)</span>
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Celebrating an occasion? Need extra beddings? Let us know."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800 resize-none"
                    />
                  </label>
                </div>
              </div>

              {status === 'error' && errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  status === 'sending' ||
                  roomsLoading ||
                  !!(selectedRoom && selectedRoom.status === 'maintenance') ||
                  !!(selectedRoom && unavailableIds.has(selectedRoom.id))
                }
                className="btn-primary justify-center w-full text-base py-4 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {status === 'sending' ? 'Sending Request…' : 'Request Booking'}
              </button>

              <p className="text-xs text-gray-400 -mt-3 text-center">
                This sends a request only — we&apos;ll confirm availability and final pricing by email or phone.
                By booking, you agree to our{' '}
                <a href="/policies" target="_blank" rel="noopener noreferrer" className="text-ocean-500 hover:underline font-medium">
                  Policies &amp; Booking Terms
                </a>.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5 -mt-2">
                <span className="text-amber-500 text-base leading-none mt-0.5">⏳</span>
                <p className="text-xs text-amber-700">
                  <strong>Important:</strong> After submitting, you&apos;ll have <strong>30 minutes</strong> to pay your deposit.
                  Bookings with no payment submitted within this window will be automatically cancelled. You can always{' '}
                  <a href="/my-booking" className="underline font-medium text-amber-800">find your booking</a>{' '}
                  using your confirmation code if you need to return to the payment page.
                </p>
              </div>
            </div>

            {/* ── Right — Summary ──────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-28 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {selectedRoom ? (
                  <>
                    <div className="relative h-44">
                      <Image
                        src={getRoomImage(selectedRoom)}
                        alt={getRoomLabel(selectedRoom)}
                        fill
                        className="object-cover"
                        sizes="400px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <p className="text-white font-display font-bold text-lg leading-tight drop-shadow">
                          {getRoomLabel(selectedRoom)}
                        </p>
                        <p className="text-white/80 text-xs flex items-center gap-1">
                          <Users className="w-3 h-3" /> Up to {selectedRoom.capacity} Guests
                        </p>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col gap-4">
                      {selectedRoom.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 -mb-1">{selectedRoom.description}</p>
                      )}
                      {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 -mb-1">
                          {selectedRoom.amenities.slice(0, 4).map((a) => (
                            <span key={a} className="text-xs bg-ocean-50 text-ocean-600 px-2.5 py-1 rounded-full font-medium">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Rate per night</span>
                        <span className="font-semibold text-ocean-900">
                          ₱{parseFloat(selectedRoom.pricePerNight).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Nights</span>
                        <span className="font-semibold text-ocean-900">{nights || '—'}</span>
                      </div>
                      <div className="h-px bg-gray-100" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Estimated Total</span>
                        <span className="font-display font-bold text-xl text-sand-600">
                          {estimatedTotal > 0 ? `₱${estimatedTotal.toLocaleString()}` : '—'}
                        </span>
                      </div>
                      <div className="h-px bg-gray-100" />
                      <div className="flex flex-col gap-3">
                        {perks.map((perk) => (
                          <div key={perk.label} className="flex items-start gap-2.5 text-sm text-gray-600">
                            <perk.icon className="w-4 h-4 text-palm-500 mt-0.5 shrink-0" />
                            <span>{perk.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-44 flex items-center justify-center text-gray-300">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
