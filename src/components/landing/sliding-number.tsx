'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const DIGIT_HEIGHT = 1 // in em units

interface SlidingNumberProps {
  value: string
  suffix?: string
}

function DigitColumn({ digit, delay }: { digit: number; delay: number }) {
  return (
    <span className="relative inline-block overflow-hidden" style={{ height: `${DIGIT_HEIGHT}em`, width: '0.6em' }}>
      <motion.span
        className="flex flex-col items-center"
        initial={{ y: 0 }}
        animate={{ y: `-${digit * DIGIT_HEIGHT}em` }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 20,
          delay,
        }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="block text-center"
            style={{ height: `${DIGIT_HEIGHT}em`, lineHeight: `${DIGIT_HEIGHT}em` }}
          >
            {i}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

export function SlidingNumber({ value, suffix = '' }: SlidingNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [hasTriggered, setHasTriggered] = useState(false)

  useEffect(() => {
    if (isInView && !hasTriggered) {
      setHasTriggered(true)
    }
  }, [isInView, hasTriggered])

  // Parse the display string into segments: digits, separators, special strings
  const fullValue = value + suffix
  const segments: { type: 'digit' | 'text'; char: string }[] = []

  for (const char of fullValue) {
    if (/[0-9]/.test(char)) {
      segments.push({ type: 'digit', char })
    } else {
      segments.push({ type: 'text', char })
    }
  }

  let digitIndex = 0

  return (
    <span ref={ref} className="inline-flex items-baseline tabular-nums">
      {segments.map((seg, i) => {
        if (seg.type === 'digit' && hasTriggered) {
          const idx = digitIndex++
          return (
            <DigitColumn
              key={i}
              digit={parseInt(seg.char, 10)}
              delay={idx * 0.08}
            />
          )
        }
        if (seg.type === 'digit') {
          return (
            <span key={i} className="inline-block" style={{ width: '0.6em', textAlign: 'center' }}>
              0
            </span>
          )
        }
        // Text segment (separators like /, ., %, +)
        return (
          <span key={i} className="inline-block">
            {seg.char}
          </span>
        )
      })}
    </span>
  )
}
