import { FileText } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'

export default async function PortalDocumentsPage() {
  await requirePortalContext()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-display font-medium text-warm-900">Documents</h1>
        <p className="mt-1 text-sm text-warm-500">
          Coming soon. This is where your contracts, COIs, training records, and inspection-prep packets will live.
        </p>
      </div>
      <div className="rounded-sm border border-dashed border-warm-300 bg-white p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-warm-300" />
        <p className="mt-2 text-sm text-warm-700">Document vault is in the next release.</p>
        <p className="text-xs text-warm-500">
          When it ships, we&apos;ll back-fill your existing docs automatically.
        </p>
      </div>
    </div>
  )
}
