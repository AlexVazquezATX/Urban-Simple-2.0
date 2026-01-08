'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EstimateWizard } from './estimate-wizard'
import { WalkthroughForm } from './walkthrough-form'

export function FloatingQuoteCTA() {
  const [isVisible, setIsVisible] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero section (approximately 400px)
      const scrollY = window.scrollY
      setIsVisible(scrollY > 200) // Lowered threshold for easier access
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial position

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
                  '0 20px 40px -5px rgba(166, 124, 82, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative"
            >
              <Button
                onClick={() => setIsWizardOpen(true)}
                size="lg"
                className="bg-gradient-to-br from-bronze-500 to-bronze-600 text-white hover:from-bronze-600 hover:to-bronze-700 shadow-xl hover:shadow-2xl h-14 px-6 text-base font-semibold rounded-full w-full"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Get Instant Estimate
              </Button>
              
              {/* Pulse effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-bronze-500 opacity-20 pointer-events-none"
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
              onClick={() => setIsWalkthroughOpen(true)}
              size="lg"
              variant="outline"
              className="bg-white border-bronze-200 text-bronze-700 hover:bg-bronze-50 hover:border-bronze-300 shadow-lg h-14 px-6 text-base font-semibold rounded-full w-full"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Schedule Walkthrough
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
        onClose={() => setIsWalkthroughOpen(false)}
      />
    </>
  )
}

