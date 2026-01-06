'use client'

import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { TableAttachment } from '../../types/ai-types'

interface TableAttachmentProps {
  attachment: TableAttachment
}

export function TableAttachmentComponent({ attachment }: TableAttachmentProps) {
  const { title, headers, rows } = attachment.data

  return (
    <Card className="p-4 mt-2">
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header, idx) => (
                <TableHead key={idx} className="text-xs">
                  {header}
                </TableHead>
              ))}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={headers.length + 1}
                  className="text-center text-muted-foreground text-sm"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIdx) => (
                <TableRow key={rowIdx}>
                  {row.cells.map((cell, cellIdx) => (
                    <TableCell key={cellIdx} className="text-xs">
                      {cell}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    {row.link && (
                      <Link
                        href={row.link}
                        className="inline-flex items-center text-primary hover:underline"
                        target="_blank"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
