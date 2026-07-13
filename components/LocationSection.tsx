import { MapPin, Phone, Mail, Clock, Navigation } from 'lucide-react'

export default function LocationSection() {
  return (
    <section className="py-24 bg-ocean-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Info */}
          <div>
            <p className="section-label mb-3">Find Us</p>
            <h2 className="section-title mb-6">
              Come Visit Us in{' '}
              <span className="text-gradient-ocean">Beautiful Zambales</span>
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              Kekamiya Beach Resort is located in Botolan, Zambales — easily accessible from Metro Manila
              via NLEX and SCTEX. Just a 3-4 hour drive and you're in paradise!
            </p>

            <div className="space-y-4 mb-8">
              {[
                {
                  icon: MapPin,
                  label: 'Address',
                  value: 'Botolan, Zambales, Philippines',
                  color: 'text-ocean-500',
                },
                {
                  icon: Phone,
                  label: 'Phone',
                  value: '+63 XXX XXX XXXX',
                  color: 'text-palm-500',
                },
                {
                  icon: Mail,
                  label: 'Email',
                  value: 'info@kekamiyabeachresort.com',
                  color: 'text-coral-500',
                },
                {
                  icon: Clock,
                  label: 'Hours',
                  value: 'Open daily · 6:00 AM – 10:00 PM',
                  color: 'text-sand-600',
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">{item.label}</div>
                      <div className="text-gray-700 font-medium">{item.value}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <a
              href="https://maps.google.com/?q=Botolan+Zambales+Philippines"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </a>
          </div>

          {/* Map placeholder — styled nicely */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl h-96 bg-gradient-to-br from-ocean-200 to-ocean-400 flex flex-col items-center justify-center text-white">
            {/* Faux map dots */}
            <div className="absolute inset-0 opacity-20">
              {/* Grid lines */}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute border-b border-white/40" style={{ top: `${(i+1)*12.5}%`, left: 0, right: 0 }} />
              ))}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute border-r border-white/40" style={{ left: `${(i+1)*12.5}%`, top: 0, bottom: 0 }} />
              ))}
            </div>

            {/* Pin */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-coral-500 rounded-full flex items-center justify-center shadow-2xl mb-3 animate-bounce">
                <MapPin className="w-8 h-8 text-white fill-white" />
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-3 text-center shadow-lg">
                <div className="font-display font-bold text-ocean-700 text-sm">Kekamiya Beach Resort</div>
                <div className="text-ocean-500 text-xs">Botolan, Zambales</div>
              </div>
              <div className="mt-4 text-white/80 text-sm text-center">
                ~3-4 hrs from Manila via NLEX/SCTEX
              </div>
            </div>

            {/* Embed note */}
            <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-white">
              📍 Add Google Maps embed in production
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
