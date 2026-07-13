import { Suspense } from 'react'
import type { Metadata } from 'next'
import PayDepositClient from './PayDepositClient'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Pay Deposit | Kekamiya Beach Resort',
  description: 'Secure your booking with a deposit via GCash or Bank Transfer.',
}

export default function PayDepositPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <PayDepositClient />
      </Suspense>
      <Footer />
    </main>
  )
}