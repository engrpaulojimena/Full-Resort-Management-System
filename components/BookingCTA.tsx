'use client'

import { useState } from 'react'
import { Calendar, Users, Search } from 'lucide-react'

export default function BookingCTA() {
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams({ checkIn, checkOut, guests })
    window.location.href = `/book?${params.toString()}`
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-ocean-500 via-ocean-600 to-ocean-700 rounded-3xl p-8 md:p-12 shadow-2xl shadow-ocean-200 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="text-center mb-8">
              <p className="text-ocean-200 text-sm font-semibold tracking-widest uppercase mb-2">
                Check Availability
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-white font-bold mb-2">
                Ready to Escape to Paradise?
              </h2>
              <p className="text-ocean-200 text-base">
                Book your stay at Kekamiya Beach Resort today
              </p>
            </div>

            {/* Booking form */}
            <form onSubmit={handleSearch}>
              <div className="grid md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-ocean-200 text-xs font-semibold mb-2 uppercase tracking-wider">
                    Check In
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
                    <input
                      type="date"
                      value={checkIn}
                      onChange={e => setCheckIn(e.target.value)}
                      className="w-full bg-white/15 border border-white/20 text-white placeholder-white/50 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-ocean-200 text-xs font-semibold mb-2 uppercase tracking-wider">
                    Check Out
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
                    <input
                      type="date"
                      value={checkOut}
                      onChange={e => setCheckOut(e.target.value)}
                      className="w-full bg-white/15 border border-white/20 text-white placeholder-white/50 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-ocean-200 text-xs font-semibold mb-2 uppercase tracking-wider">
                    Guests
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
                    <select
                      value={guests}
                      onChange={e => setGuests(e.target.value)}
                      className="w-full bg-white/15 border border-white/20 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm appearance-none"
                    >
                      {[1,2,3,4,5,6,7,8].map(n => (
                        <option key={n} value={n} className="text-gray-900">{n} Guest{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-1 flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-white text-ocean-600 font-bold py-3 px-6 rounded-xl hover:bg-ocean-50 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 text-sm"
                  >
                    <Search className="w-4 h-4" />
                    Search Rooms
                  </button>
                </div>
              </div>
            </form>

            {/* Quick info */}
            <div className="mt-6 flex flex-wrap justify-center gap-6 text-ocean-200 text-sm">
              <span className="flex items-center gap-1.5">✓ Free cancellation up to 48 hrs</span>
              <span className="flex items-center gap-1.5">✓ Best price guarantee</span>
              <span className="flex items-center gap-1.5">✓ Instant confirmation</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
