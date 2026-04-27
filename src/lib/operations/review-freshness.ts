import { differenceInCalendarDays, format } from 'date-fns'

export const STALE_REVIEW_DAYS = 7

type QualifyingReviewLike = {
  reviewDate?: Date | string | null
  createdAt?: Date | string | null
  photos?: string[] | null
}

export type ReviewFreshness = {
  hasQualifyingReview: boolean
  daysSinceReview: number | null
  isStale: boolean
  label: string
  shortLabel: string
  reviewedOnLabel: string | null
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

export function getReviewFreshness(review?: QualifyingReviewLike | null): ReviewFreshness {
  if (!review || !Array.isArray(review.photos) || review.photos.length === 0) {
    return {
      hasQualifyingReview: false,
      daysSinceReview: null,
      isStale: true,
      label: 'Needs review',
      shortLabel: 'Never reviewed',
      reviewedOnLabel: null,
    }
  }

  const reviewDate = toDate(review.reviewDate) || toDate(review.createdAt)
  if (!reviewDate || Number.isNaN(reviewDate.getTime())) {
    return {
      hasQualifyingReview: false,
      daysSinceReview: null,
      isStale: true,
      label: 'Needs review',
      shortLabel: 'Never reviewed',
      reviewedOnLabel: null,
    }
  }

  const daysSinceReview = Math.max(
    0,
    differenceInCalendarDays(new Date(), reviewDate)
  )
  const isStale = daysSinceReview > STALE_REVIEW_DAYS

  return {
    hasQualifyingReview: true,
    daysSinceReview,
    isStale,
    label: isStale
      ? `Flagged - ${daysSinceReview} days since review`
      : `Reviewed ${daysSinceReview} day${daysSinceReview === 1 ? '' : 's'} ago`,
    shortLabel: `${daysSinceReview}d`,
    reviewedOnLabel: format(reviewDate, 'MMM d, yyyy'),
  }
}
