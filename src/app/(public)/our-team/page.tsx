'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PublicNav } from '@/components/landing/public-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

// ============================================
// TEAM DATA
// ============================================

const executiveTeam = [
  {
    name: 'Alex Vazquez',
    title: 'Co-Founder, CEO',
    subtitle: 'Director of R&D',
    image: '/images/Cleaning Crew-1767818829/Resized 800/Alex-V-2-1.jpg',
  },
  {
    name: 'Demian Vazquez',
    title: 'Co-Founder',
    subtitle: 'Director of Operations',
    image: '/images/Cleaning Crew-1767818829/Resized 800/Demian-V-02-1.jpg',
  },
  {
    name: 'Jasmine Ruiz',
    title: 'Director of HR &',
    subtitle: 'Business Integration',
    image: '/images/Cleaning Crew-1767818829/Resized 800/imgi_6_Jasmine_R-1.png',
  },
  {
    name: 'Julio Esteves',
    title: 'Director of Safety &',
    subtitle: 'Quality Control',
    image: '/images/Cleaning Crew-1767818829/Resized 800/Julio-E-02-1.jpg',
  },
  {
    name: 'Abby Romero',
    title: 'Quality Control',
    subtitle: 'Specialist',
    image: '/images/Cleaning Crew-1767818829/Resized 800/Abby-R-02-1.jpg',
  },
]

const cleaningCrew = [
  { name: 'Julio E.', image: '/images/Cleaning Crew-1767818829/Resized 800/Julio-E_-1.jpg' },
  { name: 'Abby R.', image: '/images/Cleaning Crew-1767818829/Resized 800/Abby-R_-3.jpg' },
  { name: 'Frank S.', image: '/images/Cleaning Crew-1767818829/Resized 800/Frank-S_-1.jpg' },
  { name: 'Francisco L.', image: '/images/Cleaning Crew-1767818829/Resized 800/Francisco-L_-1.jpg' },
  { name: 'Evelia G.', image: '/images/Cleaning Crew-1767818829/Resized 800/Evelia-G_-1.jpg' },
  { name: 'Enmanuel G.', image: '/images/Cleaning Crew-1767818829/Resized 800/Enmanuel-G_-1.jpg' },
  { name: 'Daniela G.', image: '/images/Cleaning Crew-1767818829/Resized 800/Daniela-G_-1.jpg' },
  { name: 'Anibal A.', image: '/images/Cleaning Crew-1767818829/Resized 800/Anibal-A_-1.jpg' },
  { name: 'Adriana M.', image: '/images/Cleaning Crew-1767818829/Resized 800/Adriana-M_-1.jpg' },
  { name: 'Yuliza P.', image: '/images/Cleaning Crew-1767818829/Resized 800/Yuliza-P_-1.jpg' },
  { name: 'Yocelin S.', image: '/images/Cleaning Crew-1767818829/Resized 800/Yocelin-S_-1.jpg' },
  { name: 'Vicky L.', image: '/images/Cleaning Crew-1767818829/Resized 800/Vicky-L_-1.jpg' },
  { name: 'Sergio P.', image: '/images/Cleaning Crew-1767818829/Resized 800/Sergio-P_-1.jpg' },
  { name: 'Santos P.', image: '/images/Cleaning Crew-1767818829/Resized 800/Santos-P_-1.jpg' },
  { name: 'Rosario C.', image: '/images/Cleaning Crew-1767818829/Resized 800/Rosario-C_-1.jpg' },
  { name: 'Oriana G.', image: '/images/Cleaning Crew-1767818829/Resized 800/Oriana-G_-1.jpg' },
  { name: 'Maria G.', image: '/images/Cleaning Crew-1767818829/Resized 800/Maria-G_-1.jpg' },
  { name: 'Marcela S.', image: '/images/Cleaning Crew-1767818829/Resized 800/Marcela-S_-1.jpg' },
  { name: 'Luis R.', image: '/images/Cleaning Crew-1767818829/Resized 800/Luis-R_-1.jpg' },
  { name: 'Lucia M.', image: '/images/Cleaning Crew-1767818829/Resized 800/Lucia-M_-1.jpg' },
  { name: 'Keyri G.', image: '/images/Cleaning Crew-1767818829/Resized 800/Keyri-G_-1.jpg' },
  { name: 'Kenia A.', image: '/images/Cleaning Crew-1767818829/Resized 800/Kenia-A_-1.jpg' },
  { name: 'Karol P.', image: '/images/Cleaning Crew-1767818829/Resized 800/Karol-P_-1.jpg' },
  { name: 'Javier P.', image: '/images/Cleaning Crew-1767818829/Resized 800/Javier-P_-1.jpg' },
  { name: 'Javier L.', image: '/images/Cleaning Crew-1767818829/Resized 800/Javier-L_-1.jpg' },
  { name: 'Ismael P.', image: '/images/Cleaning Crew-1767818829/Resized 800/Ismael-P_-1.jpg' },
  { name: 'Isabella S.', image: '/images/Cleaning Crew-1767818829/Resized 800/Isabella-S_-1.jpg' },
  { name: 'Herlindo P.', image: '/images/Cleaning Crew-1767818829/Resized 800/Herlindo-P_-1.jpg' },
]

