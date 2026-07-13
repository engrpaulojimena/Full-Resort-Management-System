'use client'

import { Waves, Utensils, Wifi, Car, Music, Umbrella, Fish, Flame } from 'lucide-react'

const amenities = [
  {
    icon: '🏊',
    title: 'Swimming Pools',
    desc: 'Two refreshing pools — one for adults and one for kids — surrounded by tropical garden.',
    color: 'from-ocean-400 to-ocean-600',
    featured: true,
  },
  {
    icon: '🏖️',
    title: 'Private Beach',
    desc: 'Direct access to the sandy shores, perfect for sun bathing.',
    color: 'from-sand-400 to-sand-600',
    featured: true,
  },
  {
    icon: '🏖️',
    title: 'Beachfront Access',
    desc: 'Enjoy direct access to our clean and relaxing beachfront, perfect for swimming, sunbathing, and family bonding.',
    color: 'from-coral-400 to-coral-600',
    featured: false,
  },
  {
    icon: '🌴',
    title: 'Cottages & Cabanas',
    desc: 'Shaded cottages and beachside cabanas for your ultimate relaxation.',
    color: 'from-palm-400 to-palm-600',
    featured: false,
  },
  {
    icon: '🎤',
    title: 'Events & KTV',
    desc: 'Host your celebrations, team outings, and parties with our full event facilities.',
    color: 'from-purple-400 to-purple-600',
    featured: false,
  },
  {
    icon: '🏕️',
    title: 'Overnight Stays',
    desc: 'Comfortable accommodations for guests who want to extend their paradise experience.',
    color: 'from-teal-400 to-teal-600',
    featured: false,
  },
  {
    icon: '🤿',
    title: 'Water Activities',
    desc: 'Snorkeling, kayaking, and beach volleyball for the adventurous at heart.',
    color: 'from-cyan-400 to-cyan-600',
    featured: false,
  },
  {
    icon: '🌅',
    title: 'Sunset Viewing',
    desc: 'The most breathtaking sunsets over the water, every single evening.',
    color: 'from-orange-400 to-orange-600',
    featured: false,
  },
]

export default function AmenitiesSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-ocean-50/50 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="section-label mb-3">What We Offer</p>
          <h2 className="section-title mb-4">
            Everything You Need for the{' '}
            <span className="text-gradient-ocean">Perfect Vacation</span>
          </h2>
          <p className="text-gray-500 text-lg">
            From poolside fun to beachside dining — Kekamiya has it all.
          </p>
        </div>

        {/* Featured amenities */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {amenities.filter(a => a.featured).map((a) => (
            <div
              key={a.title}
              className={`relative rounded-3xl bg-gradient-to-br ${a.color} p-8 text-white overflow-hidden group card-hover cursor-pointer`}
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <span className="text-5xl mb-4 block">{a.icon}</span>
                <h3 className="font-display text-2xl font-bold mb-2">{a.title}</h3>
                <p className="text-white/80 leading-relaxed">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Regular amenities grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {amenities.filter(a => !a.featured).map((a) => (
            <div
              key={a.title}
              className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover group"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.color} flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform`}>
                {a.icon}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">{a.title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
