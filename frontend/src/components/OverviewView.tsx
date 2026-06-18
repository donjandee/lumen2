import { TrendingUp, AlertTriangle, Info } from 'lucide-react'
import type { DatasetInfo, AnalysisResult, Insight } from '../types'
import { LumenChart } from './LumenChart'

interface OverviewViewProps {
  dataset: DatasetInfo | null
  result: AnalysisResult | null
}

export function OverviewView({ dataset, result }: OverviewViewProps) {
  if (!dataset) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lumen-50 flex items-center justify-center">
            <TrendingUp size={28} className="text-lumen-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload a dataset</h2>
          <p className="text-sm text-gray-500">Drag a CSV file here or click "New dataset" to begin</p>
        </div>
      </div>
    )
  }

  // Derive metrics from dataset
  const totalNulls = Object.values(dataset.null_counts).reduce((a, b) => a + b, 0)
  const nullPct = ((totalNulls / (dataset.row_count * dataset.columns.length)) * 100).toFixed(1)

  // Extract insights from result
  const insights: Insight[] = []
  if (result?.narrative && typeof result.narrative === 'object' && 'insights' in result.narrative) {
    const narr = result.narrative as { insights: string[] }
    narr.insights?.forEach((text, i) => {
      const type = i === 0 ? 'success' : i === 1 ? 'warning' : 'info'
      insights.push({ type, text })
    })
  }

  // Get first chart if available
  const charts = Array.isArray(result?.charts) ? result.charts : []
  const firstChart = charts[0] || null

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total rows"
          value={dataset.row_count.toLocaleString()}
          subtext={`${dataset.columns.length} columns`}
        />
        <MetricCard
          label="Columns"
          value={dataset.columns.length.toString()}
          subtext="detected types"
        />
        <MetricCard
          label="Null fields cleaned"
          value={totalNulls.toString()}
          subtext={`${nullPct}% of cells`}
          warn={totalNulls > 0}
        />
        <MetricCard
          label="Top column"
          value={dataset.columns[0]?.column_name || '—'}
          subtext={dataset.columns[0]?.column_type || ''}
        />
      </div>

      {/* Chart + Insights row */}
      <div className="grid grid-cols-5 gap-6">
        {/* Chart area */}
        <div className="col-span-3 bg-white rounded-xl p-6">
          {firstChart ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{firstChart.title}</h3>
                <a href="#" className="text-xs text-gray-500 hover:text-lumen-600">
                  Build this ↗
                </a>
              </div>
              <LumenChart spec={firstChart} height={240} />
            </>
          ) : (
            <div className="flex items-center justify-center h-60 text-gray-400 text-sm">
              Charts will appear here after analysis
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="col-span-2 bg-white rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">AI insights</h3>
            <a href="#" className="text-xs text-gray-500 hover:text-lumen-600">
              How this works ↗
            </a>
          </div>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Run an analysis to see AI-generated insights
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, subtext, warn }: {
  label: string; value: string; subtext: string; warn?: boolean
}) {
  return (
    <div className="metric-card">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <span className={`text-xs ${warn ? 'text-amber-600' : 'text-gray-400'}`}>
        {warn && '⚠ '}{subtext}
      </span>
    </div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  const icons = {
    success: <TrendingUp size={16} className="text-green-600 shrink-0" />,
    warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
    info: <Info size={16} className="text-blue-500 shrink-0" />,
  }

  const bgColors = {
    success: 'bg-green-50',
    warning: 'bg-amber-50',
    info: 'bg-blue-50',
  }

  return (
    <div className={`insight-card ${bgColors[insight.type]} flex gap-3`}>
      {icons[insight.type]}
      <p className="text-sm text-gray-700">{insight.text}</p>
    </div>
  )
}
