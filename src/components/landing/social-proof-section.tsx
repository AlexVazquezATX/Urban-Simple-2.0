'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { Award, Trophy } from 'lucide-react'
import { fadeInUp, scaleIn, staggerContainer } from './landing-animations'

// Text-based logos with font styling to approximate the originals
// Horseshoe Bay and Loren keep their images
const clients: { name: string; display: string; image?: string; fontClass: string }[] = [
  { name: 'Facebook', display: 'facebook', fontClass: 'font-bold text-xl lg:text-2xl lowercase tracking-tight' },
  { name: 'Darden Group', display: 'DARDEN GROUP', fontClass: 'font-bold text-sm lg:text-base uppercase tracking-[0.15em] font-serif' },
  { name: 'Chameleon Group', display: 'CHAMELEON GRP.', fontClass: 'font-extrabold text-xs lg:text-sm uppercase tracking-[0.05em]' },
  { name: 'Horseshoe Bay Resort', display: '', image: '/images/Clients-1767818842/current client logos/client-brand-horseshoe-bay-resort.png', fontClass: '' },
  { name: 'The Loren', display: '', image: '/images/Clients-1767818842/current client logos/client-brand-the-loren-hotel.png', fontClass: '' },
  { name: 'Tarka', display: 'tarka', fontClass: 'font-normal text-xl lg:text-2xl lowercase tracking-wide font-serif italic' },
  { name: 'Wu Chow', display: 'WU CHOW', fontClass: 'font-semibold text-base lg:text-lg uppercase tracking-[0.2em]' },
]

const certifications = [
  { name: 'Inc. 5000', year: '2020', icon: Trophy },
  { name: 'Inc. 5000', year: '2022', icon: Trophy },
  { name: 'Inc. 5000', year: '2024', icon: Trophy },
  { name: 'BOMA Austin', icon: Award },
  { name: 'Austin Business Journal', icon: Award },
  { name: 'SAM.gov', icon: Award },
  { name: 'Entrepreneurs Organization', icon: Award },
]

export function SocialProofSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section
      ref={ref}
      className="relative py-20 lg:py-28 bg-gradient-to-br from-charcoal-900 via-charcoal-850 to-charcoal-900 overflow-hidden"
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>
      {/* Glow accents */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-ocean-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-bronze-500/10 rounded-full blur-[100px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.p
            variants={fadeInUp}
            className="text-ocean-400 font-medium text-sm uppercase tracking-widest mb-3"
          >
            Trusted By Industry Leaders
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight tracking-tight mb-4"
          >
            Notable Hospitality Brands
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-charcoal-400 max-w-2xl mx-auto"
          >
            We&rsquo;re proud to serve some of the most recognized names in hospitality.
          </motion.p>
        </motion.div>

        {/* Client Logos */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-6 lg:gap-8 items-center justify-items-center mb-20"
        >
          {clients.map((client, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              className="flex items-center justify-center h-14 lg:h-20 w-full opacity-60 hover:opacity-100 transition-all duration-300"
            >
              {client.image ? (
                <Image
                  src={client.image}
                  alt={client.name}
                  width={180}
                  height={80}
                  className="object-contain max-h-full max-w-full w-auto brightness-0 invert"
                />
              ) : (
                <span className={`text-white whitespace-nowrap select-none ${client.fontClass}`}>
                  {client.display}
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-16">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-charcoal-700 to-transparent" />
          <span className="text-charcoal-500 text-sm font-medium uppercase tracking-wider">Awards & Recognition</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-charcoal-700 to-transparent" />
        </div>

        {/* Certifications Grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 lg:gap-5"
        >
          {certifications.map((cert, index) => {
            const Icon = cert.icon
            return (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group flex flex-col items-center gap-2.5 p-4 rounded-xl border border-charcoal-700/50 bg-charcoal-800/30 hover:bg-charcoal-800/60 hover:border-charcoal-600 transition-all duration-300"
              >
                <Icon className="w-5 h-5 text-honey-500 group-hover:text-honey-400 transition-colors" />
                <div className="text-center">
                  <p className="text-white text-sm font-medium leading-tight">
                    {cert.name}
                  </p>
                  {cert.year && (
                    <p className="text-charcoal-500 text-xs mt-0.5">{cert.year}</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
