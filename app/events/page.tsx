import type { Metadata } from 'next'
import EventsClient from './EventsClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Events & Celebrations | Kekamiya Beach Resort',
  description: 'Host your birthday, wedding, corporate outing, or family reunion at Kekamiya Beach Resort in Botolan, Zambales. Beachfront venues for every occasion.',
}

export default function EventsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <EventsClient />
      <Footer />
    </main>
  )
}
