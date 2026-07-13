import type { Metadata } from 'next'
import BookClient from './BookClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Book Your Stay | Kekamiya Beach Resort',
  description: 'Reserve your villa at Kekamiya Beach Resort in Botolan, Zambales. Pick your dates, guests, and room type to get started.',
}

export default function BookPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <BookClient />
      <Footer />
    </main>
  )
}
