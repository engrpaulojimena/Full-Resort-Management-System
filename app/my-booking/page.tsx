import { Suspense } from 'react'
import type { Metadata } from 'next'
import MyBookingClient from './MyBookingClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'My Booking | Kekamiya Beach Resort',
  description: 'Check your booking status and resume your deposit payment.',
}

export default function MyBookingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      {/* #7 — Suspense wrapper required because MyBookingClient calls useSearchParams() */}
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center pt-24">
            <Loader2 className="w-8 h-8 animate-spin text-ocean-400" />
          </div>
        }
      >
        <MyBookingClient />
      </Suspense>
      <Footer />
    </main>
  )
}
