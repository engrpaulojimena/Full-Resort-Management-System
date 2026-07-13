'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Star,
  CalendarCheck,
  Users,
  BedDouble,
  Plus,
  Waves,
  Sun,
  Utensils,
  Music,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'

const eventTypes = [
  {
    icon: CalendarCheck,
    title: 'Weddings & Engagements',
    desc: 'Say "I do" with the sea as your backdrop. Our beachfront pavilion and pool deck make an intimate, picture-perfect venue.',
  },
  {
    icon: BedDouble,
    title: 'Birthdays & Debuts',
    desc: 'Celebrate another year with a poolside party, complete with space for catering, music, and games for all ages.',
  },
  {
    icon: Users,
    title: 'Corporate Outings',
    desc: 'Swap the boardroom for the beach. Great for team building, year-end parties, and company retreats.',
  },
  {
    icon: Users,
    title: 'Family Reunions',
    desc: 'Book a cluster of A-frame villas so the whole family stays together, with the pool and pavilion just steps away.',
  },
]

const inclusions = [
  { icon: Waves, label: 'Exclusive use of the infinity pool & pavilion area' },
  { icon: Utensils, label: 'Open space for catering setup or your own caterer' },
  { icon: Sun, label: 'Tables, chairs, and beachfront seating' },
  { icon: Music, label: 'Power outlets for sound systems and lighting' },
]

export default function EventsClient() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: 'Birthday',
    eventDate: '',
    guests: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.eventDate) return
    setStatus('sending')
    // Simulate a send — replace with your API route / lib/email.ts call
    await new Promise((r) => setTimeout(r, 1500))
    setStatus('sent')
  }

  return (
    <>
      {/* Hero */}
      <div className="relative pt-20 pb-16 bg-gradient-to-br from-ocean-700 to-ocean-900 overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <Image src="/images/resort-pavilion-pool.jpg" alt="Events venue background" fill className="object-cover" sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/60 to-ocean-900/85" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-12">
          <p className="section-label justify-center text-sand-300 mb-3">Celebrate by the Sea</p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-4">
            Events &amp; Celebrations
          </h1>
          <p className="text-ocean-200 text-lg max-w-2xl mx-auto">
            From intimate gatherings to full-blown celebrations, Kekamiya's beachfront pavilion and pool deck
            set the scene for moments worth remembering.
          </p>
        </div>
      </div>

      {/* Event types */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-label justify-center mb-3">What We Host</p>
            <h2 className="section-title">An Occasion for Every <span className="text-gradient-ocean">Celebration</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {eventTypes.map((e) => (
              <div key={e.title} className="card-hover bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-ocean-50 flex items-center justify-center mx-auto mb-4">
                  <e.icon className="w-5 h-5 text-ocean-600" />
                </div>
                <h3 className="font-display font-bold text-gray-900 mb-2">{e.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Venue highlight */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="rounded-3xl overflow-hidden shadow-2xl shadow-ocean-200 relative h-80 lg:h-[26rem]">
            <Image
              src="/images/resort-pavilion-pool.jpg"
              alt="Beachfront pavilion and pool venue at Kekamiya"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div>
            <p className="section-label mb-3">The Venue</p>
            <h2 className="section-title mb-5">Our Beachfront <span className="text-gradient-ocean">Pavilion</span></h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Set right beside the infinity pool with the open shore just steps away, our covered pavilion gives
              your guests shade, seating, and an unobstructed view of the water — perfect for everything from
              a relaxed birthday lunch to a full evening reception.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {inclusions.map((item) => (
                <div key={item.label} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <item.icon className="w-4 h-4 text-palm-500 mt-0.5 shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400">
              Room blocks for overnight guests can be reserved alongside your event — see our{' '}
              <Link href="/accommodations" className="text-ocean-500 hover:underline font-medium">villas</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Inquiry form */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-label justify-center mb-3">Let's Plan It</p>
            <h2 className="section-title">Send an Event <span className="text-gradient-ocean">Inquiry</span></h2>
            <p className="text-gray-500 mt-3">
              Tell us about your event and our team will follow up with availability and package details.
            </p>
          </div>

          {status === 'sent' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-palm-500/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-9 h-9 text-palm-500" />
              </div>
              <h3 className="font-display text-2xl font-bold text-ocean-900 mb-2">Inquiry Sent!</h3>
              <p className="text-gray-600 mb-6">
                Thank you, {form.name.split(' ')[0] || 'there'}. We&apos;ve received your {form.eventType.toLowerCase()} inquiry
                and will get back to you within 24 hours with availability and package options.
              </p>
              <Link href="/" className="btn-primary justify-center w-full sm:w-auto inline-flex">
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col gap-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Full Name</span>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Juan Dela Cruz"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="juan@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Phone</span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="09XX XXX XXXX"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Event Type</span>
                  <select
                    name="eventType"
                    value={form.eventType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800 bg-white"
                  >
                    <option>Wedding / Engagement</option>
                    <option>Birthday</option>
                    <option>Corporate Outing</option>
                    <option>Family Reunion</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Preferred Date</span>
                  <input
                    type="date"
                    name="eventDate"
                    required
                    value={form.eventDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Estimated Guests</span>
                  <input
                    type="number"
                    name="guests"
                    min={1}
                    value={form.guests}
                    onChange={handleChange}
                    placeholder="e.g. 30"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-gray-700">Tell us more (optional)</span>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Catering needs, theme, sound system, or anything else we should know."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800 resize-none"
                />
              </label>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="btn-primary justify-center w-full text-base py-4 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {status === 'sending' ? (
                  'Sending Inquiry…'
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Send Inquiry
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-ocean-700 to-ocean-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image src="/images/resort-villas-golden-hour.jpg" alt="Events CTA" fill className="object-cover" sizes="100vw" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <Star className="w-9 h-9 text-sand-300 mx-auto mb-4" />
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Have a Special Date in Mind?
          </h2>
          <p className="text-ocean-200 text-lg mb-8">
            Reserve your villas alongside your event, or reach out for custom packages.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book" className="btn-primary text-base px-8 py-4">
              <Plus className="w-4 h-4" />
              Book Villas
            </Link>
            <Link href="/contact" className="btn-secondary text-base px-8 py-4">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