// ============================================
// ANIMATIONS
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamPage() {
  const heroRef = useRef(null)
  const heroInView = useInView(heroRef, { once: true })

  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNav />

      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section ref={heroRef} className="relative pt-24 pb-12 lg:pt-32 lg:pb-16 overflow-hidden">
        {/* Text Above Banner */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <motion.div
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4 bg-ocean-100 text-ocean-700 border-ocean-200">
                Our Team
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-bronze-600 leading-[1.1] tracking-tight mb-4"
            >
              We're a Team of Experts, Dedicated to Keeping Your Business Clean, Safe, & Healthy.
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-charcoal-600 leading-relaxed max-w-2xl mx-auto"
            >
              A wonderfully diverse team united by our passion for excellence and our great city of Austin, TX.
            </motion.p>
          </motion.div>
        </div>

        {/* Banner Image */}
        <div className="relative h-[50vh] min-h-[400px] max-h-[600px] rounded-2xl overflow-hidden mx-4 sm:mx-6 lg:mx-8 shadow-xl">
          <Image
            src="/images/Headers-1767818867/Urban-Simple-Team-in-Front-of-HQ-Viviana-Replacement.jpg"
            alt="Urban Simple Team"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/20 via-transparent to-transparent" />
        </div>
      </section>

      {/* ============================================
          EXECUTIVE TEAM SECTION
          ============================================ */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4 bg-ocean-100 text-ocean-700 border-ocean-200">
                Leadership
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
                Our Executive Team
              </h2>
              <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
                We're a team and a family with the mission to give precious time back to our clients, so their immaculate businesses can flourish.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10"
          >
            {executiveTeam.map((member, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group"
              >
                <div className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 border border-cream-200">
                  <div className="aspect-square relative bg-cream-100">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-charcoal-900 mb-1">
                      {member.name}
                    </h3>
                    <p className="text-charcoal-600 text-sm leading-relaxed">
                      {member.title}
                      {member.subtitle && (
                        <>
                          <br />
                          {member.subtitle}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          CLEANING CREW SECTION
          ============================================ */}
      <section className="py-16 lg:py-20 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4 bg-bronze-100 text-bronze-700 border-bronze-200">
                Operations
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
                Our Team of Highly Trained Cleaning Technicians
              </h2>
              <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
                With the latest technology and high level of quality assurance, our team makes sure each and every space is maintained to a high standard; seeing everything so your health inspector sees nothing.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 lg:gap-6"
          >
            {cleaningCrew.map((member, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group text-center"
              >
                <div className="relative aspect-square rounded-full overflow-hidden mb-3 shadow-md group-hover:shadow-lg transition-shadow">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm font-medium text-charcoal-700">{member.name}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION
          ============================================ */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={staggerContainer}
            >
              <motion.h2
                variants={fadeInUp}
                className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight tracking-tight mb-6"
              >
                Ready to work with our expert team?
              </motion.h2>

              <motion.p
                variants={fadeInUp}
                className="text-lg text-charcoal-300 leading-relaxed mb-8"
              >
                Get a free quote tailored to your property. Our team will conduct a walkthrough and provide a comprehensive cleaning plan within 24 hours.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/landing#contact">
                  <Button
                    size="lg"
                    className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-xl hover:shadow-2xl transition-all"
                  >
                    Get a Free Quote
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}

