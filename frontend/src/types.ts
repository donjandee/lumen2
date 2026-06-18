export interface DatasetInfo {
  table_name: string
  file_name: string
  row_count: number
  columns: Array<{ column_name: string; column_type: string }>
  null_counts: Record<string, number>
  sample_rows: Record<string, unknown>[]
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter'
  title: string
  data: Record<string, unknown>[]
  xKey: string
  yKeys: string[]
  colors: string[]
}

export interface AgentStatusUpdate {
  type: 'agent_status'
  agent: 'cleaner' | 'analyst' | 'chart' | 'narrator'
  status: 'idle' | 'running' | 'done' | 'error'
  message: string
}

export interface AnalysisResult {
  cleaning: unknown
  analysis: unknown
  charts: ChartSpec[] | unknown
  narrative: {
    headline: string
    insights: string[]
    recommendations: string[]
  } | unknown
}

export interface Insight {
  type: 'success' | 'warning' | 'info'
  text: string
}

export type ViewTab = 'overview' | 'charts' | 'data' | 'report'
