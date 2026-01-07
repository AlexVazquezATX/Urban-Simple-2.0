import { CSVImport } from '@/components/growth/csv-import'

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Prospects</h1>
        <p className="text-muted-foreground mt-1">
          Upload CSV or Excel file to import prospects
        </p>
      </div>

      <CSVImport />
    </div>
  )
}

