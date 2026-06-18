"""MCP Server — exposes data analysis tools over stdio/HTTP."""

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import json
import pandas as pd
import numpy as np

from app.data_store import data_store

server = Server("lumen-mcp")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="query_db",
            description="Run a SQL query against the loaded dataset. Returns results as JSON.",
            inputSchema={
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SQL query to execute against the DuckDB database",
                    }
                },
                "required": ["sql"],
            },
        ),
        Tool(
            name="run_python",
            description="Execute a pandas/numpy code snippet. The dataset is available as `df`. Returns the result of the last expression.",
            inputSchema={
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Python code to execute. Use `df` for the main dataframe.",
                    },
                    "table_name": {
                        "type": "string",
                        "description": "Table name to load as `df`",
                    },
                },
                "required": ["code", "table_name"],
            },
        ),
        Tool(
            name="generate_chart",
            description="Generate a chart specification (Recharts-compatible JSON) from data.",
            inputSchema={
                "type": "object",
                "properties": {
                    "chart_type": {
                        "type": "string",
                        "enum": ["bar", "line", "pie", "area", "scatter"],
                        "description": "Type of chart to generate",
                    },
                    "title": {
                        "type": "string",
                        "description": "Chart title",
                    },
                    "sql": {
                        "type": "string",
                        "description": "SQL query to fetch chart data",
                    },
                    "x_key": {
                        "type": "string",
                        "description": "Column name for X axis",
                    },
                    "y_keys": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Column name(s) for Y axis values",
                    },
                },
                "required": ["chart_type", "title", "sql", "x_key", "y_keys"],
            },
        ),
        Tool(
            name="profile_dataset",
            description="Get schema, data types, null counts, and sample rows for a table.",
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "Name of the table to profile",
                    }
                },
                "required": ["table_name"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "query_db":
        try:
            result = data_store.query(arguments["sql"])
            return [TextContent(type="text", text=result.to_json(orient="records", date_format="iso"))]
        except Exception as e:
            return [TextContent(type="text", text=f"SQL Error: {str(e)}. Fix your query and try again.")]

    elif name == "run_python":
        table_name = arguments.get("table_name") or (data_store.tables[0] if data_store.tables else None)
        code = arguments["code"]
        if table_name:
            df = data_store.query(f"SELECT * FROM {table_name}")
        else:
            df = pd.DataFrame()
        local_vars = {"df": df, "pd": pd, "np": np}
        exec(code, {"__builtins__": {}}, local_vars)
        result = local_vars.get("result", "No `result` variable set")
        if isinstance(result, pd.DataFrame):
            return [TextContent(type="text", text=result.to_json(orient="records"))]
        return [TextContent(type="text", text=json.dumps(result, default=str))]

    elif name == "generate_chart":
        df = data_store.query(arguments["sql"])
        chart_spec = {
            "type": arguments["chart_type"],
            "title": arguments["title"],
            "data": df.to_dict(orient="records"),
            "xKey": arguments["x_key"],
            "yKeys": arguments["y_keys"],
            "colors": ["#534AB7", "#7C6DD8", "#A594F9", "#C4B5FD"],
        }
        return [TextContent(type="text", text=json.dumps(chart_spec, default=str))]

    elif name == "profile_dataset":
        profile = data_store.profile(arguments["table_name"])
        return [TextContent(type="text", text=json.dumps(profile, default=str))]

    return [TextContent(type="text", text=f"Unknown tool: {name}")]


async def run_mcp_stdio():
    """Run the MCP server over stdio."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_mcp_stdio())
