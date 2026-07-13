'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  CreditCard,
  CalendarCheck,
  BedDouble,
  Users,
  Loader2,
  ArrowRight,
  Mail,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingStatusResult {
  confirmationCode: string
  reservationId: number
  guestName: string
  guestEmail: string
  checkIn: string
  checkOut: string
  guests: number
  roomName: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
  totalAmount: number
  depositAmount: number
  amountPaid: number
  paymentStatus: 'unpaid' | 'pending_verification' | 'deposit_paid' | 'fully_paid'
  paymentMethod?: string
  paymentRef?: string
  cancelledAt?: string
  paymentDeadline?: string // ISO string — when the 30-min window expires
  minutesLeft?: number     // convenience, computed server-side
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatePH(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    weekday: 'short',
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

// ─── Status config ────────────────────────────────────────────────────────────

const RESERVATION_STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    desc: 'Your booking request has been received and is awaiting deposit payment.',
  },
  confirmed: {
    icon: CheckCircle,
    label: 'Confirmed',
    color: 'text-palm-600',
    bg: 'bg-palm-50 border-palm-200',
    desc: 'Your booking is confirmed! See you soon.',
  },
  checked_in: {
    icon: CheckCircle,
    label: 'Checked In',
    color: 'text-ocean-600',
    bg: 'bg-ocean-50 border-ocean-200',
    desc: 'Welcome! Enjoy your stay at Kekamiya.',
  },
  checked_out: {
    icon: CheckCircle,
    label: 'Completed',
    color: 'text-gray-500',
    bg: 'bg-gray-50 border-gray-200',
    desc: 'Your stay has been completed. Thank you for visiting!',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
    desc: 'This booking has been cancelled.',
  },
}

