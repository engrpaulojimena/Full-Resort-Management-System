'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ShieldCheck,
  Users,
  Users,
  BedDouble,
  Utensils,
  AlertTriangle,
  Umbrella,
  Waves,
  XCircle,
  FileDown,
  CalendarCheck,
  Clock,
  Waves,
  CreditCard,
  Users,
  XCircle,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'

const guidelines = [
  {
    icon: ShieldCheck,
    title: 'Guest Decorum',
    desc: 'Guests are expected to behave in a manner that does not disrupt the peace, order, or comfort of other guests. Management reserves the right to ask disruptive or disorderly guests to leave the premises without refund, with forfeiture of security deposit.',
  },
  {
    icon: Users,
    title: 'Child Safety',
    desc: 'Children and minors must be accompanied and supervised by parents or responsible adults at all times, especially in the pool and beach areas. Parents or guardians are fully responsible for the safety and behavior of children in their care.',
  },
  {
    icon: Users,
    title: 'No Pets Allowed',
    desc: 'Pets are not permitted on the resort premises to ensure the safety, comfort, and enjoyment of all guests.',
  },
  {
    icon: BedDouble,
    title: 'Furniture and Fixtures',
    desc: 'Room and indoor furniture or fixtures must not be moved. Furniture must not be transferred between rooms.',
  },
  {
    icon: Utensils,
    title: 'Cooking Policy',
    desc: 'A designated common cooking area is provided for guest use. Minimal cooking equipment is available; guests are expected to provide their own cooking utensils and kitchenware. Cooking inside guest rooms or on verandas is strictly prohibited.',
  },
  {
    icon: AlertTriangle,
    title: 'No Smoking Policy',
    desc: 'Smoking or vaping, as well as lighting candles or incense inside rooms, is strictly prohibited. A ₱2,000.00 cleaning and deodorizing fee will be charged for violations.',
  },
  {
    icon: Umbrella,
    title: 'No Tent Pitching',
    desc: 'Pitching tents is not allowed. Guests must stay and sleep only in their assigned rooms.',
  },
  {
    icon: Waves,
    title: 'Pool Rules',
    desc: 'Shower first before entering the pool. No food, drinks, glass, or breakable items in the pool area. Intoxicated guests are not allowed to use the pool. No diving, running, pushing, or rough play.',
  },
  {
    icon: XCircle,
    title: 'Prohibited Content',
    desc: 'Filming or recording sensitive, offensive, or prank content that may endanger, harass, or inconvenience resort staff or other guests is strictly prohibited.',
  },
  {
    icon: FileDown,
    title: 'Damage or Lost Fees',
    desc: "Damage to resort property, lost towels, or soiled linens will be charged at two hundred percent (200%) of the item's cost. Lost or damaged room key is ₱1,000.00.",
  },
]

const bookingTerms = [
  {
    icon: CalendarCheck,
    title: 'Reservation and Confirmation',
    desc: 'All reservations must be paid in advance. A reservation becomes binding once a fifty percent (50%) deposit has been paid and confirmation has been sent via email.',
  },
  {
    icon: Clock,
    title: 'Check-in and Check-out',
    desc: 'Check-in is 2:00 PM and check-out is 11:00 AM. Early check-in and late check-out are subject to availability and will be charged an hourly rate equivalent to ten percent (10%) of the published room rate.',
  },
  {
    icon: Waves,
    title: 'Environmental Fee',
    desc: 'Upon check-in, guests are required to pay a mandatory environmental fee of ₱40.00 per guest, as required by local government.',
  },
  {
    icon: CreditCard,
    title: 'Security Deposit',
    desc: 'A security deposit of ₱2,000.00 per room is required upon check-in. The deposit is fully refundable upon check-out, subject to inspection of the room and resort facilities. Any charges for damages, missing items, or excessive cleaning will be deducted from the deposit; if charges exceed the deposit, guests must settle the balance prior to departure.',
  },
  {
    icon: FileDown,
    title: 'Room Rates',
    desc: 'Published room rates are subject to change without prior notice.',
  },
  {
    icon: Users,
    title: 'Maximum Occupancy',
    desc: 'The maximum number of guests per room is based on the room type as posted. Exceeding the stated maximum may result in cancellation without refund, or excess guests may be required to book an additional room, subject to availability. No rate adjustments are made for fewer guests.',
  },
  {
    icon: XCircle,
    title: 'Cancellation and Refund',
    desc: 'Cancellations made ten (10) or more calendar days before arrival receive a refund of the deposit, less a twenty percent (20%) processing fee. Cancellations made less than 10 days prior are non-refundable. Failure to arrive by 8:00 PM on the arrival date (without prior arrangement) is treated as a no-show, and no refund will be granted. There is no refund for shortened or cancelled stays after check-in.',
  },
  {
    icon: AlertTriangle,
    title: 'Force Majeure & Emergencies',
    desc: 'Cancellations due to accidents, medical emergencies, or the death of the guest or an immediate family member may be considered for a refund at the discretion of management, upon submission of valid supporting documents. In cases of force majeure or acts of God affecting the dates of occupancy, guests will receive a full refund.',
  },
  {
    icon: ArrowRight,
    title: 'Rebooking',
    desc: 'Rebooking is allowed once only. Reservations may be rescheduled up to sixty (60) calendar days from the original arrival date, subject to availability. Preferred dates are not guaranteed.',
  },
]

function PolicyCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 hover:shadow-md transition-shadow">
      <div className="shrink-0 w-11 h-11 rounded-xl bg-ocean-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-ocean-600" />
      </div>
      <div>
        <h3 className="font-display font-bold text-gray-900 mb-1.5">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function PoliciesClient() {
  return (
    <>
      {/* Hero band */}
      <div className="relative pt-20 pb-16 bg-gradient-to-br from-ocean-700 to-ocean-900 overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <Image src="/images/19286.jpg" alt="Policies background" fill className="object-cover" sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/60 to-ocean-900/85" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-12">
          <p className="section-label justify-center text-sand-300 mb-3">Please Read Before Booking</p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-4">
            Policies &amp; Guidelines
          </h1>
          <p className="text-ocean-200 text-lg max-w-2xl mx-auto">
            A few house rules and booking terms to keep every stay at Kekamiya safe, fair, and enjoyable for all guests.
          </p>
        </div>
      </div>

      {/* General Guidelines */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-label justify-center mb-3">House Rules</p>
            <h2 className="section-title">General Guidelines &amp; <span className="text-gradient-ocean">Regulations</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {guidelines.map((g) => (
              <PolicyCard key={g.title} icon={g.icon} title={g.title} desc={g.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* Booking Terms */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-label justify-center mb-3">Before You Book</p>
            <h2 className="section-title">Booking Terms &amp; <span className="text-gradient-ocean">Conditions</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {bookingTerms.map((t) => (
              <PolicyCard key={t.title} icon={t.icon} title={t.title} desc={t.desc} />
            ))}
          </div>

          <p className="text-center text-gray-400 text-sm mt-10">
            Questions about these terms? <Link href="/contact" className="text-ocean-500 hover:underline font-medium">Contact us</Link> before completing your reservation.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-ocean-700 to-ocean-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image src="/images/resort-villas-daytime.jpg" alt="Book CTA" fill className="object-cover" sizes="100vw" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Reserve Your Villa?
          </h2>
          <p className="text-ocean-200 text-lg mb-8">
            Now that you know the house rules, let&apos;s get your stay booked.
          </p>
          <Link href="/book" className="btn-primary text-base px-8 py-4">
            Book Your Stay
          </Link>
        </div>
      </section>
    </>
  )
}
