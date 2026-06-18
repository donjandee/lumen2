# Lumen — AI Data Analyst

An AI-powered data analysis platform with multi-agent framework, MCP tools, and a premium React UI.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React + Recharts + Tailwind (frontend)                 │
│  ├── Upload CSV / Query bar                             │
│  ├── Overview / Charts / Data Table / Report views      │
│  └── WebSocket for live agent status                    │
└────────────────────┬────────────────────────────────────┘
                     │ REST + WebSocket
┌────────────────────▼────────────────────────────────────┐
│  FastAPI Backend                                         │
│  ├── File upload → DuckDB                               │
│  ├── /analyze endpoint → Orchestrator                   │
│  └── WebSocket /ws/{session_id}                         │
├─────────────────────────────────────────────────────────┤
│  Multi-Agent Framework (MAF)                            │
│  ├── CleanerAgent  → profile_dataset, query_db          │
│  ├── AnalystAgent  → query_db, run_python               │
│  ├── ChartAgent    → generate_chart, query_db           │
│  └── NarratorAgent → query_db                           │
├─────────────────────────────────────────────────────────┤
│  MCP Server (lumen-mcp)                                 │
│  ├── query_db        — SQL over DuckDB                  │
│  ├── run_python      — pandas/numpy sandbox             │
│  ├── generate_chart  — Recharts-ready JSON specs        │
│  └── profile_dataset — schema, nulls, samples           │
├─────────────────────────────────────────────────────────┤
│  DuckDB (in-memory SQL directly over CSV files)         │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- An Anthropic API key

### Backend Setup

```bash
cd backend
pip install -e .
export ANTHROPIC_API_KEY="your-key-here"
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### MCP Server (standalone)

```bash
cd backend
python -m app.mcp_server
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `query_db` | Run SQL against loaded CSVs via DuckDB |
| `run_python` | Execute pandas/numpy snippets in sandbox |
| `generate_chart` | Return Recharts-compatible chart specs |
| `profile_dataset` | Schema, dtypes, null counts, samples |

## Agents

| Agent | Role | Tools Used |
|-------|------|------------|
| **Cleaner** | Data quality: nulls, types, outliers | profile_dataset, query_db, run_python |
| **Analyst** | Statistical patterns and insights | query_db, run_python, profile_dataset |
| **Chart** | Visualization generation | generate_chart, query_db |
| **Narrator** | Written report synthesis | query_db |

## Design System

- **Accent**: Deep purple `#534AB7`
- **Agent dots**: Animated status indicators (idle/running/done/error)
- **AI narrative**: Left-border purple treatment
- **Metric cards**: Borderless surfaces with subtle background contrast
- **Insights**: Semantic colors (green/amber/blue) for scan-by-urgency

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Recharts + Tailwind CSS |
| Backend API | FastAPI (Python) |
| MCP Server | `mcp` Python library |
| Agent Framework | Custom with Anthropic SDK |
| Data Layer | DuckDB (in-memory SQL over CSVs) |
| Real-time | WebSocket for agent status |
