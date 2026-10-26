import { redirect } from 'next/navigation'

// Legacy entry point. The field run view moved to /field/visit, which works
// for stops with or without a checklist and supports "not done" reasons.
export default async function ChecklistRunRedirect({
  searchParams,
}: {
  searchParams: Promise<{ shiftId?: string; locationId?: string }>
}) {
  const { shiftId, locationId } = await searchParams
  if (shiftId && locationId) redirect(`/field/visit/${shiftId}/${locationId}`)
  redirect('/dashboard')
}
