'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import clsx from 'clsx'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Accommodations', href: '/accommodations' },
  { label: 'Amenities', href: '/amenities' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Events', href: '/events' },
  { label: 'Contact', href: '/contact' },
  { label: 'My Booking', href: '/my-booking' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-700',
        scrolled
          ? 'bg-white shadow-[0_4px_40px_rgba(0,48,80,0.10)] py-2'
          : 'bg-transparent py-3'
      )}
    >
      {/* Top gold accent line */}
      <div className={clsx(
        'absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-700',
        scrolled ? 'opacity-100' : 'opacity-0'
      )}
        style={{ background: 'linear-gradient(90deg, transparent, #f7ae3e 30%, #f7ae3e 70%, transparent)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-2">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className={clsx(
            'relative transition-all duration-500',
            scrolled ? 'w-11 h-11 sm:w-14 sm:h-14' : 'w-12 h-12 sm:w-16 sm:h-16'
          )}>
            <Image
              src="/icon.png"
              alt="Kekamiya Beach Resort"
              fill
              className="object-contain drop-shadow-md"
              sizes="64px"
              priority
            />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className={clsx(
              'font-display font-bold tracking-wide leading-tight transition-all duration-500',
              scrolled ? 'text-ocean-800 text-lg' : 'text-white text-xl drop-shadow-md'
            )}>
              Kekamiya
            </span>
            <span className={clsx(
              'text-[9px] tracking-[0.3em] uppercase font-semibold transition-all duration-500',
              scrolled ? 'text-sand-600' : 'text-white/70 drop-shadow-sm'
            )}>
              Beach Resort
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'relative px-4 py-2 text-[13px] font-semibold tracking-widest uppercase transition-all duration-300 group',
                scrolled
                  ? 'text-ocean-900 hover:text-sand-600'
                  : 'text-white/90 hover:text-white drop-shadow-sm'
              )}
            >
              {link.label}
              <span className={clsx(
                'absolute bottom-0 left-4 right-4 h-[1.5px] origin-center scale-x-0 group-hover:scale-x-100 transition-transform duration-300',
                scrolled ? 'bg-sand-500' : 'bg-white/80'
              )} />
            </Link>
          ))}
        </nav>

        {/* Book Now CTA — desktop */}
        <Link
          href="/book"
          className={clsx(
            'hidden md:inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase px-7 py-3 transition-all duration-400 hover:-translate-y-0.5 hover:shadow-xl',
            scrolled
              ? 'bg-ocean-700 text-white hover:bg-ocean-800 shadow-lg shadow-ocean-900/20 rounded-none'
              : 'bg-white/10 backdrop-blur-md text-white border border-white/50 hover:bg-white/20 rounded-none'
          )}
        >
          Book Now
        </Link>

        {/* Mobile actions: Book Now + Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/book"
            className={clsx(
              'inline-flex items-center text-[10px] font-bold tracking-[0.15em] uppercase px-4 py-2.5 rounded-full transition-all duration-300 shadow-md',
              scrolled
                ? 'bg-ocean-700 text-white shadow-ocean-900/20'
                : 'bg-sand-500 text-white shadow-black/20'
            )}
          >
            Book Now
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={clsx(
              'p-2 rounded transition-colors',
              scrolled ? 'text-ocean-800 hover:bg-ocean-50' : 'text-white hover:bg-white/10'
            )}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t-2 border-sand-400 shadow-2xl">
          {/* Gold accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-sand-300 to-transparent" />
          <div className="px-6 py-5 flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-2 py-3.5 text-[12px] font-bold tracking-[0.2em] uppercase text-ocean-900 hover:text-sand-600 border-b border-gray-100 last:border-0 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/book"
              onClick={() => setMobileOpen(false)}
              className="mt-4 flex items-center justify-center bg-ocean-700 hover:bg-ocean-800 text-white font-bold text-[11px] tracking-[0.2em] uppercase py-4 transition-colors shadow-md"
            >
              Book Now
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
