import { useState } from 'react'
import { runQuery } from '../api'
import type { DatasetInfo } from '../types'

interface DataTableViewProps {
  dataset: DatasetInfo | null
}

export function DataTableView({ dataset }: DataTableViewProps) {
  const [sql, setSql] = useState('')
  const [results, setResults] = useState<{ columns: string[]; data: Record<string, unknown>[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!dataset) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Upload a dataset to explore data
      </div>
    )
  }

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sql.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await runQuery(sql)
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  const displayData = results || {
    columns: dataset.columns.map(c => c.column_name),
    data: dataset.sample_rows,
  }

  return (
    <div className="space-y-4">
      {/* SQL query bar */}
      <form onSubmit={handleQuery} className="flex gap-2">
        <input
          type="text"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder={`SELECT * FROM ${dataset.table_name} LIMIT 100`}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lumen-200"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-lumen-600 text-white rounded-lg text-sm font-medium hover:bg-lumen-700 disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run'}
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Data table */}
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {displayData.columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-medium text-gray-600">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.data.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  {displayData.columns.map((col) => (
                    <td key={col} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayData.data.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">No data</div>
        )}
      </div>
    </div>
  )
}
