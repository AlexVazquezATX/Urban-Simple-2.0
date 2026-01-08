'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, TrendingDown, Clock, Users, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ROICalculator() {
  const [isOpen, setIsOpen] = useState(false)
  const [numKitchens, setNumKitchens] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState('')
  const [avgHourlyWage, setAvgHourlyWage] = useState('')
  const [numStaff, setNumStaff] = useState('')
  const [calculated, setCalculated] = useState(false)

  const calculateROI = () => {
    const kitchens = parseFloat(numKitchens) || 0
    const hours = parseFloat(hoursPerWeek) || 0
    const wage = parseFloat(avgHourlyWage) || 0
    const staff = parseFloat(numStaff) || 0

    if (kitchens === 0 || hours === 0 || wage === 0 || staff === 0) {
      return null
    }

    // Weekly labor cost
    const weeklyLaborCost = hours * wage * staff

    // Annual labor cost
    const annualLaborCost = weeklyLaborCost * 52

    // Morale/productivity impact (estimated at 15% reduction in productivity during cleaning hours)
    const productivityLoss = annualLaborCost * 0.15

    // Management overhead (estimated 2 hours/week for coordination)
    const managementOverhead = (2 * wage * 52) * (staff > 0 ? 1 : 0)

    // Total annual cost
    const totalAnnualCost = annualLaborCost + productivityLoss + managementOverhead

    // Estimated Urban Simple cost (typically 30-40% less than in-house)
    const estimatedServiceCost = totalAnnualCost * 0.65

    // Annual savings
    const annualSavings = totalAnnualCost - estimatedServiceCost

    // Monthly savings
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
    if (results) {
      setCalculated(true)
    }
  }

  const handleReset = () => {
    setNumKitchens('')
    setHoursPerWeek('')
    setAvgHourlyWage('')
    setNumStaff('')
    setCalculated(false)
  }

  return (
    <div className="bg-gradient-to-br from-cream-50 to-white rounded-2xl border border-cream-200 shadow-card overflow-hidden">
      {/* Collapsed Header */}
      <div className="p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-full bg-ocean-100 flex items-center justify-center flex-shrink-0">
              <Calculator className="w-6 h-6 text-ocean-600" />
            </div>
            <div className="flex-1">
              <Badge variant="secondary" className="mb-2 bg-ocean-100 text-ocean-700 border-ocean-200">
                Cost Calculator
              </Badge>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-charcoal-900">
                How much is kitchen downtime costing you?
              </h2>
              <p className="text-sm text-charcoal-600 mt-1">
                Calculate the true cost of in-house cleaning: labor, lost productivity, management overhead, and team morale.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsOpen(!isOpen)}
            variant="outline"
            size="lg"
            className="flex-shrink-0 w-full sm:w-auto"
          >
            {isOpen ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Close Calculator
              </>
            ) : (
              <>
                Calculate Now
                <ChevronDown className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 lg:px-8 pb-6 lg:pb-8 border-t border-cream-200">
              <div className="max-w-4xl mx-auto pt-6">

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <Label htmlFor="kitchens" className="text-charcoal-700 mb-2 block">
                      Number of Kitchens
                    </Label>
                    <Input
                      id="kitchens"
                      type="number"
                      placeholder="e.g., 3"
                      value={numKitchens}
                      onChange={(e) => setNumKitchens(e.target.value)}
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hours" className="text-charcoal-700 mb-2 block">
                      Hours Spent Cleaning Per Week
                    </Label>
                    <Input
                      id="hours"
                      type="number"
                      placeholder="e.g., 10"
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(e.target.value)}
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="wage" className="text-charcoal-700 mb-2 block">
                      Average Hourly Wage ($)
                    </Label>
                    <Input
                      id="wage"
                      type="number"
                      placeholder="e.g., 18"
                      value={avgHourlyWage}
                      onChange={(e) => setAvgHourlyWage(e.target.value)}
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="staff" className="text-charcoal-700 mb-2 block">
                      Staff Members Involved
                    </Label>
                    <Input
                      id="staff"
                      type="number"
                      placeholder="e.g., 4"
                      value={numStaff}
                      onChange={(e) => setNumStaff(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-center mb-8">
                  <Button
                    onClick={handleCalculate}
                    disabled={!results}
                    size="lg"
                    className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-lg hover:shadow-xl"
                  >
                    Calculate Your Savings
                  </Button>
                </div>

                {calculated && results && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="bg-white rounded-xl p-6 border-2 border-ocean-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                          <TrendingDown className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-charcoal-600">Potential Annual Savings</p>
                          <p className="text-3xl font-bold text-charcoal-900">
                            ${results.annualSavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-charcoal-600">
                        That's <span className="font-semibold text-charcoal-900">${results.monthlySavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> per month you could reinvest in your business
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-bronze-600" />
                          <p className="text-sm font-medium text-charcoal-700">Annual Labor Cost</p>
                        </div>
                        <p className="text-2xl font-semibold text-charcoal-900">
                          ${results.annualLaborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                      </div>

                      <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-5 h-5 text-plum-600" />
                          <p className="text-sm font-medium text-charcoal-700">Productivity Loss</p>
                        </div>
                        <p className="text-2xl font-semibold text-charcoal-900">
                          ${results.productivityLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-charcoal-600 mt-1">From reduced morale & focus</p>
                      </div>

                      <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-sage-600" />
                          <p className="text-sm font-medium text-charcoal-700">Management Overhead</p>
                        </div>
                        <p className="text-2xl font-semibold text-charcoal-900">
                          ${results.managementOverhead.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-charcoal-600 mt-1">Coordination & scheduling time</p>
                      </div>

                      <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="w-5 h-5 text-ocean-600" />
                          <p className="text-sm font-medium text-charcoal-700">Total Annual Cost</p>
                        </div>
                        <p className="text-2xl font-semibold text-charcoal-900">
                          ${results.totalAnnualCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-charcoal-600 mt-1">In-house cleaning total</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-cream-200">
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="w-full"
                      >
                        Calculate Again
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

