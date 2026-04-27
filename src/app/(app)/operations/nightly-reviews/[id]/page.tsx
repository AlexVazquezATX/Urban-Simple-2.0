import { notFound } from 'next/navigation'
import { NightlyReviewForm } from '@/components/operations/nightly-review-form'
import { getCurrentUser } from '@/lib/auth'
import {
  buildNightlyReviewId,
  formatAddress,
  getManagerNightlyReviewContext,
  issuesToPainPoints,
  mergeChecklistReviewItems,
} from '@/lib/operations/nightly-reviews'

async function NightlyReviewDetail({ id }: { id: string }) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  if (!['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return <div>Access denied</div>
  }

  const reviewContext = await getManagerNightlyReviewContext({
    companyId: user.companyId,
    managerId: user.id,
    reviewId: id,
  })

  if (!reviewContext) {
    notFound()
  }

  const checklistItems = mergeChecklistReviewItems(
    reviewContext.location.checklistTemplate?.sections ?? [],
    reviewContext.review?.ratingItems ?? []
  )

  const reviewTargetId = buildNightlyReviewId(
    reviewContext.parsed.shiftId,
    reviewContext.parsed.locationId
  )

  return (
    <NightlyReviewForm
      reviewTargetId={reviewTargetId}
      shiftId={reviewContext.shift.id}
      locationId={reviewContext.location.id}
      locationName={reviewContext.location.name}
      clientName={reviewContext.location.clientName}
      address={formatAddress(reviewContext.location.address)}
      scheduledTime={reviewContext.shift.startTime}
      serviceDateLabel={reviewContext.shift.date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })}
      associateName={
        reviewContext.associate?.displayName ||
        reviewContext.manager?.displayName ||
        'Unassigned'
      }
      checklistName={
        reviewContext.location.checklistTemplate?.name || 'No checklist assigned'
      }
      checklistItems={checklistItems}
      initialRating={reviewContext.review?.overallRating ?? 0}
      initialNotes={reviewContext.review?.notes ?? ''}
      initialPainPoints={
        reviewContext.review ? issuesToPainPoints(reviewContext.issues) : []
      }
      initialPhotos={reviewContext.review?.photos ?? reviewContext.serviceLog?.photos ?? []}
      readOnly={Boolean(reviewContext.review)}
      submittedAt={reviewContext.review?.createdAt.toISOString() ?? null}
    />
  )
}

export default async function NightlyReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <NightlyReviewDetail id={id} />
}
