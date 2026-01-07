'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CSVRow {
  [key: string]: string
}

interface ColumnMapping {
  csvColumn: string
  prospectField: string
}

const PROSPECT_FIELDS = [
  { value: '', label: 'Skip Column' },
  { value: 'companyName', label: 'Company Name *' },
  { value: 'legalName', label: 'Legal Name' },
  { value: 'industry', label: 'Industry' },
  { value: 'businessType', label: 'Business Type' },
  { value: 'address.street', label: 'Address - Street' },
  { value: 'address.city', label: 'Address - City' },
  { value: 'address.state', label: 'Address - State' },
  { value: 'address.zip', label: 'Address - ZIP' },
  { value: 'website', label: 'Website' },
  { value: 'phone', label: 'Phone' },
  { value: 'estimatedValue', label: 'Estimated Value' },
  { value: 'source', label: 'Source' },
  { value: 'sourceDetail', label: 'Source Detail' },
  { value: 'notes', label: 'Notes' },
  { value: 'contact.firstName', label: 'Contact - First Name' },
  { value: 'contact.lastName', label: 'Contact - Last Name' },
  { value: 'contact.email', label: 'Contact - Email' },
  { value: 'contact.phone', label: 'Contact - Phone' },
  { value: 'contact.title', label: 'Contact - Title' },
]

