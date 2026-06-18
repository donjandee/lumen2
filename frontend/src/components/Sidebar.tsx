import { BarChart3, Table2, FileText, LayoutDashboard, Settings } from 'lucide-react'
import type { ViewTab } from '../types'

interface SidebarProps {
  activeTab: ViewTab
  onTabChange: (tab: ViewTab) => void
  agentStates: Record<string, { status: string; message: string }>
}

const tabs: Array<{ id: ViewTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'data', label: 'Data table', icon: Table2 },
  { id: 'report', label: 'Report', icon: FileText },
]

const agents = [
  { id: 'cleaner', label: 'Cleaner' },
  { id: 'profiler', label: 'Profiler' },
  { id: 'analyst', label: 'Analyst' },
  { id: 'chart', label: 'Chart' },
  { id: 'narrator', label: 'Narrator' },
]

export function Sidebar({ activeTab, onTabChange, agentStates }: SidebarProps) {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">
          <span className="text-lumen-600">Lumen</span>
        </h1>
      </div>

      {/* Workspace nav */}
      <nav className="px-3 py-4">
        <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Workspace
        </p>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-lumen-50 text-lumen-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </nav>

      {/* Agent status */}
      <div className="px-3 py-4 border-t border-gray-100">
        <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Agents
        </p>
        {agents.map((agent) => {
          const state = agentStates[agent.id]
          const status = state?.status || 'idle'
          const dotColor =
            status === 'running' ? 'bg-lumen-600 animate-pulse' :
            status === 'done' ? 'bg-green-500' :
            status === 'error' ? 'bg-red-500' :
            'bg-gray-300'
          return (
            <div key={agent.id} className="flex items-center gap-2.5 px-3 py-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
              <span className="text-sm text-gray-700">{agent.label}</span>
            </div>
          )
        })}
      </div>

      {/* Settings at bottom */}
      <div className="mt-auto p-3 border-t border-gray-100">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Settings size={16} />
          Settings
        </button>
      </div>
    </aside>
  )
}
