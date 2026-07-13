import type { Metadata } from 'next'
import GalleryClient from './GalleryClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Gallery | Kekamiya Beach Resort',
  description: 'Browse photos of Kekamiya Beach Resort — our pools, A-frame villas, sunsets, and beachfront in Botolan, Zambales.',
}

export default function GalleryPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <GalleryClient />
      <Footer />
    </main>
  )
}
