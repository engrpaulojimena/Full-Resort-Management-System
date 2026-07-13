import type { Metadata } from 'next'
import PoliciesClient from './PoliciesClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Policies & Guidelines | Kekamiya Beach Resort',
  description: 'Read the general guidelines, regulations, and booking terms and conditions for your stay at Kekamiya Beach Resort, Botolan, Zambales.',
}

export default function PoliciesPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <PoliciesClient />
      <Footer />
    </main>
  )
}
