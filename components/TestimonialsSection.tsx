'use client'

import { Star, Quote } from 'lucide-react'

const reviews = [
  {
    name: 'Maria Santos',
    location: 'Manila',
    rating: 5,
    text: 'Absolutely loved our stay! The beach is stunning and the staff are super friendly. We will definitely be back!',
    emoji: '👩',
    date: 'December 2024',
  },
  {
    name: 'Kuya Joms',
    location: 'Pampanga',
    rating: 5,
    text: 'Best road trip destination! Kekamiya is the hidden gem of Zambales. The swimming pool is so refreshing and the seafood is amazing!',
    emoji: '👨',
    date: 'January 2025',
  },
  {
    name: 'The Reyes Family',
    location: 'Bulacan',
    rating: 5,
    text: 'Perfect for family bonding! The kids loved the pool and the beach. We had a barbecue dinner by the shore — unforgettable!',
    emoji: '👨‍👩‍👧‍👦',
    date: 'March 2025',
  },
  {
    name: 'Ate Lyn',
    location: 'Quezon City',
    rating: 5,
    text: 'Came for a team outing and it was such a great experience! The cottages are nice, the view is breathtaking. 10/10!',
    emoji: '👩‍💼',
    date: 'February 2025',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-ocean-600 to-ocean-800 overflow-hidden relative">
      {/* Wave top */}
      <div className="absolute top-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-16 fill-white">
          <path d="M0,30 C360,55 1080,0 1440,30 L1440,0 L0,0 Z" />
        </svg>
      </div>

      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-ocean-400/20 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-ocean-300/15 rounded-full blur-3xl -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-ocean-300 font-semibold text-sm tracking-[0.2em] uppercase mb-3">Guest Stories</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-white leading-tight mb-4">
            What Our Guests Say
          </h2>
          <div className="flex justify-center items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-sand-300 text-sand-300" />
            ))}
          </div>
          <p className="text-ocean-200">Rated 5.0 by hundreds of happy guests</p>
        </div>

        {/* Review cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {reviews.map((r) => (
            <div key={r.name} className="glass rounded-3xl p-6 card-hover">
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-ocean-300 mb-4 opacity-60" />

              {/* Text */}
              <p className="text-white/90 leading-relaxed mb-6 text-base">"{r.text}"</p>

              {/* Reviewer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-ocean-400/50 flex items-center justify-center text-xl">
                    {r.emoji}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{r.name}</div>
                    <div className="text-ocean-300 text-xs">{r.location}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex gap-0.5 justify-end mb-0.5">
                    {[...Array(r.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-sand-300 text-sand-300" />
                    ))}
                  </div>
                  <div className="text-ocean-300 text-xs">{r.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
