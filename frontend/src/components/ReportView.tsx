import type { AnalysisResult } from '../types'

interface ReportViewProps {
  result: AnalysisResult | null
}

export function ReportView({ result }: ReportViewProps) {
  if (!result?.narrative) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Run an analysis to generate a report
      </div>
    )
  }

  const narrative = result.narrative as {
    headline?: string
    insights?: string[]
    recommendations?: string[]
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Headline */}
      {narrative.headline && (
        <div className="ai-narrative">
          <h2 className="text-xl font-bold text-gray-900">{narrative.headline}</h2>
        </div>
      )}

      {/* Key Insights */}
      {narrative.insights && narrative.insights.length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-900 mb-3">Key Insights</h3>
          <div className="space-y-2">
            {narrative.insights.map((insight, i) => (
              <div key={i} className="ai-narrative">
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {narrative.recommendations && narrative.recommendations.length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-900 mb-3">Recommendations & Next Questions</h3>
          <ul className="space-y-2">
            {narrative.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-lumen-600 font-bold">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Raw cleaning output */}
      {result.cleaning && (
        <section>
          <h3 className="font-semibold text-gray-900 mb-3">Data Cleaning Summary</h3>
          <pre className="p-4 bg-gray-50 rounded-lg text-xs text-gray-600 overflow-auto max-h-64">
            {typeof result.cleaning === 'string' ? result.cleaning : JSON.stringify(result.cleaning, null, 2)}
          </pre>
        </section>
      )}
    </div>
  )
}
