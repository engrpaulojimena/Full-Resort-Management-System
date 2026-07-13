'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  CheckCircle2,
  CalendarDays,
  BedDouble,
  Users,
  Clock,
  CreditCard,
  ArrowRight,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react'

const DEPOSIT_RATE = 0.3 // 30% deposit

interface BookingDetails {
  confirmationCode: string
  reservationId: number
  name: string
  email: string
  phone: string
  checkIn: string
  checkOut: string
  guests: number
  roomId: string
  notes?: string
}

interface RoomDetails {
  id: number
  roomNumber: string
  type: string
  pricePerNight: number
  description: string | null
}

function formatDatePH(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  )
}

const TYPE_LABEL: Record<string, string> = {
  standard: 'Standard Room',
  deluxe:   'Deluxe Room',
  suite:    'Suite',
  villa:    'Villa',
  cottage:  'Cottage',
}

function getRoomLabel(room: RoomDetails) {
  return `${TYPE_LABEL[room.type] ?? room.type} · Room ${room.roomNumber}`
}

export default function BookingConfirmationClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [room, setRoom] = useState<RoomDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const code          = searchParams.get('code')
    const reservationId = searchParams.get('id')
    const name          = searchParams.get('name')
    const email         = searchParams.get('email')
    const phone         = searchParams.get('phone') || ''
    const checkIn       = searchParams.get('checkIn')
    const checkOut      = searchParams.get('checkOut')
    const guests        = searchParams.get('guests')
    const roomId        = searchParams.get('roomId')
    const notes         = searchParams.get('notes') || ''

    if (!code || !name || !email || !checkIn || !checkOut || !guests || !roomId || !reservationId) {
      router.replace('/book')
      return
    }

    const details: BookingDetails = {
      confirmationCode: code,
      reservationId: parseInt(reservationId),
      name,
      email,
      phone,
      checkIn,
      checkOut,
      guests: parseInt(guests),
      roomId,
      notes,
    }
    setBooking(details)

    // Fetch actual room details from DB so price is always accurate
    fetch(`/api/rooms?roomId=${roomId}`)
      .then((r) => r.json())
      .then((data) => {
        // /api/rooms returns array; find matching room
        const found = Array.isArray(data)
          ? data.find((r: RoomDetails) => String(r.id) === roomId)
          : null
        if (found) {
          setRoom({
            id: found.id,
            roomNumber: found.roomNumber,
            type: found.type,
            pricePerNight: parseFloat(found.pricePerNight),
            description: found.description ?? null,
          })
        }
      })
      .catch(() => {
        // Non-fatal — amounts will show as 0 but page still works
      })
      .finally(() => setLoading(false))
  }, [searchParams, router])

  if (loading || !booking) {
    return (
      <section className="min-h-screen flex items-center justify-center pt-24">
        <Loader2 className="w-8 h-8 animate-spin text-ocean-400" />
      </section>
    )
  }

  const nights        = nightsBetween(booking.checkIn, booking.checkOut)
  const roomName      = room ? getRoomLabel(room) : `Room ${booking.roomId}`
  const pricePerNight = room?.pricePerNight ?? 0
  const totalAmount   = nights * pricePerNight
  const depositAmount = Math.ceil(totalAmount * DEPOSIT_RATE)
  const balanceAmount = totalAmount - depositAmount

  const handlePayDeposit = () => {
    const params = new URLSearchParams({
      code:     booking.confirmationCode,
      id:       String(booking.reservationId),
      name:     booking.name,
      email:    booking.email,
      amount:   String(depositAmount),
      total:    String(totalAmount),
      room:     roomName,
      checkIn:  booking.checkIn,
      checkOut: booking.checkOut,
    })
    router.push(`/pay-deposit?${params.toString()}`)
  }

  return (
    <section className="min-h-screen bg-gray-50 pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-palm-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-11 h-11 text-palm-500" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ocean-900 mb-2">
            Booking Request Sent!
          </h1>
          <p className="text-gray-500 text-lg">
            Salamat, <span className="font-semibold text-ocean-700">{booking.name.split(' ')[0]}</span>! We received your reservation request.
          </p>
        </div>

        {/* Confirmation code */}
        <div className="bg-ocean-700 rounded-2xl p-6 text-center mb-6">
          <p className="text-ocean-200 text-xs font-bold uppercase tracking-widest mb-1">Confirmation Code</p>
          <p className="font-display text-4xl font-bold text-white tracking-widest mb-2">
            {booking.confirmationCode}
          </p>
          <p className="text-ocean-300 text-sm">A copy was sent to <span className="font-medium text-white">{booking.email}</span></p>
        </div>

        {/* Booking summary card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ocean-900 mb-4">Booking Summary</h2>

          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <BedDouble className="w-5 h-5 text-ocean-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Villa</p>
                <p className="font-semibold text-ocean-900">{roomName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarDays className="w-5 h-5 text-ocean-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Check-in</p>
                <p className="font-semibold text-ocean-900">{formatDatePH(booking.checkIn)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarDays className="w-5 h-5 text-ocean-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Check-out</p>
                <p className="font-semibold text-ocean-900">{formatDatePH(booking.checkOut)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-ocean-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Duration</p>
                <p className="font-semibold text-ocean-900">{nights} night{nights > 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-ocean-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Guests</p>
                <p className="font-semibold text-ocean-900">{booking.guests} Guest{booking.guests > 1 ? 's' : ''}</p>
              </div>
            </div>

            {booking.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-ocean-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Phone</p>
                  <p className="font-semibold text-ocean-900">{booking.phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-ocean-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Email</p>
                <p className="font-semibold text-ocean-900">{booking.email}</p>
              </div>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>₱{pricePerNight.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}</span>
              <span className="text-ocean-900 font-medium">₱{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Required deposit (30%)</span>
              <span className="text-palm-600 font-semibold">₱{depositAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Balance upon check-in</span>
              <span>₱{balanceAmount.toLocaleString()}</span>
            </div>
            <div className="h-px bg-gray-100 my-3" />
            <div className="flex justify-between">
              <span className="font-bold text-ocean-900">Total</span>
              <span className="font-display font-bold text-xl text-sand-600">
                ₱{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Pay Deposit CTA */}
        <div className="bg-gradient-to-br from-ocean-700 to-ocean-900 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-xl mb-1">Secure Your Booking</h3>
              <p className="text-ocean-200 text-sm mb-4">
                Pay a <strong className="text-white">30% deposit</strong> (₱{depositAmount.toLocaleString()}) via GCash or Bank Transfer to confirm your reservation. The remaining balance will be collected at check-in.
              </p>
              <button
                onClick={handlePayDeposit}
                className="inline-flex items-center gap-2 bg-white text-ocean-800 font-bold px-6 py-3 rounded-xl hover:bg-sand-50 transition-colors"
              >
                Pay Deposit Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* What's next */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-display font-bold text-ocean-900 mb-4">What happens next?</h3>
          <ol className="flex flex-col gap-4">
            {[
              { step: '1', title: 'Pay your deposit', desc: 'Send 30% via GCash or Bank Transfer using the button above.' },
              { step: '2', title: 'Upload your proof of payment', desc: 'Screenshot or photo of your payment receipt.' },
              { step: '3', title: 'We verify your payment', desc: 'Our staff will confirm within a few hours and send you a final confirmation email.' },
              { step: '4', title: 'Enjoy your stay!', desc: 'Arrive at 2:00 PM on your check-in date. Balance due at front desk.' },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-ocean-100 text-ocean-700 font-bold text-sm flex items-center justify-center shrink-0">
                  {step}
                </div>
                <div>
                  <p className="font-semibold text-ocean-900">{title}</p>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Skip deposit option */}
        <p className="text-center text-sm text-gray-400">
          Want to pay later?{' '}
          <a href="/my-booking" className="text-ocean-500 hover:underline font-medium">
            Find your booking
          </a>{' '}
          anytime using your confirmation code and email — we&apos;ll reach out within 24 hours to confirm.
        </p>
      </div>
    </section>
  )
}
