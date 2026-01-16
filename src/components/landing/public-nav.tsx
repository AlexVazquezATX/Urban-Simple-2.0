'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cream-50/80 backdrop-blur-xl border-b border-cream-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-baseline gap-1">
            <span className="font-bold text-2xl tracking-tight text-charcoal-900">
              Urban
            </span>
            <span className="font-display italic font-normal text-2xl text-bronze-600">
              Simple
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#services" className="text-charcoal-600 hover:text-ocean-700 transition-colors text-sm font-medium">
              Services
            </Link>
            <Link href="/#industries" className="text-charcoal-600 hover:text-ocean-700 transition-colors text-sm font-medium">
              Industries
            </Link>
            <Link href="/blog" className="text-charcoal-600 hover:text-ocean-700 transition-colors text-sm font-medium">
              Blog
            </Link>
            <Link href="/our-team" className="text-charcoal-600 hover:text-ocean-700 transition-colors text-sm font-medium">
              Our Team
            </Link>
            <Link href="/#testimonials" className="text-charcoal-600 hover:text-ocean-700 transition-colors text-sm font-medium">
              Testimonials
            </Link>
            <Link href="/#contact" className="text-charcoal-600 hover:text-ocean-700 transition-colors text-sm font-medium">
              Contact
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="default">
                Client Login
              </Button>
            </Link>
            <Link href="/#contact">
              <Button
                size="default"
                className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-md hover:shadow-lg"
              >
                Get a Quote
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-charcoal-600 hover:text-charcoal-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-white border-t border-cream-200"
        >
          <div className="px-4 py-6 space-y-4">
            <Link href="/#services" className="block text-charcoal-700 hover:text-ocean-700 font-medium">
              Services
            </Link>
            <Link href="/#industries" className="block text-charcoal-700 hover:text-ocean-700 font-medium">
              Industries
            </Link>
            <Link href="/blog" className="block text-charcoal-700 hover:text-ocean-700 font-medium">
              Blog
            </Link>
            <Link href="/our-team" className="block text-charcoal-700 hover:text-ocean-700 font-medium">
              Our Team
            </Link>
            <Link href="/#testimonials" className="block text-charcoal-700 hover:text-ocean-700 font-medium">
              Testimonials
            </Link>
            <Link href="/#contact" className="block text-charcoal-700 hover:text-ocean-700 font-medium">
              Contact
            </Link>
            <div className="pt-4 space-y-3">
              <Link href="/login" className="block">
                <Button variant="secondary" className="w-full">Client Login</Button>
              </Link>
              <Link href="/#contact" className="block">
                <Button className="w-full bg-gradient-to-br from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700">Get a Quote</Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  )
}

