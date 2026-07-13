import { Suspense } from 'react'
import type { Metadata } from 'next'
import BookingConfirmationClient from './BookingConfirmationClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Booking Confirmed | Kekamiya Beach Resort',
  description: 'Your booking request has been received.',
}

export default function BookingConfirmationPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <BookingConfirmationClient />
      </Suspense>
      <Footer />
    </main>
  )
}