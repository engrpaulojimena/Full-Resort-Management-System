import type { Metadata } from 'next'
import MyBookingClient from './MyBookingClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'My Booking | Kekamiya Beach Resort',
  description: 'Check your booking status and resume your deposit payment.',
}

export default function MyBookingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <MyBookingClient />
      <Footer />
    </main>
  )
}
