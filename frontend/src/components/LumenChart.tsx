import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { ChartSpec } from '../types'

interface LumenChartProps {
  spec: ChartSpec
  height?: number
}

export function LumenChart({ spec, height = 300 }: LumenChartProps) {
  const colors = spec.colors || ['#534AB7', '#7C6DD8', '#A594F9', '#C4B5FD']

  switch (spec.type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={spec.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {spec.yKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )

    case 'line':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={spec.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {spec.yKeys.map((key, i) => (
              <Line key={key} dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )

    case 'area':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={spec.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {spec.yKeys.map((key, i) => (
              <Area key={key} dataKey={key} fill={colors[i % colors.length]} stroke={colors[i % colors.length]} fillOpacity={0.3} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={spec.data}
              dataKey={spec.yKeys[0]}
              nameKey={spec.xKey}
              cx="50%"
              cy="50%"
              outerRadius={height / 3}
              label
            >
              {spec.data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )

    case 'scatter':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 12 }} />
            <YAxis dataKey={spec.yKeys[0]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Scatter data={spec.data} fill={colors[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      )

    default:
      return <div className="text-gray-400 text-sm">Unsupported chart type: {spec.type}</div>
  }
}
