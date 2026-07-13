import type { Metadata } from 'next'
import AmenitiesClient from './AmenitiesClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Amenities | Kekamiya Beach Resort',
  description: 'Discover the amenities at Kekamiya Beach Resort in Botolan, Zambales — infinity pool, private beach, seafood restaurant, events venue, and more.',
}

export default function AmenitiesPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <AmenitiesClient />
      <Footer />
    </main>
  )
}