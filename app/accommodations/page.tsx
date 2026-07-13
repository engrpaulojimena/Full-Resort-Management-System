import type { Metadata } from 'next'
import AccommodationsClient from './AccommodationsClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Accommodations | Kekamiya Beach Resort',
  description: 'Stay in our iconic A-frame villas at Kekamiya Beach Resort in Botolan, Zambales. Choose from ground floor suites, upper lofts, and poolside villa packages.',
}

export default function AccommodationsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <AccommodationsClient />
      <Footer />
    </main>
  )
}