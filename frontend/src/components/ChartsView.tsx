import { LumenChart } from './LumenChart'
import type { AnalysisResult, ChartSpec } from '../types'

interface ChartsViewProps {
  result: AnalysisResult | null
}

export function ChartsView({ result }: ChartsViewProps) {
  const charts: ChartSpec[] = Array.isArray(result?.charts) ? result.charts : []

  if (charts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Run an analysis to generate charts
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {charts.map((chart, i) => (
        <div key={i} className="bg-white rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{chart.title}</h3>
          <LumenChart spec={chart} height={280} />
        </div>
      ))}
    </div>
  )
}
