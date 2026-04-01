'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, TrendingDown, Clock, Users, DollarSign, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWalkthrough } from './walkthrough-context'

export function ROICalculator() {
  const [numKitchens, setNumKitchens] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState('')
  const [avgHourlyWage, setAvgHourlyWage] = useState('')
  const [numStaff, setNumStaff] = useState('')
  const [calculated, setCalculated] = useState(false)
  const { open: openWalkthrough } = useWalkthrough()

  const calculateROI = () => {
    const kitchens = parseFloat(numKitchens) || 0
    const hours = parseFloat(hoursPerWeek) || 0
    const wage = parseFloat(avgHourlyWage) || 0
    const staff = parseFloat(numStaff) || 0

    if (kitchens === 0 || hours === 0 || wage === 0 || staff === 0) {
      return null
    }

    const weeklyLaborCost = hours * wage * staff
    const annualLaborCost = weeklyLaborCost * 52
    const productivityLoss = annualLaborCost * 0.15
    const managementOverhead = (2 * wage * 52) * (staff > 0 ? 1 : 0)
    const totalAnnualCost = annualLaborCost + productivityLoss + managementOverhead
    const estimatedServiceCost = totalAnnualCost * 0.65
    const annualSavings = totalAnnualCost - estimatedServiceCost
    const monthlySavings = annualSavings / 12

    return {
      weeklyLaborCost,
      annualLaborCost,
      productivityLoss,
      managementOverhead,
      totalAnnualCost,
      estimatedServiceCost,
      annualSavings,
      monthlySavings,
    }
  }

  const results = calculateROI()

  const handleCalculate = () => {
    if (results) setCalculated(true)
  }

  const handleReset = () => {
    setNumKitchens('')
    setHoursPerWeek('')
    setAvgHourlyWage('')
    setNumStaff('')
    setCalculated(false)
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-card border border-cream-200">
      <div className="grid lg:grid-cols-2">
        {/* Left: Dark form panel */}
        <div className="bg-charcoal-900 p-8 lg:p-10">
          <Badge variant="secondary" className="mb-4 bg-ocean-500/20 text-ocean-300 border-ocean-500/30">
            Cost Calculator
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-2">
            How much is kitchen downtime costing you?
          </h2>
          <p className="text-charcoal-400 text-sm mb-8">
            Calculate the true cost of in-house cleaning: labor, lost productivity, management overhead, and team morale.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="kitchens" className="text-charcoal-300 mb-2 block text-sm">
                Number of Kitchens
              </Label>
              <Input
                id="kitchens"
                type="number"
                placeholder="e.g., 3"
                value={numKitchens}
                onChange={(e) => setNumKitchens(e.target.value)}
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-ocean-500"
              />
            </div>
            <div>
              <Label htmlFor="hours" className="text-charcoal-300 mb-2 block text-sm">
                Hours Cleaning / Week
              </Label>
              <Input
                id="hours"
                type="number"
                placeholder="e.g., 10"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-ocean-500"
              />
            </div>
            <div>
              <Label htmlFor="wage" className="text-charcoal-300 mb-2 block text-sm">
                Average Hourly Wage ($)
              </Label>
              <Input
                id="wage"
                type="number"
                placeholder="e.g., 18"
                value={avgHourlyWage}
                onChange={(e) => setAvgHourlyWage(e.target.value)}
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-ocean-500"
              />
            </div>
            <div>
              <Label htmlFor="staff" className="text-charcoal-300 mb-2 block text-sm">
                Staff Members Involved
              </Label>
              <Input
                id="staff"
                type="number"
                placeholder="e.g., 4"
                value={numStaff}
                onChange={(e) => setNumStaff(e.target.value)}
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-ocean-500"
              />
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={!results}
            size="lg"
            className="w-full bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-lg"
          >
            <Calculator className="w-5 h-5 mr-2" />
            Calculate Your Savings
          </Button>
        </div>

        {/* Right: White results panel */}
        <div className="bg-white p-8 lg:p-10 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {calculated && results ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <p className="text-sm text-charcoal-500 mb-1">Potential Annual Savings</p>
                  <p className="text-5xl font-bold text-charcoal-900 font-display">
                    ${results.annualSavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm text-charcoal-500 mt-1">
                    That&rsquo;s <span className="font-semibold text-ocean-600">${results.monthlySavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo</span> back in your pocket
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-cream-50 rounded-lg p-3 border border-cream-200">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-bronze-600" />
                      <p className="text-xs font-medium text-charcoal-500">Labor Cost</p>
                    </div>
                    <p className="text-lg font-semibold text-charcoal-900">
                      ${results.annualLaborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-cream-50 rounded-lg p-3 border border-cream-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-plum-600" />
                      <p className="text-xs font-medium text-charcoal-500">Productivity Loss</p>
                    </div>
                    <p className="text-lg font-semibold text-charcoal-900">
                      ${results.productivityLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-cream-50 rounded-lg p-3 border border-cream-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-sage-600" />
                      <p className="text-xs font-medium text-charcoal-500">Mgmt Overhead</p>
                    </div>
                    <p className="text-lg font-semibold text-charcoal-900">
                      ${results.managementOverhead.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-cream-50 rounded-lg p-3 border border-cream-200">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="w-4 h-4 text-ocean-600" />
                      <p className="text-xs font-medium text-charcoal-500">Total Cost</p>
                    </div>
                    <p className="text-lg font-semibold text-charcoal-900">
                      ${results.totalAnnualCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={openWalkthrough}
                    size="lg"
                    className="flex-1 bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700"
                  >
                    Get a Quote
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="lg">
                    Reset
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-ocean-100 flex items-center justify-center mx-auto mb-6">
                  <Calculator className="w-8 h-8 text-ocean-600" />
                </div>
                <h3 className="font-display text-xl font-semibold text-charcoal-900 mb-3">
                  See your potential savings
                </h3>
                <p className="text-charcoal-500 text-sm mb-8 max-w-sm mx-auto">
                  Fill in the form to discover how much you could save by switching to professional kitchen cleaning.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-ocean-600">35%</p>
                    <p className="text-xs text-charcoal-500 mt-1">Avg Cost Reduction</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-bronze-600">0</p>
                    <p className="text-xs text-charcoal-500 mt-1">Staff Hours Wasted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-plum-600">99</p>
                    <p className="text-xs text-charcoal-500 mt-1">Avg Health Score</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
