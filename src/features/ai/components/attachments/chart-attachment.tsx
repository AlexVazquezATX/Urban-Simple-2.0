'use client'

import { Card } from '@/components/ui/card'
import type { ChartAttachment } from '../../types/ai-types'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartAttachmentProps {
  attachment: ChartAttachment
}

export function ChartAttachmentComponent({ attachment }: ChartAttachmentProps) {
  const { title, chartType, labels, datasets } = attachment.data

  // Transform data for recharts format
  const chartData = labels.map((label, index) => {
    const dataPoint: any = { name: label }
    datasets.forEach((dataset) => {
      dataPoint[dataset.label] = dataset.data[index]
    })
    return dataPoint
  })

  return (
    <Card className="p-4 mt-2">
      <h4 className="text-sm font-semibold mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        {chartType === 'line' ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {datasets.map((dataset, idx) => (
              <Line
                key={idx}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.color || '#8884d8'}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {datasets.map((dataset, idx) => (
              <Bar
                key={idx}
                dataKey={dataset.label}
                fill={dataset.color || '#8884d8'}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  )
}
