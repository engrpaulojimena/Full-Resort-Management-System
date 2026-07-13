import type { Metadata } from 'next'
import ContactClient from './ContactClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Contact Us | Kekamiya Beach Resort',
  description: 'Get in touch with Kekamiya Beach Resort in Botolan, Zambales. Send us a message, call us, or find us on the map.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <ContactClient />
      <Footer />
    </main>
  )
}