export function CSVImport() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [previewRows, setPreviewRows] = useState<CSVRow[]>([])
  const [duplicates, setDuplicates] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []

    // Simple CSV parser (handles quoted fields)
    const parseLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headerLine = parseLine(lines[0])
    const rows: CSVRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i])
      const row: CSVRow = {}
      headerLine.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      rows.push(row)
    }

    return rows
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    const isValidType = validTypes.includes(selectedFile.type) || 
                       selectedFile.name.endsWith('.csv') ||
                       selectedFile.name.endsWith('.xlsx') ||
                       selectedFile.name.endsWith('.xls')

    if (!isValidType) {
      toast.error('Please select a CSV or Excel file')
      return
    }

    setFile(selectedFile)
    setIsProcessing(true)

    try {
      if (selectedFile.name.endsWith('.csv')) {
        const text = await selectedFile.text()
        const data = parseCSV(text)
        
        if (data.length === 0) {
          toast.error('CSV file appears to be empty')
          return
        }

        setHeaders(Object.keys(data[0]))
        setCsvData(data)
        setPreviewRows(data.slice(0, 5)) // Show first 5 rows
        
        // Auto-map columns based on header names
        const autoMapping: Record<string, string> = {}
        Object.keys(data[0]).forEach(header => {
          const lowerHeader = header.toLowerCase()
          if (lowerHeader.includes('company') || lowerHeader.includes('business')) {
            autoMapping[header] = 'companyName'
          } else if (lowerHeader.includes('legal')) {
            autoMapping[header] = 'legalName'
          } else if (lowerHeader.includes('industry')) {
            autoMapping[header] = 'industry'
          } else if (lowerHeader.includes('email')) {
            autoMapping[header] = 'contact.email'
          } else if (lowerHeader.includes('phone') || lowerHeader.includes('tel')) {
            autoMapping[header] = 'phone'
          } else if (lowerHeader.includes('website') || lowerHeader.includes('url')) {
            autoMapping[header] = 'website'
          } else if (lowerHeader.includes('address') || lowerHeader.includes('street')) {
            autoMapping[header] = 'address.street'
          } else if (lowerHeader.includes('city')) {
            autoMapping[header] = 'address.city'
          } else if (lowerHeader.includes('state')) {
            autoMapping[header] = 'address.state'
          } else if (lowerHeader.includes('zip') || lowerHeader.includes('postal')) {
            autoMapping[header] = 'address.zip'
          }
        })
        setColumnMapping(autoMapping)
        
        toast.success(`Loaded ${data.length} rows from CSV`)
      } else {
        toast.error('Excel files (.xlsx) are not yet supported. Please export to CSV first.')
        setFile(null)
      }
    } catch (error) {
      console.error('Error parsing file:', error)
      toast.error('Failed to parse file. Please check the format.')
      setFile(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const checkDuplicates = async () => {
    if (!csvData.length) return

    setIsProcessing(true)
    try {
      const companyNames = csvData
        .map(row => {
          const mappedField = columnMapping[Object.keys(row)[0]]
          if (mappedField === 'companyName') {
            return row[Object.keys(row)[0]]
          }
          // Find companyName column
          const companyCol = Object.keys(columnMapping).find(
            col => columnMapping[col] === 'companyName'
          )
          return companyCol ? row[companyCol] : null
        })
        .filter(Boolean) as string[]

      const response = await fetch('/api/growth/prospects/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyNames }),
      })

      if (response.ok) {
        const data = await response.json()
        setDuplicates(data.duplicates || [])
        if (data.duplicates.length > 0) {
          toast.warning(`Found ${data.duplicates.length} potential duplicates`)
        } else {
          toast.success('No duplicates found')
        }
      }
    } catch (error) {
      console.error('Error checking duplicates:', error)
      toast.error('Failed to check for duplicates')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    // Validate required mapping
    const companyNameMapped = Object.values(columnMapping).includes('companyName')
    if (!companyNameMapped) {
      toast.error('Company Name column mapping is required')
      return
    }

    setIsImporting(true)
    try {
      // Transform data based on mapping
      const prospects = csvData.map(row => {
        const prospect: any = {
          contacts: [],
        }

        Object.keys(columnMapping).forEach(csvColumn => {
          const field = columnMapping[csvColumn]
          if (!field || !row[csvColumn]) return

          const value = row[csvColumn].trim()
          if (!value) return

          if (field.startsWith('contact.')) {
            const contactField = field.replace('contact.', '')
            if (!prospect.contacts[0]) {
              prospect.contacts[0] = {}
            }
            prospect.contacts[0][contactField] = value
          } else if (field.startsWith('address.')) {
            const addressField = field.replace('address.', '')
            if (!prospect.address) {
              prospect.address = {}
            }
            prospect.address[addressField] = value
          } else {
            prospect[field] = value
          }
        })

        // Set defaults
        if (!prospect.status) prospect.status = 'new'
        if (!prospect.priority) prospect.priority = 'medium'
        if (!prospect.source) prospect.source = 'csv_import'

        return prospect
      })

      const response = await fetch('/api/growth/prospects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import prospects')
      }

      const result = await response.json()
      toast.success(`Successfully imported ${result.created} prospects`)
      router.push('/growth/prospects')
      router.refresh()
    } catch (error: any) {
      console.error('Error importing:', error)
      toast.error(error.message || 'Failed to import prospects')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Prospects from CSV</CardTitle>
          <CardDescription>
            Upload a CSV file with prospect data. Map columns to prospect fields below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div>
            <Label>Select CSV File</Label>
            <div className="mt-2 flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </>
                )}
              </Button>
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-xs">({csvData.length} rows)</span>
                </div>
              )}
            </div>
          </div>

          {/* Column Mapping */}
          {headers.length > 0 && (
            <>
              <div>
                <Label>Map Columns</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Match CSV columns to prospect fields. Company Name is required.
                </p>
                <div className="space-y-3">
                  {headers.map(header => (
                    <div key={header} className="flex items-center gap-4">
                      <div className="w-48 text-sm font-medium">{header}</div>
                      <Select
                        value={columnMapping[header] || ''}
                        onValueChange={(value) => {
                          setColumnMapping(prev => ({
                            ...prev,
                            [header]: value,
                          }))
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PROSPECT_FIELDS.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {previewRows.length > 0 && (
                <div>
                  <Label>Preview (First 5 Rows)</Label>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            {headers.map(header => (
                              <th key={header} className="px-4 py-2 text-left font-medium">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {headers.map(header => (
                                <td key={header} className="px-4 py-2">
                                  {row[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Duplicate Check */}
              {duplicates.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Potential duplicates found:</strong> {duplicates.join(', ')}
                    <br />
                    These prospects may already exist in your database.
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={checkDuplicates}
                  variant="outline"
                  disabled={isProcessing || !csvData.length}
                >
                  Check for Duplicates
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || !csvData.length || !Object.values(columnMapping).includes('companyName')}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Import {csvData.length} Prospects
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

