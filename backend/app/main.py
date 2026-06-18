"""FastAPI application — REST + WebSocket API for Lumen."""

import json
import uuid
import asyncio
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.data_store import data_store
from app.agents import Orchestrator, AgentStatus

settings.ensure_dirs()

app = FastAPI(title="Lumen API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active WebSocket connections
connections: dict[str, WebSocket] = {}


@app.get("/health")
async def health():
    return {"status": "ok", "tables": data_store.tables}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV file and load it into DuckDB."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")

    file_path = settings.upload_dir / file.filename
    content = await file.read()

    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.max_file_size_mb}MB limit")

    file_path.write_bytes(content)
    table_name = data_store.load_csv(file_path)
    profile = data_store.profile(table_name)

    return JSONResponse({
        "table_name": table_name,
        "file_name": file.filename,
        "row_count": profile["row_count"],
        "columns": profile["columns"],
        "null_counts": profile["null_counts"],
        "sample_rows": profile["sample_rows"],
    })


@app.get("/tables")
async def list_tables():
    """List all loaded tables."""
    return {"tables": data_store.tables}


@app.get("/tables/{table_name}/profile")
async def get_profile(table_name: str):
    """Get profile info for a specific table."""
    if table_name not in data_store.tables:
        raise HTTPException(404, f"Table '{table_name}' not found")
    return data_store.profile(table_name)


@app.post("/query")
async def run_query(body: dict):
    """Run a SQL query."""
    sql = body.get("sql", "").strip()
    if not sql:
        raise HTTPException(400, "Missing 'sql' field")

    # Handle common natural language shortcuts
    sql_lower = sql.lower()
    if sql_lower in ("select all", "select all records", "show all", "all"):
        if data_store.tables:
            sql = f"SELECT * FROM {data_store.tables[0]} LIMIT 100"
        else:
            raise HTTPException(400, "No tables loaded. Upload a CSV first.")

    try:
        result = data_store.query(sql)
        return {
            "columns": list(result.columns),
            "data": result.to_dict(orient="records"),
            "row_count": len(result),
        }
    except Exception as e:
        raise HTTPException(400, f"Query error: {str(e)}")


@app.post("/analyze")
async def analyze(body: dict):
    """Run the full multi-agent analysis pipeline with SSE streaming."""
    from starlette.responses import StreamingResponse

    table_name = body.get("table_name")
    query = body.get("query", "Give me a comprehensive analysis of this dataset")

    if not table_name or table_name not in data_store.tables:
        raise HTTPException(400, f"Table '{table_name}' not found. Upload a CSV first.")

    async def event_stream():
        import asyncio

        async def status_callback(status: AgentStatus):
            event = json.dumps({
                "type": "agent_status",
                "agent": status.role.value,
                "status": status.status,
                "message": status.message,
            })
            yield f"data: {event}\n\n"

        # We need a different approach since generators can't be passed as callbacks
        # Use an asyncio.Queue to bridge
        queue: asyncio.Queue = asyncio.Queue()

        async def queue_callback(status: AgentStatus):
            await queue.put({
                "type": "agent_status",
                "agent": status.role.value,
                "status": status.status,
                "message": status.message,
            })

        orchestrator = Orchestrator(on_status=queue_callback)

        # Run analysis in background task
        result_holder: dict = {}
        error_holder: list = []

        async def run():
            try:
                result_holder["data"] = await orchestrator.run_analysis(table_name, query)
            except Exception as e:
                error_holder.append(str(e))
            finally:
                await queue.put(None)  # Signal done

        task = asyncio.create_task(run())

        # Yield status events as they arrive
        while True:
            item = await queue.get()
            if item is None:
                break
            event = json.dumps(item)
            yield f"data: {event}\n\n"

        await task

        # Final result
        if error_holder:
            final = json.dumps({"type": "error", "message": error_holder[0]})
        else:
            final = json.dumps({"type": "result", "results": result_holder.get("data", {})})
        yield f"data: {final}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket for real-time agent status updates."""
    await websocket.accept()
    connections[session_id] = websocket

    try:
        while True:
            # Keep connection alive, listen for client messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        connections.pop(session_id, None)
