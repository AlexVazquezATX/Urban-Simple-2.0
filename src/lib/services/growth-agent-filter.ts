/**
 * Growth Agent Filter — Shared prospect filtering for processing modes.
 *
 * Used by both the agent service and stats API to build consistent
 * Prisma `where` clauses based on the active processing mode.
 */

export interface FilterCriteria {
  businessTypes?: string[]
  priceLevels?: string[]
  cities?: string[]
  tags?: string[]
  sources?: string[]
}

export type ProcessingMode = 'all' | 'filtered' | 'queued'

/**
 * Build a Prisma `where` fragment for prospects based on the processing mode.
 *
 * - 'all' → { companyId } (no extra filtering)
 * - 'queued' → { companyId, agentQueued: true }
 * - 'filtered' → { companyId, ...criteria filters }
 */
export function buildProspectFilter(
  companyId: string,
  processingMode: ProcessingMode,
  filterCriteria: FilterCriteria
): Record<string, any> {
  const base: Record<string, any> = { companyId }

  if (processingMode === 'queued') {
    base.agentQueued = true
    return base
  }

  if (processingMode === 'filtered') {
    const criteria = filterCriteria || {}

    if (criteria.businessTypes?.length) {
      base.businessType = { in: criteria.businessTypes }
    }
    if (criteria.priceLevels?.length) {
      base.priceLevel = { in: criteria.priceLevels }
    }
    if (criteria.sources?.length) {
      base.source = { in: criteria.sources }
    }
    if (criteria.tags?.length) {
      base.tags = { hasSome: criteria.tags }
    }
    if (criteria.cities?.length) {
      // Prisma JSON path filtering on the address.city field
      base.OR = criteria.cities.map((city) => ({
        address: { path: ['city'], string_contains: city },
      }))
    }

    return base
  }

  // mode === 'all'
  return base
}
