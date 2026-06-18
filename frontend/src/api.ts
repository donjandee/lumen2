const API_BASE = '/api'

export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listTables() {
  const res = await fetch(`${API_BASE}/tables`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getProfile(tableName: string) {
  const res = await fetch(`${API_BASE}/tables/${tableName}/profile`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function runQuery(sql: string) {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function runAnalysisStream(
  tableName: string,
  query: string,
  onStatus: (agent: string, status: string) => void,
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table_name: tableName, query }),
  })
  if (!res.ok) throw new Error(await res.text())

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: unknown = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'agent_status') {
            onStatus(data.agent, data.status)
          } else if (data.type === 'result') {
            finalResult = data.results
          } else if (data.type === 'error') {
            throw new Error(data.message)
          }
        } catch (e) {
          if (e instanceof Error && e.message !== data) throw e
        }
      }
    }
  }

  return finalResult
}

export function connectWebSocket(sessionId: string, onMessage: (data: unknown) => void): Promise<WebSocket> {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/${sessionId}`)

  return new Promise((resolve) => {
    ws.onopen = () => {
      // Send periodic pings to keep alive
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        } else {
          clearInterval(interval)
        }
      }, 25000)
      resolve(ws)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch {
        // ignore non-JSON messages
      }
    }
  })
}