const PAYMENT_STATUS_CONFIG = {
  unpaid: {
    label: 'Deposit Unpaid',
    color: 'text-red-500',
    bg: 'bg-red-50',
  },
  pending_verification: {
    label: 'Verifying Payment',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  deposit_paid: {
    label: 'Deposit Verified',
    color: 'text-palm-600',
    bg: 'bg-palm-50',
  },
  fully_paid: {
    label: 'Fully Paid',
    color: 'text-ocean-600',
    bg: 'bg-ocean-50',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MyBookingClient() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BookingStatusResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !email.trim()) return

    setLoading(true)
    setErrorMsg('')
    setResult(null)

    try {
      const res = await fetch(
        `/api/booking-status?code=${encodeURIComponent(code.trim().toUpperCase())}&email=${encodeURIComponent(email.trim().toLowerCase())}`
      )
      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Booking not found. Please check your confirmation code and email.')
        setLoading(false)
        return
      }

      setResult(data.booking)
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResumePayment = () => {
    if (!result) return
    const params = new URLSearchParams({
      code: result.confirmationCode,
      id: String(result.reservationId),
      name: result.guestName,
      email: result.guestEmail,
      amount: String(result.depositAmount),
      total: String(result.totalAmount),
      room: result.roomName,
      checkIn: result.checkIn,
      checkOut: result.checkOut,
    })
    router.push(`/pay-deposit?${params.toString()}`)
  }

  const nights = result ? nightsBetween(result.checkIn, result.checkOut) : 0

  return (
    <>
      {/* Hero */}
      <div className="bg-gradient-to-br from-ocean-700 to-ocean-900 pt-24 pb-10 px-4 text-center">
        <p className="text-ocean-300 text-sm font-semibold uppercase tracking-widest mb-2">Booking Lookup</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">My Booking</h1>
        <p className="text-ocean-200 text-sm max-w-sm mx-auto">
          Enter your confirmation code and email to check your booking status or resume payment.
        </p>
      </div>

      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-xl mx-auto">

          {/* Search form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-gray-700">Confirmation Code</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    placeholder="e.g. KBR-ABC123"
                    maxLength={20}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm font-mono font-bold text-ocean-900 placeholder:font-normal placeholder:font-sans placeholder:text-gray-400 uppercase"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-gray-700">Email Address</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Email used when booking"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                  />
                </div>
              </label>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary justify-center w-full py-3 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> Looking up booking…
                  </span>
                ) : (
                  'Find My Booking'
                )}
              </button>
            </form>
          </div>

          {/* Result */}
          {result && (() => {
            const resStatus = RESERVATION_STATUS_CONFIG[result.status] ?? RESERVATION_STATUS_CONFIG.pending
            const payStatus = PAYMENT_STATUS_CONFIG[result.paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid
            const StatusIcon = resStatus.icon

            const isExpired = result.paymentStatus === 'unpaid' && (result.minutesLeft ?? 1) === 0
            const showPayButton =
              result.status !== 'cancelled' &&
              result.paymentStatus === 'unpaid' &&
              !isExpired

            const isCancelledByTimeout =
              result.status === 'cancelled' &&
              result.cancelledAt &&
              !result.paymentRef // cancelled before any payment ref was ever submitted

            return (
              <div className="flex flex-col gap-4">

                {/* Status banner */}
                <div className={`rounded-2xl border p-5 flex items-start gap-4 ${resStatus.bg}`}>
                  <StatusIcon className={`w-7 h-7 shrink-0 mt-0.5 ${resStatus.color}`} />
                  <div>
                    <p className={`font-display font-bold text-lg ${resStatus.color}`}>{resStatus.label}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{resStatus.desc}</p>
                  </div>
                </div>

                {/* Payment deadline warning */}
                {result.paymentStatus === 'unpaid' && result.minutesLeft !== undefined && result.minutesLeft > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-700">Payment required within {result.minutesLeft} minute{result.minutesLeft !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        Your booking will be automatically cancelled if no deposit is submitted by{' '}
                        {result.paymentDeadline
                          ? new Date(result.paymentDeadline).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
                          : 'the deadline'}.
                      </p>
                    </div>
                  </div>
                )}

                {/* Auto-cancelled notice */}
                {isCancelledByTimeout && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-600">Booking Auto-Cancelled</p>
                      <p className="text-xs text-red-500 mt-0.5">
                        No deposit was received within 30 minutes so this booking was released. Feel free to{' '}
                        <a href="/book" className="underline font-medium">book again</a>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Booking summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-xs text-ocean-400 font-bold uppercase tracking-widest mb-1">Confirmation Code</p>
                    <p className="font-display text-2xl font-bold text-ocean-900 tracking-widest">{result.confirmationCode}</p>
                  </div>

                  <div className="flex flex-col gap-3 text-sm">
                    <div className="flex items-start gap-3">
                      <BedDouble className="w-4 h-4 text-ocean-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Villa</p>
                        <p className="font-semibold text-ocean-900">{result.roomName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CalendarCheck className="w-4 h-4 text-ocean-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Check-in</p>
                        <p className="font-semibold text-ocean-900">{formatDatePH(result.checkIn)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CalendarCheck className="w-4 h-4 text-ocean-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Check-out</p>
                        <p className="font-semibold text-ocean-900">{formatDatePH(result.checkOut)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-ocean-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Guests</p>
                        <p className="font-semibold text-ocean-900">{result.guests} Guest{result.guests > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Price breakdown */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-1 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Total Stay ({nights} night{nights > 1 ? 's' : ''})</span>
                      <span className="font-semibold text-ocean-900">₱{result.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Required Deposit (30%)</span>
                      <span className={`font-semibold ${result.paymentStatus === 'deposit_paid' || result.paymentStatus === 'fully_paid' ? 'text-palm-600' : 'text-sand-600'}`}>
                        ₱{result.depositAmount.toLocaleString()}
                      </span>
                    </div>
                    {result.amountPaid > 0 && (
                      <>
                        <div className="flex justify-between text-palm-600 font-medium mt-1">
                          <span>Amount Paid</span>
                          <span className="font-semibold">₱{result.amountPaid.toLocaleString()}</span>
                        </div>
                        {result.paymentStatus !== 'fully_paid' && (
                          <div className="flex justify-between text-gray-500 border-t border-gray-100 pt-1 mt-1">
                            <span>Remaining Balance</span>
                            <span className="font-semibold text-sand-700">
                              ₱{(result.totalAmount - result.amountPaid).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Payment status chip */}
                  <div className={`mt-4 rounded-xl px-4 py-2.5 flex items-center gap-2 ${payStatus.bg}`}>
                    <CreditCard className={`w-4 h-4 ${payStatus.color}`} />
                    <span className={`text-sm font-semibold ${payStatus.color}`}>{payStatus.label}</span>
                    {result.paymentMethod && (
                      <span className="text-xs text-gray-400 ml-auto">
                        via {result.paymentMethod === 'gcash' ? 'GCash' : 'Bank Transfer'}
                        {result.paymentRef ? ` · ${result.paymentRef}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Resume payment CTA */}
                {showPayButton && (
                  <div className="bg-gradient-to-br from-ocean-700 to-ocean-900 rounded-2xl p-6 text-white">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-lg mb-1">Complete Your Deposit</h3>
                        <p className="text-ocean-200 text-sm mb-4">
                          Pay <strong className="text-white">₱{result.depositAmount.toLocaleString()}</strong> via GCash or Bank Transfer to lock in your reservation.
                        </p>
                        <button
                          onClick={handleResumePayment}
                          className="inline-flex items-center gap-2 bg-white text-ocean-800 font-bold px-5 py-2.5 rounded-xl hover:bg-sand-50 transition-colors text-sm"
                        >
                          Pay Deposit Now
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expired notice — unpaid but window has closed */}
                {isExpired && result.status !== 'cancelled' && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                    <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="font-semibold text-red-600 mb-1">Payment Window Expired</p>
                    <p className="text-sm text-red-500 mb-4">
                      The 30-minute deposit window for this booking has lapsed. Your booking will be automatically cancelled shortly.
                    </p>
                    <a
                      href="/book"
                      className="inline-flex items-center gap-2 bg-ocean-700 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-ocean-800 transition-colors text-sm"
                    >
                      Book Again <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {/* Pending verification notice */}
                {result.paymentStatus === 'pending_verification' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                    <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-semibold text-amber-700 mb-1">Payment Under Verification</p>
                    <p className="text-sm text-amber-600">
                      We received your payment proof and our staff is verifying it. You'll get a confirmation email once approved — usually within a few hours.
                    </p>
                  </div>
                )}

                {/* Try again */}
                <p className="text-center text-sm text-gray-400">
                  Not your booking?{' '}
                  <button
                    onClick={() => { setResult(null); setCode(''); setEmail('') }}
                    className="text-ocean-500 hover:underline font-medium"
                  >
                    Search again
                  </button>
                </p>
              </div>
            )
          })()}

        </div>
      </section>
    </>
  )
}