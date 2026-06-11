import { CSVImport } from '@/components/growth/csv-import'
import { PageHeader } from '@/components/layout/page-header'

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="GROWTH · PROSPECTS"
        title="Import Prospects"
        subtitle="Upload a CSV or Excel file to import prospects"
        backHref="/growth/prospects"
      />

      <CSVImport />
    </div>
  )
}
