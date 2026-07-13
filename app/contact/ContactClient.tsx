'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageCircle,
  Play,
  ArrowRight,
} from 'lucide-react'

const faqs = [
  {
    q: 'What are your check-in and check-out times?',
    a: 'Check-in is at 2:00 PM and check-out is at 11:00 AM. Early check-in and late check-out may be arranged subject to availability, charged at 10% of the room rate per hour.',
  },
  {
    q: 'Do you accept walk-in guests?',
    a: 'Yes, we welcome walk-in guests for day use. However, for overnight stays we strongly recommend booking in advance, especially on weekends and holidays.',
  },
  {
    q: 'Is there parking available?',
    a: 'Yes, free parking is available on-site for all guests.',
  },
  {
    q: 'Do you allow pets?',
    a: 'Unfortunately we do not allow pets inside the resort at this time to ensure a comfortable environment for all guests.',
  },
  {
    q: 'Can you host events and group bookings?',
    a: 'Absolutely! We have event venues and can accommodate large groups. Please contact us directly for corporate events, family reunions, or special celebrations.',
  },
]

export default function ContactClient() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setStatus('sending')
    // Simulate a send — replace with your API route
    await new Promise((r) => setTimeout(r, 1500))
    setStatus('sent')
  }

  return (
    <>
      {/* Hero */}
      <div className="relative pt-20 pb-16 bg-gradient-to-br from-ocean-700 to-ocean-900 overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <Image
            src="/images/19285.jpg"
            alt="Contact background"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/60 to-ocean-900/80" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-12">
          <p className="text-ocean-300 font-semibold text-sm tracking-[0.2em] uppercase mb-3">We&apos;d Love to Hear From You</p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-4">
            Contact Us
          </h1>
          <p className="text-ocean-200 text-lg max-w-xl mx-auto">
            Have a question or ready to plan your getaway? Reach out and we&apos;ll get back to you as soon as possible.
          </p>
        </div>
      </div>

      {/* Main content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">

            {/* Left — Info cards */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Contact details */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-display font-bold text-xl text-gray-900 mb-5">Get in Touch</h2>
                <div className="space-y-4">
                  {[
                    {
                      icon: MapPin,
                      label: 'Address',
                      value: 'Botolan, Zambales, Philippines',
                      href: 'https://maps.google.com/?q=Botolan+Zambales+Philippines',
                    },
                    {
                      icon: Phone,
                      label: 'Phone',
                      value: '+63 XXX XXX XXXX',
                      href: 'tel:+63XXXXXXXXXX',
                    },
                    {
                      icon: Mail,
                      label: 'Email',
                      value: 'info@kekamiyabeachresort.com',
                      href: 'mailto:info@kekamiyabeachresort.com',
                    },
                    {
                      icon: Clock,
                      label: 'Hours',
                      value: 'Open Daily: 6:00 AM – 10:00 PM',
                      href: null,
                    },
                  ].map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-ocean-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-5 h-5 text-ocean-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ocean-400 uppercase tracking-wider mb-0.5">{label}</p>
                        {href ? (
                          <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-gray-700 hover:text-ocean-600 transition-colors text-sm font-medium">
                            {value}
                          </a>
                        ) : (
                          <p className="text-gray-700 text-sm font-medium">{value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-display font-bold text-xl text-gray-900 mb-4">Follow Us</h2>
                <div className="flex gap-3">
                  {[
                    { icon: ExternalLink, href: 'https://facebook.com/kekamiyabeachresort', label: 'Facebook', color: 'hover:bg-blue-500' },
                    { icon: MessageCircle, href: '#', label: 'Instagram', color: 'hover:bg-pink-500' },
                    { icon: Play, href: '#', label: 'YouTube', color: 'hover:bg-red-500' },
                  ].map(({ icon: Icon, href, label, color }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className={`w-11 h-11 rounded-xl bg-ocean-50 ${color} hover:text-white text-ocean-500 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5`}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-3">Stay updated with our latest promos and events.</p>
              </div>

              {/* Map embed */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <iframe
                  title="Kekamiya Beach Resort Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3868.2!2d120.0138244!3d15.2305516!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33942fd4cf6d3fe1%3A0x678477e8f148f35d!2sKekamiya+Beach+Resort!5e0!3m2!1sen!2sph!4v1"
                  width="100%"
                  height="220"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="px-5 py-3">
                  <a
                    href="https://maps.app.goo.gl/e16XJdXz8bkZzX2Y8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean-500 hover:text-ocean-700 text-sm font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Open in Google Maps
                  </a>
                </div>
              </div>
            </div>

            {/* Right — Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {status === 'sent' ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-palm-500/10 flex items-center justify-center mb-5">
                      <CheckCircle className="w-8 h-8 text-palm-500" />
                    </div>
                    <h3 className="font-display font-bold text-2xl text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-500 max-w-sm">
                      Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => { setStatus('idle'); setForm({ name: '', email: '', phone: '', subject: '', message: '' }) }}
                      className="mt-8 px-6 py-2.5 rounded-full bg-ocean-500 text-white font-semibold text-sm hover:bg-ocean-600 transition-colors"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-display font-bold text-2xl text-gray-900 mb-1">Send a Message</h2>
                    <p className="text-gray-500 text-sm mb-7">Fill out the form below and we&apos;ll respond promptly.</p>

                    <div className="space-y-5">
                      {/* Name + Email */}
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                            Full Name <span className="text-coral-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Juan dela Cruz"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition-all placeholder:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                            Email Address <span className="text-coral-500">*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="juan@email.com"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition-all placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      {/* Phone + Subject */}
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="+63 9XX XXX XXXX"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition-all placeholder:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                            Subject
                          </label>
                          <select
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition-all text-gray-700 bg-white"
                          >
                            <option value="">Select a topic</option>
                            <option value="reservation">Reservation Inquiry</option>
                            <option value="events">Events & Group Bookings</option>
                            <option value="rates">Rates & Packages</option>
                            <option value="amenities">Amenities & Facilities</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                          Message <span className="text-coral-500">*</span>
                        </label>
                        <textarea
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          rows={6}
                          placeholder="Tell us how we can help you..."
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition-all placeholder:text-gray-400 resize-none"
                        />
                      </div>

                      <button
                        onClick={handleSubmit}
                        disabled={status === 'sending' || !form.name || !form.email || !form.message}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-ocean-500 text-white font-semibold text-sm hover:bg-ocean-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ocean-200"
                      >
                        {status === 'sending' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4" />
                            Send Message
                          </>
                        )}
                      </button>

                      <p className="text-center text-xs text-gray-400">
                        We typically respond within 24 hours on business days.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-ocean-500 font-semibold text-sm tracking-[0.2em] uppercase mb-2">Quick Answers</p>
            <h2 className="font-display font-bold text-3xl text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-ocean-50 transition-colors"
                >
                  <span className="font-semibold text-gray-800 text-sm pr-4">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-5 h-5 text-ocean-500 shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}