'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EstimateWizard } from './estimate-wizard'
import { WalkthroughForm } from './walkthrough-form'
import { useWalkthrough } from './walkthrough-context'

export function FloatingQuoteCTA() {
  const [isVisible, setIsVisible] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const { isOpen: isWalkthroughOpen, open: openWalkthrough, close: closeWalkthrough } = useWalkthrough()

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 200)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <AnimatePresence>
        {isVisible && !isWizardOpen && !isWalkthroughOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3"
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  '0 20px 40px -5px rgba(75, 106, 138, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative overflow-hidden rounded-full"
            >
              <Button
                onClick={openWalkthrough}
                size="lg"
                className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-xl hover:shadow-2xl h-14 px-6 text-base font-semibold rounded-full w-full"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Schedule Walkthrough
              </Button>

              {/* Pulse effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-ocean-500 opacity-20 pointer-events-none"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.2, 0, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>

            <Button
              onClick={() => setIsWizardOpen(true)}
              size="lg"
              variant="outline"
              className="bg-white border-cream-200 text-charcoal-700 hover:bg-cream-50 hover:border-cream-300 shadow-lg h-14 px-6 text-base font-semibold rounded-full w-full"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Instant Estimate
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <EstimateWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />

      <WalkthroughForm
        isOpen={isWalkthroughOpen}
        onClose={closeWalkthrough}
      />
    </>
  )
}
