'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Camera, Sparkles, Palette, Check, Zap, Image, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicNav } from '@/components/landing/public-nav'

const FEATURES = [
  {
    icon: Camera,
    title: 'AI Food Photography',
    description: 'Upload a quick dish photo and get back a professional, studio-quality image ready for your menu or social media.',
  },
  {
    icon: Sparkles,
    title: 'Branded Social Posts',
    description: 'Generate on-brand promotional graphics with your logo, colors, and messaging — perfect for Instagram, Facebook, and more.',
  },
  {
    icon: Palette,
    title: 'Brand Kit Management',
    description: 'Save your restaurant\'s colors, logo, and style preferences. Every generation stays perfectly on-brand.',
  },
  {
    icon: Image,
    title: 'Content Gallery',
    description: 'All your generated images saved and organized. Download anytime, reuse in new branded posts.',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: 0,
    description: 'Try it out',
    features: ['10 images/month', 'Basic style', '2 output formats'],
    cta: 'Start Free',
    href: '/studio/signup',
  },
  {
    name: 'Starter',
    price: 29,
    description: 'For single locations',
    features: ['50 images/month', 'All styles', 'Branded posts', '1 brand kit'],
    cta: 'Start Starter',
    href: '/studio/signup',
  },
  {
    name: 'Pro',
    price: 79,
    description: 'Most popular',
    features: ['200 images/month', 'All styles', 'Branded posts', '3 brand kits', 'Custom freeform posts'],
    cta: 'Start Pro',
    href: '/studio/signup',
    highlighted: true,
  },
  {
    name: 'Max',
    price: 149,
    description: 'For busy restaurants & chains',
    features: ['Unlimited images', 'All styles', 'Branded posts', 'Unlimited brand kits', 'Custom freeform posts', 'Priority support'],
    cta: 'Start Max',
    href: '/studio/signup',
  },
]

export default function CreativeStudioLandingPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNav />

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-ocean-50 border border-ocean-200 rounded-full text-sm text-ocean-700 font-medium mb-6">
              <Zap className="w-4 h-4" />
              Powered by AI
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-charcoal-900 mb-6">
              Professional food photos
              <br />
              <span className="text-ocean-600">in seconds, not hours</span>
            </h1>
            <p className="text-lg md:text-xl text-charcoal-600 max-w-2xl mx-auto mb-8">
              Upload a quick dish photo, get back stunning visuals for your menu, social media,
              and delivery platforms. No photographer needed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/studio/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-lg hover:shadow-xl px-8 text-base"
                >
                  Start Free — 10 Images
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/studio/login">
                <Button variant="ghost" size="lg" className="text-charcoal-600">
                  Sign in
                </Button>
              </Link>
            </div>
            <p className="text-sm text-charcoal-500 mt-4">
              No credit card required. Free plan includes 10 AI-generated images per month.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-charcoal-900 mb-4">
              Everything you need for restaurant content
            </h2>
            <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
              From dish photography to branded social posts — create professional visuals
              without a design team.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-6 rounded-lg border border-cream-200 bg-cream-50/50"
              >
                <div className="w-12 h-12 rounded-lg bg-ocean-100 flex items-center justify-center shrink-0">
                  <feature.icon className="w-6 h-6 text-ocean-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-charcoal-900 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-charcoal-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-charcoal-900 mb-4">
              Three steps. Stunning results.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Upload', description: 'Snap a photo of your dish with your phone — any angle, any lighting.' },
              { step: '2', title: 'Generate', description: 'Our AI transforms it into a professional, styled food photo in seconds.' },
              { step: '3', title: 'Use Everywhere', description: 'Download for menus, social media, delivery platforms, or create branded posts.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-ocean-100 text-ocean-700 font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-charcoal-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-charcoal-600 text-sm">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-24 px-4 bg-white" id="pricing">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-charcoal-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-charcoal-600">
              Start free. Upgrade when you need more.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`relative rounded-lg border p-6 ${
                  plan.highlighted
                    ? 'border-ocean-400 bg-ocean-50/30 shadow-lg'
                    : 'border-cream-200 bg-white'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-ocean-500 text-white text-xs font-medium rounded-full">
                      <Crown className="w-3 h-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-charcoal-900">{plan.name}</h3>
                  <p className="text-sm text-charcoal-500">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-charcoal-900">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-charcoal-500 text-sm">/month</span>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-charcoal-700">
                      <Check className="w-4 h-4 text-ocean-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link href={plan.href} className="block">
                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? 'bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700'
                        : ''
                    }`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-charcoal-900 mb-4">
            Ready to transform your food content?
          </h2>
          <p className="text-lg text-charcoal-600 mb-8">
            Join restaurants already using AI to create stunning visuals.
            Start with 10 free images — no credit card needed.
          </p>
          <Link href="/studio/signup">
            <Button
              size="lg"
              className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-lg px-8 text-base"
            >
              Create Your Free Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cream-200 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-lg tracking-tight text-charcoal-900">Urban</span>
            <span className="font-display italic text-lg text-bronze-600">Studio</span>
          </div>
          <p className="text-sm text-charcoal-500">
            A product by Urban Simple
          </p>
        </div>
      </footer>
    </div>
  )
}
