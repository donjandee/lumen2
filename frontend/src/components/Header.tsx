import { useState, useRef } from 'react'
import { Upload, Sparkles, Plus } from 'lucide-react'
import type { DatasetInfo } from '../types'

interface HeaderProps {
  dataset: DatasetInfo | null
  isAnalyzing: boolean
  onFileUpload: (file: File) => void
  onAnalyze: (query: string) => void
}

export function Header({ dataset, isAnalyzing, onFileUpload, onAnalyze }: HeaderProps) {
  const [query, setQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && dataset) {
      onAnalyze(query.trim())
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) {
      onFileUpload(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileUpload(file)
  }

  return (
    <header
      className="bg-white border-b border-gray-200 px-6 py-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
    >
      <div className="flex items-center justify-between">
        {/* Dataset info */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">
            Lumen <span className="font-normal text-gray-500">analyst</span>
          </span>
          {dataset && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
              <Upload size={12} />
              {dataset.file_name} · {dataset.row_count.toLocaleString()} rows
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <span className="flex items-center gap-1.5 text-xs text-lumen-600 font-medium">
              <Sparkles size={14} className="animate-spin" />
              Analyst running
            </span>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus size={14} />
            New dataset
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Query bar */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <div className="flex-1 relative">
          <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dataset ? 'Ask anything — "What drove the most revenue?"' : 'Upload a CSV to get started...'}
            disabled={!dataset}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lumen-200 focus:border-lumen-400 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!dataset || !query.trim() || isAnalyzing}
          className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          Analyze
          <span className="text-xs">↗</span>
        </button>
      </form>
    </header>
  )
}
