import { useState, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { OverviewView } from './components/OverviewView'
import { ChartsView } from './components/ChartsView'
import { DataTableView } from './components/DataTableView'
import { ReportView } from './components/ReportView'
import { uploadFile, runAnalysisStream } from './api'
import type { DatasetInfo, ViewTab, AnalysisResult } from './types'

type AgentState = Record<string, { status: string; message: string }>

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('overview')
  const [dataset, setDataset] = useState<DatasetInfo | null>(null)
  const [agentStates, setAgentStates] = useState<AgentState>({
    cleaner: { status: 'idle', message: '' },
    profiler: { status: 'idle', message: '' },
    analyst: { status: 'idle', message: '' },
    chart: { status: 'idle', message: '' },
    narrator: { status: 'idle', message: '' },
  })
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setError(null)
      const result = await uploadFile(file)
      setDataset(result)
      setAnalysisResult(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    }
  }, [])

  const handleAnalyze = useCallback(async (query: string) => {
    if (!dataset) return
    setIsAnalyzing(true)
    setError(null)
    setAnalysisResult(null)

    // Reset all agents to idle
    setAgentStates({
      cleaner: { status: 'idle', message: '' },
      profiler: { status: 'idle', message: '' },
      analyst: { status: 'idle', message: '' },
      chart: { status: 'idle', message: '' },
      narrator: { status: 'idle', message: '' },
    })

    try {
      const result = await runAnalysisStream(
        dataset.table_name,
        query,
        (agent, status) => {
          setAgentStates((prev) => ({
            ...prev,
            [agent]: { status, message: '' },
          }))
        },
      )
      setAnalysisResult(result as AnalysisResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }, [dataset])

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        agentStates={agentStates}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          dataset={dataset}
          isAnalyzing={isAnalyzing}
          onFileUpload={handleFileUpload}
          onAnalyze={handleAnalyze}
        />
        <main className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {activeTab === 'overview' && (
            <OverviewView dataset={dataset} result={analysisResult} />
          )}
          {activeTab === 'charts' && (
            <ChartsView result={analysisResult} />
          )}
          {activeTab === 'data' && (
            <DataTableView dataset={dataset} />
          )}
          {activeTab === 'report' && (
            <ReportView result={analysisResult} />
          )}
        </main>
      </div>
    </div>
  )
}
